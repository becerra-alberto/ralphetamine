#!/usr/bin/env bash
# Integration test: sequential happy path (multi-story, fail→retry→done)
#
# Runs the REAL ralph binary against a sandbox project with a fake claude
# that routes by story ID: 1.1 → DONE, 1.2 → FAIL (1st), DONE (2nd), 1.3 → DONE.
#
# Expected: all stories complete, retry_count reset, progress.txt has correct entries.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Sequential Happy Path ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Fresh state
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Init git
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# Create fake claude: routes by story ID, 1.2 fails first attempt
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
CALL_DIR="$WORK_DIR/.call-counts"
mkdir -p "$CALL_DIR"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
CALL_DIR="${CALL_DIR:-/tmp}"
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

# Track calls per story
CALL_FILE="$CALL_DIR/story-${STORY_ID}"
COUNT=0
[ -f "$CALL_FILE" ] && COUNT=$(cat "$CALL_FILE")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$CALL_FILE"

# 1.2: fail first, succeed second
if [[ "$STORY_ID" == "1.2" && "$COUNT" -eq 1 ]]; then
    echo "<ralph>FAIL 1.2: npm test failed on first attempt</ralph>"
else
    echo "<ralph>DONE ${STORY_ID}</ralph>"
fi
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# Run ralph
echo "  Running: ralph run --no-tmux --no-interactive --no-dashboard"
cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
CALL_DIR="$CALL_DIR" PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

FAILURES=0

# 1. Exit code 0
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "  PASS: exit code 0"
else
    echo "  FAIL: exit code $EXIT_CODE (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

# 2. state.json: completed_stories contains 1.1, 1.2, 1.3
for s in 1.1 1.2 1.3; do
    if jq -r '.completed_stories[]' "$WORK_DIR/.ralph/state.json" 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: story $s in completed_stories"
    else
        echo "  FAIL: story $s NOT in completed_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 3. retry_count = 0 (reset after last success)
RETRY_COUNT=$(jq '.retry_count // 0' "$WORK_DIR/.ralph/state.json" 2>/dev/null || echo "?")
if [[ "$RETRY_COUNT" == "0" ]]; then
    echo "  PASS: retry_count = 0 (reset after success)"
else
    echo "  FAIL: retry_count = $RETRY_COUNT (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

# 4. current_story = null
CURRENT=$(jq -r '.current_story // "null"' "$WORK_DIR/.ralph/state.json" 2>/dev/null)
if [[ "$CURRENT" == "null" ]]; then
    echo "  PASS: current_story = null"
else
    echo "  FAIL: current_story = $CURRENT (expected null)"
    FAILURES=$((FAILURES + 1))
fi

# 5. progress.txt: [DONE] entries for 1.1, 1.2, 1.3
for s in 1.1 1.2 1.3; do
    if grep -q "\[DONE\] Story $s" "$WORK_DIR/progress.txt" 2>/dev/null; then
        echo "  PASS: progress.txt has [DONE] for $s"
    else
        echo "  FAIL: progress.txt missing [DONE] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 6. progress.txt: [FAIL] entry for 1.2 (first attempt)
if grep -q "\[FAIL\] Story 1.2" "$WORK_DIR/progress.txt" 2>/dev/null; then
    echo "  PASS: progress.txt has [FAIL] for 1.2"
else
    echo "  FAIL: progress.txt missing [FAIL] for 1.2"
    FAILURES=$((FAILURES + 1))
fi

# 7. stdout: "ALL STORIES COMPLETE"
if grep -q "ALL STORIES COMPLETE" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout contains 'ALL STORIES COMPLETE'"
else
    echo "  FAIL: stdout missing 'ALL STORIES COMPLETE'"
    FAILURES=$((FAILURES + 1))
fi

# 8. stdout: "RUN SUMMARY"
if grep -q "RUN SUMMARY" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout contains 'RUN SUMMARY'"
else
    echo "  FAIL: stdout missing 'RUN SUMMARY'"
    FAILURES=$((FAILURES + 1))
fi

# 9. No lock file remains
if [[ ! -f "$WORK_DIR/.ralph/.lock" ]]; then
    echo "  PASS: no .ralph/.lock file remains"
else
    echo "  FAIL: .ralph/.lock still exists"
    FAILURES=$((FAILURES + 1))
fi

# 10. Spec frontmatter for 1.1 updated to done
if grep -q "status: done" "$WORK_DIR/specs/epic-1/story-1.1-create-greeter.md" 2>/dev/null; then
    echo "  PASS: spec 1.1 status updated to done"
else
    echo "  FAIL: spec 1.1 status not updated"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (10 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  progress.txt:"
    cat "$WORK_DIR/progress.txt" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  state.json:"
    jq . "$WORK_DIR/.ralph/state.json" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 30 lines):"
    tail -30 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
