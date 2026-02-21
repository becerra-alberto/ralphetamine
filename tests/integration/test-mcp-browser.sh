#!/usr/bin/env bash
# Integration test: MCP --mcp-config flag injection
#
# Verifies that when mcp.enabled=true and a config file exists, ralph passes
# --mcp-config <abs_path> to the claude sub-process. Uses a fake claude that
# logs its received arguments to a file for assertion.
#
# No real browser session is started — mcp.browser.enabled=false.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup ──────────────────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: MCP Browser Flag Injection ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox project
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs"  "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Fresh state
cat > "$WORK_DIR/.ralph/state.json" <<'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Write an MCP config file that ralph will inject
cat > "$WORK_DIR/.ralph/mcp-config.json" <<'EOF'
{"mcpServers":{}}
EOF

# Patch .ralph/config.json to enable MCP (but NOT browser — no mcp-run needed)
python3 -c "
import json, sys
with open('$WORK_DIR/.ralph/config.json') as f:
    cfg = json.load(f)
cfg['mcp'] = {
    'enabled': True,
    'config_file': '.ralph/mcp-config.json',
    'allowed_tools': ['mcp__chrome-devtools__*', 'Bash'],
    'strict': True,
    'browser': {
        'enabled': False,
        'manager': 'mcp-run',
        'mode': 'web',
        'profile': 'persistent',
        'background': False,
        'headless': False,
        'ext': ''
    }
}
with open('$WORK_DIR/.ralph/config.json', 'w') as f:
    json.dump(cfg, f, indent=2)
"

# Init git repo
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# ── Create fake claude that logs its flags ─────────────────────────────────
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
FLAGS_LOG="$WORK_DIR/claude-flags.txt"
cat > "$FAKE_BIN/claude" <<FAKECLAUDE
#!/usr/bin/env bash
# Fake claude: log all args, then emit DONE signal
echo "\$@" >> "$FLAGS_LOG"
# Emit a valid JSON result envelope so ralph parses it cleanly
cat <<'ENVELOPE'
{"type":"result","subtype":"success","result":"<ralph>DONE 1.1</ralph>","num_turns":1,"usage":{"input_tokens":10,"output_tokens":5},"total_cost_usd":0.001}
ENVELOPE
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# ── Run ralph ──────────────────────────────────────────────────────────────
echo "  Running ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard -t 10"

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run -s 1.1 \
    --no-tmux --no-interactive --no-dashboard -t 10 \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

# ── Assertions ─────────────────────────────────────────────────────────────
FAILED=0

# 1. Ralph should have exited successfully (story DONE)
if [[ $EXIT_CODE -ne 0 ]]; then
    echo "  FAIL: ralph exited with code $EXIT_CODE (expected 0)"
    echo "  --- ralph stdout ---"
    cat "$RALPH_OUTPUT"
    FAILED=1
fi

# 2. fake claude must have been invoked
if [[ ! -f "$FLAGS_LOG" ]]; then
    echo "  FAIL: fake claude was never invoked (no flags log)"
    FAILED=1
fi

# 3. --mcp-config must appear in claude's args
if [[ -f "$FLAGS_LOG" ]]; then
    if ! grep -q -- "--mcp-config" "$FLAGS_LOG"; then
        echo "  FAIL: --mcp-config not found in claude args"
        echo "  --- claude flags log ---"
        cat "$FLAGS_LOG"
        FAILED=1
    else
        echo "  PASS: --mcp-config found in claude args"
    fi

    # 4. the path after --mcp-config must be absolute
    if grep -q -- "--mcp-config" "$FLAGS_LOG"; then
        MCP_PATH=$(grep -o -- "--mcp-config [^ ]*" "$FLAGS_LOG" | head -1 | awk '{print $2}')
        if [[ "$MCP_PATH" != /* ]]; then
            echo "  FAIL: --mcp-config path is not absolute: $MCP_PATH"
            FAILED=1
        else
            echo "  PASS: --mcp-config path is absolute: $MCP_PATH"
        fi
    fi

    # 5. --allowedTools must appear
    if ! grep -q -- "--allowedTools" "$FLAGS_LOG"; then
        echo "  FAIL: --allowedTools not found in claude args"
        echo "  --- claude flags log ---"
        cat "$FLAGS_LOG"
        FAILED=1
    else
        echo "  PASS: --allowedTools found in claude args"
    fi

    # 6. --strict-mcp-config must appear
    if ! grep -q -- "--strict-mcp-config" "$FLAGS_LOG"; then
        echo "  FAIL: --strict-mcp-config not found in claude args"
        FAILED=1
    else
        echo "  PASS: --strict-mcp-config found in claude args"
    fi
fi

echo ""
if [[ $FAILED -eq 0 ]]; then
    echo "=== ALL ASSERTIONS PASSED ==="
    exit 0
else
    echo "=== TEST FAILED ==="
    exit 1
fi
