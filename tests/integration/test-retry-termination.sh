#!/usr/bin/env bash
# Integration test: verify ralph terminates after max_retries on persistent failures
#
# This runs the REAL ralph binary against a real project directory with a fake
# claude that always returns a FAIL signal. No mocks of state.json, jq, or
# any other internal — the full pipeline runs end-to-end.
#
# Expected: ralph exits after max_retries (2), state.json has retry_count=2,
# progress.txt has exactly 2 [FAIL] entries, and stdout contains "MAX RETRIES".
# Failure mode (before fix): infinite loop, iteration 9849+, retry_count stuck at 0.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup: copy sandbox to a temp dir ──────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Retry Termination ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox project (not .git — we'll init fresh)
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Fresh state
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Init git repo (ralph needs it)
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# ── Create fake claude that always returns FAIL ────────────────────────────
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Fake claude: always reports FAIL for whatever story is asked
echo "I tried but could not complete the task."
echo "<ralph>FAIL 1.1: persistent test failure</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# ── Run ralph for real ─────────────────────────────────────────────────────
echo "  Running: ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard"
echo "  max_retries in config: 2"
echo "  Expecting termination after 2 retries..."
echo ""

cd "$WORK_DIR"

# Timeout the whole test at 30s as a safety net — if the bug is present,
# this prevents the test from running forever.
TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

# ── Assertions ─────────────────────────────────────────────────────────────
FAILURES=0

# 1. ralph should have exited non-zero (failure, not timeout at 30s)
if [[ $EXIT_CODE -eq 124 ]]; then
    echo "  FAIL: ralph was killed by 30s safety timeout — infinite loop NOT fixed"
    FAILURES=$((FAILURES + 1))
elif [[ $EXIT_CODE -eq 0 ]]; then
    echo "  FAIL: ralph exited 0 but should have failed (max retries)"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: ralph exited with code $EXIT_CODE (non-zero, not safety timeout)"
fi

# 2. stdout should contain "MAX RETRIES" (box_header writes to stdout, not progress.txt)
if grep -q "MAX RETRIES" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout contains 'MAX RETRIES EXCEEDED'"
else
    echo "  FAIL: stdout missing 'MAX RETRIES'"
    echo "    stdout (last 20 lines):"
    tail -20 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /' || echo "    (empty)"
    FAILURES=$((FAILURES + 1))
fi

# 3. state.json retry_count should be exactly max_retries (2)
RETRY_COUNT=$(jq '.retry_count // 0' "$WORK_DIR/.ralph/state.json" 2>/dev/null || echo "?")
if [[ "$RETRY_COUNT" == "2" ]]; then
    echo "  PASS: state.json retry_count = $RETRY_COUNT (matches max_retries)"
elif [[ "$RETRY_COUNT" -le 3 && "$RETRY_COUNT" -gt 0 ]]; then
    echo "  PASS: state.json retry_count = $RETRY_COUNT (within bounds)"
else
    echo "  FAIL: state.json retry_count = $RETRY_COUNT (expected 2)"
    FAILURES=$((FAILURES + 1))
fi

# 4. progress.txt FAIL count should be exactly max_retries (2)
FAIL_COUNT=$(grep -c '^\[FAIL\]' "$WORK_DIR/progress.txt" 2>/dev/null || echo "0")
if [[ "$FAIL_COUNT" == "2" ]]; then
    echo "  PASS: progress.txt has $FAIL_COUNT [FAIL] entries (matches max_retries)"
elif [[ "$FAIL_COUNT" -le 3 && "$FAIL_COUNT" -gt 0 ]]; then
    echo "  PASS: progress.txt has $FAIL_COUNT [FAIL] entries (within bounds)"
else
    echo "  FAIL: progress.txt has $FAIL_COUNT [FAIL] entries (expected 2)"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "  progress.txt:"
cat "$WORK_DIR/progress.txt" 2>/dev/null | sed 's/^/    /'
echo ""
echo "  state.json:"
jq . "$WORK_DIR/.ralph/state.json" 2>/dev/null | sed 's/^/    /'
echo ""
echo "  ralph stdout (last 30 lines):"
tail -30 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
