#!/usr/bin/env bash
# Integration test: CLI flags behavioral verification (M5)
#
# Tests that CLI flags actually change execution behavior,
# not just that they don't crash.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0
TOTAL_ASSERTIONS=0

pass() { TOTAL_ASSERTIONS=$((TOTAL_ASSERTIONS + 1)); echo "  PASS: $1"; }
fail() { TOTAL_ASSERTIONS=$((TOTAL_ASSERTIONS + 1)); FAILURES=$((FAILURES + 1)); echo "  FAIL: $1"; }

# Setup helper: creates a fresh sandbox with fake claude
setup_sandbox() {
    local work_dir
    work_dir=$(mktemp -d)

    cp -R "$SANDBOX_SRC/.ralph" "$work_dir/.ralph"
    cp -R "$SANDBOX_SRC/specs" "$work_dir/specs"
    cp    "$SANDBOX_SRC/CLAUDE.md" "$work_dir/CLAUDE.md"
    mkdir -p "$work_dir/src" "$work_dir/tests"

    cat > "$work_dir/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
    : > "$work_dir/progress.txt"
    mkdir -p "$work_dir/.ralph/learnings"
    echo '{}' > "$work_dir/.ralph/learnings/_index.json"

    git -C "$work_dir" init -q
    git -C "$work_dir" add -A
    git -C "$work_dir" commit -q -m "test scaffold" --allow-empty

    local fake_bin="$work_dir/.fake-bin"
    mkdir -p "$fake_bin"
    cat > "$fake_bin/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
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
    chmod +x "$fake_bin/claude"

    echo "$work_dir"
}

echo "=== Integration Test: CLI Flags Behavioral ==="
echo ""

# ── Test 1: --iterations 1 limits to exactly 1 story ────────────────────────
echo "--- Test 1: --iterations 1 ---"
WORK_DIR=$(setup_sandbox)
cd "$WORK_DIR"
FAKE_BIN="$WORK_DIR/.fake-bin"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    --iterations 1 --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || true

# Should have completed exactly 1 story (1.1)
DONE_COUNT=$(grep -c '\[DONE\]' "$WORK_DIR/progress.txt" 2>/dev/null || echo "0")
if [[ "$DONE_COUNT" -eq 1 ]]; then
    pass "--iterations 1: exactly 1 story completed"
else
    fail "--iterations 1: $DONE_COUNT stories completed (expected 1)"
fi

# Output should mention iteration limit
if grep -qi "iteration limit\|Reached iteration" "$RALPH_OUTPUT" 2>/dev/null; then
    pass "--iterations 1: output mentions iteration limit"
else
    fail "--iterations 1: output missing iteration limit message"
fi

rm -rf "$WORK_DIR"

# ── Test 2: --timeout value is observable in output ──────────────────────────
echo "--- Test 2: --timeout 7 ---"
WORK_DIR=$(setup_sandbox)
cd "$WORK_DIR"
FAKE_BIN="$WORK_DIR/.fake-bin"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    --timeout 7 -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || true

# The header box should display the timeout value
if grep -q "7s per story" "$RALPH_OUTPUT" 2>/dev/null; then
    pass "--timeout 7: output shows '7s per story'"
else
    fail "--timeout 7: output missing timeout value"
fi

rm -rf "$WORK_DIR"

# ── Test 3: --resume starts from specified story ─────────────────────────────
echo "--- Test 3: --resume 1.2 ---"
WORK_DIR=$(setup_sandbox)
cd "$WORK_DIR"
FAKE_BIN="$WORK_DIR/.fake-bin"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    --resume 1.2 --iterations 1 --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || true

# Should have started with 1.2, not 1.1
if grep -q '\[DONE\] Story 1.2' "$WORK_DIR/progress.txt" 2>/dev/null; then
    pass "--resume 1.2: story 1.2 completed"
else
    fail "--resume 1.2: story 1.2 NOT completed"
fi

# 1.1 should NOT have been executed
if ! grep -q '\[DONE\] Story 1.1' "$WORK_DIR/progress.txt" 2>/dev/null; then
    pass "--resume 1.2: story 1.1 was skipped"
else
    fail "--resume 1.2: story 1.1 was NOT skipped"
fi

# Output should mention resume
if grep -qi "resume\|from 1.2" "$RALPH_OUTPUT" 2>/dev/null; then
    pass "--resume 1.2: output mentions resume"
else
    fail "--resume 1.2: output missing resume reference"
fi

rm -rf "$WORK_DIR"

# ── Test 4: --dry-run shows prompt without executing ─────────────────────────
echo "--- Test 4: --dry-run ---"
WORK_DIR=$(setup_sandbox)
cd "$WORK_DIR"
FAKE_BIN="$WORK_DIR/.fake-bin"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    --dry-run -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || true

# Should show DRY RUN marker
if grep -q "\[DRY RUN\]" "$RALPH_OUTPUT" 2>/dev/null; then
    pass "--dry-run: output shows [DRY RUN]"
else
    fail "--dry-run: output missing [DRY RUN]"
fi

# State should NOT have changed (no story completed)
COMPLETED=$(jq '.completed_stories | length' .ralph/state.json 2>/dev/null || echo "0")
if [[ "$COMPLETED" -eq 0 ]]; then
    pass "--dry-run: no stories completed (read-only)"
else
    fail "--dry-run: $COMPLETED stories completed (expected 0)"
fi

# progress.txt should be empty (no execution happened)
PROGRESS_LINES=$(wc -l < "$WORK_DIR/progress.txt" 2>/dev/null | xargs)
if [[ "$PROGRESS_LINES" -eq 0 ]]; then
    pass "--dry-run: progress.txt is empty"
else
    fail "--dry-run: progress.txt has $PROGRESS_LINES lines (expected 0)"
fi

rm -rf "$WORK_DIR"

# ── Test 5: -s runs only the specified story ─────────────────────────────────
echo "--- Test 5: -s 1.2 (specific story) ---"
WORK_DIR=$(setup_sandbox)
cd "$WORK_DIR"
FAKE_BIN="$WORK_DIR/.fake-bin"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    -s 1.2 --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || true

# Only story 1.2 should be completed
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^1.2$"; then
    pass "-s 1.2: story 1.2 completed"
else
    fail "-s 1.2: story 1.2 NOT completed"
fi

# Story 1.1 should NOT be completed (only 1.2 was specified)
if ! jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^1.1$"; then
    pass "-s 1.2: story 1.1 was NOT executed"
else
    fail "-s 1.2: story 1.1 was completed (should not have been)"
fi

rm -rf "$WORK_DIR"

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED ($TOTAL_ASSERTIONS assertions) ==="
    exit 0
else
    echo "=== $FAILURES of $TOTAL_ASSERTIONS ASSERTION(S) FAILED ==="
    exit 1
fi
