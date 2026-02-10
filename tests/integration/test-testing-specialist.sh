#!/usr/bin/env bash
# Integration test: testing specialist phase (M2)
#
# Verifies the full testing specialist path:
#   1. Config enables testing_phase
#   2. Story DONE triggers test review
#   3. Test review prompt sent to claude (second invocation)
#   4. TEST_REVIEW_DONE signal parsed and logged
#
# Uses a mock claude that:
#   - First call: emits DONE for the story
#   - Second call: emits TEST_REVIEW_DONE with result

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Testing Specialist Phase ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Enable testing_phase in config
jq '.testing_phase.enabled = true | .testing_phase.timeout_seconds = 30' \
    "$WORK_DIR/.ralph/config.json" > "$WORK_DIR/.ralph/config.json.tmp" \
    && mv "$WORK_DIR/.ralph/config.json.tmp" "$WORK_DIR/.ralph/config.json"

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

# Create fake claude that tracks invocations
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
CALL_DIR="$WORK_DIR/.call-counts"
mkdir -p "$CALL_DIR"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
CALL_DIR="${CALL_DIR:-/tmp}"

# Track total calls
TOTAL_FILE="$CALL_DIR/total-calls"
TOTAL=0
[ -f "$TOTAL_FILE" ] && TOTAL=$(cat "$TOTAL_FILE")
TOTAL=$((TOTAL + 1))
echo "$TOTAL" > "$TOTAL_FILE"

# Detect if this is a test review prompt (second invocation)
PROMPT="$*"
if echo "$PROMPT" | grep -qi "test.*review\|review.*test\|testing specialist\|test-review"; then
    # This is the testing specialist invocation
    echo "Running test review..."
    echo "<ralph>TEST_REVIEW_DONE 1.1: all 3 tests pass</ralph>"
    exit 0
fi

# Extract story ID from prompt
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

echo "<ralph>DONE ${STORY_ID}</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# Run ralph for story 1.1 only
cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
CALL_DIR="$CALL_DIR" PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    -s 1.1 --no-tmux --no-interactive --no-dashboard \
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

# 2. Story 1.1 completed
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^1.1$"; then
    echo "  PASS: story 1.1 in completed_stories"
else
    echo "  FAIL: story 1.1 NOT in completed_stories"
    FAILURES=$((FAILURES + 1))
fi

# 3. Claude was invoked twice (implementation + test review)
TOTAL_CALLS=$(cat "$CALL_DIR/total-calls" 2>/dev/null || echo "0")
if [[ "$TOTAL_CALLS" -eq 2 ]]; then
    echo "  PASS: claude invoked exactly 2 times (implementation + test review)"
else
    echo "  FAIL: claude invoked $TOTAL_CALLS times (expected 2)"
    FAILURES=$((FAILURES + 1))
fi

# 4. progress.txt has TEST_REVIEW entry
if grep -q "\[TEST_REVIEW\]" "$WORK_DIR/progress.txt" 2>/dev/null; then
    echo "  PASS: progress.txt has [TEST_REVIEW] entry"
else
    echo "  FAIL: progress.txt missing [TEST_REVIEW] entry"
    FAILURES=$((FAILURES + 1))
fi

# 5. TEST_REVIEW entry references story 1.1
if grep -q "\[TEST_REVIEW\] Story 1.1" "$WORK_DIR/progress.txt" 2>/dev/null; then
    echo "  PASS: TEST_REVIEW entry references story 1.1"
else
    echo "  FAIL: TEST_REVIEW entry missing story 1.1 reference"
    FAILURES=$((FAILURES + 1))
fi

# 6. TEST_REVIEW entry includes result text
if grep -q "all 3 tests pass" "$WORK_DIR/progress.txt" 2>/dev/null; then
    echo "  PASS: TEST_REVIEW entry includes review result"
else
    echo "  FAIL: TEST_REVIEW entry missing result text"
    FAILURES=$((FAILURES + 1))
fi

# 7. stdout mentions testing specialist
if grep -qi "testing specialist\|test.*review" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout mentions testing specialist activity"
else
    echo "  FAIL: stdout missing testing specialist output"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (7 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  progress.txt:"
    cat "$WORK_DIR/progress.txt" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 30 lines):"
    tail -30 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
