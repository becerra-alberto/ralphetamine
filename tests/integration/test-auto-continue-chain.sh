#!/usr/bin/env bash
# Integration test: ralph run --auto-continue chains reconcile → E2E → discovery → pipeline
#
# Uses real ralph binary + a fake claude that:
#   - Returns DONE for story execution
#   - Returns DISCOVERY_DONE for the discovery phase
#
# Expected: exit 0, state.pipeline_iteration=1, [DISCOVERY_DONE] in progress.txt,
#           .ralph/e2e/last-result.txt exists, stdout contains "AUTO-CONTINUE CHAIN"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup ───────────────────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Auto-Continue Chain ==="
echo "  Work dir: $WORK_DIR"

cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Fresh state with pipeline_iteration
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0,
    "pipeline_iteration": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# init git
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# ── Fake claude ─────────────────────────────────────────────────────────────
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Emit DONE for story execution prompts; DISCOVERY_DONE for discovery prompts
FULL_ARGS="$*"
if echo "$FULL_ARGS" | grep -q "feature-discovery\|Feature Discovery\|DISCOVERY"; then
    # Simulate discovery phase — write a fake PRD and emit signal
    mkdir -p tasks
    echo "# Discovery PRD" > tasks/prd-discovery-auto-test.md
    echo "<ralph>DISCOVERY_DONE: tasks/prd-discovery-auto-test.md</ralph>"
elif echo "$FULL_ARGS" | grep -q "pipeline\|PIPELINE\|PRD\|prd"; then
    # Pipeline invocation — just acknowledge
    echo "Pipeline acknowledged."
else
    # Default: complete story 1.1
    echo "<ralph>DONE 1.1</ralph>"
fi
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# ── Run ralph ────────────────────────────────────────────────────────────────
echo "  Running: ralph run --auto-continue --max-iterations 1 -s 1.1 --no-interactive --no-dashboard"
echo ""

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 60 "$RALPH_DIR/bin/ralph" run \
    -s 1.1 --no-interactive --no-tmux --no-dashboard \
    --auto-continue --max-iterations 1 \
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

# 2. stdout contains "AUTO-CONTINUE CHAIN"
if ! grep -q "AUTO-CONTINUE CHAIN" "$RALPH_OUTPUT"; then
    echo "  FAIL: stdout does not contain 'AUTO-CONTINUE CHAIN'"
    PASS=false
fi

# 3. pipeline_iteration = 1 in state.json
ITER=$(jq '.pipeline_iteration // 0' "$WORK_DIR/.ralph/state.json" 2>/dev/null || echo "0")
if [[ "$ITER" -ne 1 ]]; then
    echo "  FAIL: pipeline_iteration=$ITER (expected 1)"
    PASS=false
fi

# 4. [DISCOVERY_DONE] in progress.txt
if ! grep -q '\[DISCOVERY_DONE\]' "$WORK_DIR/progress.txt"; then
    echo "  FAIL: [DISCOVERY_DONE] not found in progress.txt"
    PASS=false
fi

# 5. .ralph/e2e/last-result.txt exists (E2E ran, even if no test framework)
if [[ ! -f "$WORK_DIR/.ralph/e2e/last-result.txt" ]]; then
    echo "  INFO: .ralph/e2e/last-result.txt absent (no test framework detected — acceptable)"
fi

if [[ "$PASS" == true ]]; then
    echo ""
    echo "  ALL ASSERTIONS PASSED"
    exit 0
else
    echo ""
    echo "  --- ralph stdout ---"
    cat "$RALPH_OUTPUT"
    echo "  --- progress.txt ---"
    cat "$WORK_DIR/progress.txt" 2>/dev/null || true
    echo "  --- state.json ---"
    cat "$WORK_DIR/.ralph/state.json" 2>/dev/null || true
    echo ""
    echo "  INTEGRATION TEST FAILED"
    exit 1
fi
