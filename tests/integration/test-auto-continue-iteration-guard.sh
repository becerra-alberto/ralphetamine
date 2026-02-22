#!/usr/bin/env bash
# Integration test: --auto-continue --max-iterations 3 with counter already at 3
# should immediately skip the chain (iteration guard).
#
# Expected: stdout contains "max pipeline iterations reached",
#           pipeline_iteration stays at 3, .ralph/last-discovery-output.txt absent.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup ───────────────────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Auto-Continue Iteration Guard ==="
echo "  Work dir: $WORK_DIR"

cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Pre-seed state with pipeline_iteration at limit (3)
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0,
    "pipeline_iteration": 3
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# ── Fake claude (returns DONE for story) ────────────────────────────────────
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
echo "<ralph>DONE 1.1</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# ── Run ralph ────────────────────────────────────────────────────────────────
echo "  Running: ralph run --auto-continue --max-iterations 3 -s 1.1"
echo "  State has pipeline_iteration=3 — chain should be skipped"
echo ""

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 "$RALPH_DIR/bin/ralph" run \
    -s 1.1 --no-interactive --no-tmux --no-dashboard \
    --auto-continue --max-iterations 3 \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

# ── Assertions ───────────────────────────────────────────────────────────────
PASS=true

# 1. Exit code 0
if [[ $EXIT_CODE -ne 0 ]]; then
    echo "  FAIL: ralph exited with code $EXIT_CODE (expected 0)"
    PASS=false
fi

# 2. stdout contains iteration guard message
if ! grep -q "max pipeline iterations reached" "$RALPH_OUTPUT"; then
    echo "  FAIL: stdout does not contain 'max pipeline iterations reached'"
    PASS=false
fi

# 3. pipeline_iteration stays at 3 (not incremented)
ITER=$(jq '.pipeline_iteration // 0' "$WORK_DIR/.ralph/state.json" 2>/dev/null || echo "0")
if [[ "$ITER" -ne 3 ]]; then
    echo "  FAIL: pipeline_iteration=$ITER (expected 3)"
    PASS=false
fi

# 4. .ralph/last-discovery-output.txt must NOT exist
if [[ -f "$WORK_DIR/.ralph/last-discovery-output.txt" ]]; then
    echo "  FAIL: .ralph/last-discovery-output.txt exists (discovery should not have run)"
    PASS=false
fi

if [[ "$PASS" == true ]]; then
    echo ""
    echo "  ALL ASSERTIONS PASSED"
    exit 0
else
    echo ""
    echo "  --- ralph stdout ---"
    cat "$RALPH_OUTPUT"
    echo "  --- state.json ---"
    cat "$WORK_DIR/.ralph/state.json" 2>/dev/null || true
    echo ""
    echo "  INTEGRATION TEST FAILED"
    exit 1
fi
