#!/usr/bin/env bash
# Integration test: ralph reset command
#
# Verifies that `ralph reset` (with 'y' piped) clears state.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Ralph Reset ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"

# State with completed stories
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": ["1.1", "1.2"],
    "absorbed_stories": {},
    "merged_stories": ["1.1"],
    "current_story": "1.3",
    "retry_count": 2
}
EOF
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0

# 1. Piping 'y' into ralph reset clears state
echo "y" | $TIMEOUT_CMD 10 ralph reset > /dev/null 2>&1 || true

# 2. completed_stories is empty after reset
COMPLETED=$(jq '.completed_stories | length' .ralph/state.json 2>/dev/null || echo "?")
if [[ "$COMPLETED" == "0" ]]; then
    echo "  PASS: completed_stories is empty after reset"
else
    echo "  FAIL: completed_stories has $COMPLETED entries (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

# 3. retry_count is 0 after reset
RETRY=$(jq '.retry_count // 0' .ralph/state.json 2>/dev/null || echo "?")
if [[ "$RETRY" == "0" ]]; then
    echo "  PASS: retry_count is 0 after reset"
else
    echo "  FAIL: retry_count = $RETRY (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

# 4. current_story is null after reset
CURRENT=$(jq -r '.current_story // "null"' .ralph/state.json 2>/dev/null || echo "?")
if [[ "$CURRENT" == "null" ]]; then
    echo "  PASS: current_story is null after reset"
else
    echo "  FAIL: current_story = $CURRENT (expected null)"
    FAILURES=$((FAILURES + 1))
fi

# 5. merged_stories is empty after reset
MERGED=$(jq '.merged_stories | length' .ralph/state.json 2>/dev/null || echo "?")
if [[ "$MERGED" == "0" ]]; then
    echo "  PASS: merged_stories is empty after reset"
else
    echo "  FAIL: merged_stories has $MERGED entries (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

# 6. absorbed_stories is empty after reset
ABSORBED=$(jq '.absorbed_stories | length' .ralph/state.json 2>/dev/null || echo "?")
if [[ "$ABSORBED" == "0" ]]; then
    echo "  PASS: absorbed_stories is empty after reset"
else
    echo "  FAIL: absorbed_stories has $ABSORBED entries (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (6 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  state.json:"
    jq . .ralph/state.json 2>/dev/null | sed 's/^/    /'
    exit 1
fi
