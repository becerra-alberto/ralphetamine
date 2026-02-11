#!/usr/bin/env bash
# Integration test: verify timeout postmortem capture
#
# Uses a fake claude that sleeps (triggering Phase 1 timeout at 3s),
# then responds to the postmortem prompt with LEARN tags.
#
# Expected: postmortem file exists, progress.txt has TIMEOUT_POSTMORTEM entry,
# story still fails, learnings extracted.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup: copy sandbox to a temp dir ──────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Timeout Postmortem ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox project
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

# Enable postmortem with a 5-second window
# Set max_retries to 1 so it stops after 1 failure
# Disable decomposition so the test doesn't try to decompose after max retries
# NOTE: must use string "false" not boolean false — config_get jq bug with // empty
jq '.postmortem = {"enabled": true, "window_seconds": 5, "max_output_chars": 50000} | .loop.max_retries = 1 | .decomposition.enabled = "false"' \
    "$WORK_DIR/.ralph/config.json" > "$WORK_DIR/.ralph/config.json.tmp" \
    && mv "$WORK_DIR/.ralph/config.json.tmp" "$WORK_DIR/.ralph/config.json"

# Init git repo
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# ── Create fake claude that handles both invocations ──────────────────
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

# The first invocation (implementation) will sleep and get killed by timeout.
# The second invocation (postmortem) will detect the postmortem template
# and respond with LEARN tags.
cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Check if this is a postmortem invocation by looking for the template marker
for arg in "$@"; do
    if [[ "$arg" == *"Timeout Postmortem Analysis"* ]]; then
        # This is the postmortem invocation
        echo "<ralph>LEARN: [Timeout postmortem for 1.1] Story was stuck on test setup</ralph>"
        echo "<ralph>LEARN: [Timeout postmortem for 1.1] Recommend breaking into sub-stories</ralph>"
        echo "<ralph>TIMEOUT_POSTMORTEM_DONE 1.1</ralph>"
        exit 0
    fi
done

# This is the implementation invocation — sleep to trigger timeout
echo "Starting implementation..."
echo "<ralph>LEARN: discovered the test framework needs configuration</ralph>"
sleep 60
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# ── Run ralph ─────────────────────────────────────────────────────────────
echo "  Running: ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard -t 3"
echo "  (timeout 3s, postmortem window 5s, max_retries 1)"
echo ""

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard -t 3 \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

# ── Assertions ─────────────────────────────────────────────────────────────
FAILURES=0

# 1. ralph should have exited non-zero (story failed)
if [[ $EXIT_CODE -eq 124 ]]; then
    echo "  FAIL: ralph was killed by 30s safety timeout"
    FAILURES=$((FAILURES + 1))
elif [[ $EXIT_CODE -eq 0 ]]; then
    echo "  FAIL: ralph exited 0 but story should have failed"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: ralph exited with code $EXIT_CODE (story failed as expected)"
fi

# 2. Postmortem file should exist
if [[ -f ".ralph/learnings/timeouts/1.1.md" ]]; then
    echo "  PASS: postmortem file exists at .ralph/learnings/timeouts/1.1.md"
else
    echo "  FAIL: postmortem file not found"
    FAILURES=$((FAILURES + 1))
fi

# 3. Postmortem file should contain the story ID
if [[ -f ".ralph/learnings/timeouts/1.1.md" ]] && grep -q "Story 1.1" ".ralph/learnings/timeouts/1.1.md" 2>/dev/null; then
    echo "  PASS: postmortem file contains story ID"
else
    echo "  FAIL: postmortem file missing story ID"
    FAILURES=$((FAILURES + 1))
fi

# 4. progress.txt should have TIMEOUT_POSTMORTEM entry
if grep -q "TIMEOUT_POSTMORTEM" progress.txt 2>/dev/null; then
    echo "  PASS: progress.txt has TIMEOUT_POSTMORTEM entry"
else
    echo "  FAIL: progress.txt missing TIMEOUT_POSTMORTEM entry"
    echo "    progress.txt contents:"
    cat progress.txt 2>/dev/null | sed 's/^/    /' || echo "    (empty)"
    FAILURES=$((FAILURES + 1))
fi

# 5. progress.txt should still have the FAIL entry (postmortem doesn't prevent failure)
if grep -q '\[FAIL\]' progress.txt 2>/dev/null; then
    echo "  PASS: progress.txt has [FAIL] entry (story still failed)"
else
    echo "  FAIL: progress.txt missing [FAIL] entry"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "  progress.txt:"
cat "$WORK_DIR/progress.txt" 2>/dev/null | sed 's/^/    /'
echo ""
if [[ -f ".ralph/learnings/timeouts/1.1.md" ]]; then
    echo "  postmortem file (first 10 lines):"
    head -10 ".ralph/learnings/timeouts/1.1.md" 2>/dev/null | sed 's/^/    /'
fi
echo ""
echo "  ralph stdout (last 20 lines):"
tail -20 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
