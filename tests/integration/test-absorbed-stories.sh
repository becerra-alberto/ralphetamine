#!/usr/bin/env bash
# Integration test: absorbed story tracking (M4)
#
# Verifies that when one story's implementation covers another story,
# the absorbed story is tracked in state.json and skipped.
#
# Setup: 3 stories (1.1, 1.2, 1.3). Claude for 1.1 also emits that it
# absorbed 1.2. After 1.1 completes, 1.2 should be marked absorbed and skipped.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Absorbed Story Tracking ==="
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

# Create fake claude that:
#   - For story 1.1: emits DONE 1.1 (implementation covers 1.2's work too)
#   - For story 1.3: emits DONE 1.3
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
CALL_DIR="$WORK_DIR/.call-counts"
mkdir -p "$CALL_DIR"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
CALL_DIR="${CALL_DIR:-/tmp}"

# Track which stories were invoked
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

echo "$STORY_ID" >> "$CALL_DIR/invoked-stories"
echo "<ralph>DONE ${STORY_ID}</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# Pre-mark 1.2 as absorbed by 1.1 (simulating that 1.1's implementation covered 1.2)
# In real usage, this happens via parallel detection or manual marking.
# We'll use state_mark_absorbed after running 1.1 to simulate the flow.
# Actually, we test the state function directly then run ralph.

# First, manually mark 1.1 as done and 1.2 as absorbed by 1.1
# This simulates what happens when the runner detects absorption
cd "$WORK_DIR"

# Source state module to use state functions
source "$RALPH_DIR/lib/ui.sh"
source "$RALPH_DIR/lib/state.sh"
state_init

# Mark 1.1 done and 1.2 absorbed
state_mark_done "1.1"
state_mark_absorbed "1.2" "1.1"

# Now run ralph — it should skip 1.2 (absorbed) and go straight to 1.3
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

# 2. Story 1.2 is in absorbed_stories with absorber=1.1
ABSORBER=$(jq -r '.absorbed_stories["1.2"] // "none"' .ralph/state.json 2>/dev/null)
if [[ "$ABSORBER" == "1.1" ]]; then
    echo "  PASS: story 1.2 absorbed by 1.1 in state.json"
else
    echo "  FAIL: absorbed_stories[1.2] = '$ABSORBER' (expected '1.1')"
    FAILURES=$((FAILURES + 1))
fi

# 3. Story 1.2 is in completed_stories (absorbed counts as completed)
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^1.2$"; then
    echo "  PASS: story 1.2 in completed_stories (absorbed = completed)"
else
    echo "  FAIL: story 1.2 NOT in completed_stories"
    FAILURES=$((FAILURES + 1))
fi

# 4. Story 1.3 was completed (claude was called for it)
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^1.3$"; then
    echo "  PASS: story 1.3 in completed_stories"
else
    echo "  FAIL: story 1.3 NOT in completed_stories"
    FAILURES=$((FAILURES + 1))
fi

# 5. Claude was NOT invoked for story 1.2 (it was skipped)
if [[ -f "$CALL_DIR/invoked-stories" ]]; then
    if grep -q "^1.2$" "$CALL_DIR/invoked-stories" 2>/dev/null; then
        echo "  FAIL: claude was invoked for absorbed story 1.2 (should have been skipped)"
        FAILURES=$((FAILURES + 1))
    else
        echo "  PASS: claude was NOT invoked for absorbed story 1.2"
    fi
else
    echo "  FAIL: no invocation log found"
    FAILURES=$((FAILURES + 1))
fi

# 6. Claude WAS invoked for story 1.3
if [[ -f "$CALL_DIR/invoked-stories" ]] && grep -q "^1.3$" "$CALL_DIR/invoked-stories" 2>/dev/null; then
    echo "  PASS: claude was invoked for story 1.3"
else
    echo "  FAIL: claude was NOT invoked for story 1.3"
    FAILURES=$((FAILURES + 1))
fi

# 7. All stories complete message
if grep -qi "ALL STORIES COMPLETE" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout shows all stories complete"
else
    echo "  FAIL: stdout missing 'ALL STORIES COMPLETE'"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (7 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  state.json:"
    jq . .ralph/state.json 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  invoked stories:"
    cat "$CALL_DIR/invoked-stories" 2>/dev/null | sed 's/^/    /' || echo "    (none)"
    echo ""
    echo "  ralph stdout (last 20 lines):"
    tail -20 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
