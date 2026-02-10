#!/usr/bin/env bash
# Integration test: ralph learnings command
#
# Verifies that `ralph learnings` lists categories and `ralph learnings <topic>` shows entries.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Ralph Learnings ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"

# Populate learnings
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"
cat > "$WORK_DIR/.ralph/learnings/testing.md" << 'EOF'
## Testing Learnings
- Always validate input args before processing
- Use timeout for external commands
EOF
cat > "$WORK_DIR/.ralph/learnings/framework.md" << 'EOF'
## Framework Learnings
- SvelteKit routes use +page.svelte convention
EOF

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0

# 1. ralph learnings lists specific category names
OUTPUT=$($TIMEOUT_CMD 10 ralph learnings 2>&1) || true
if echo "$OUTPUT" | grep -q "testing" && echo "$OUTPUT" | grep -q "framework"; then
    echo "  PASS: 'ralph learnings' shows both category names (testing, framework)"
else
    echo "  FAIL: 'ralph learnings' output missing expected categories"
    echo "    output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

# 2. ralph learnings lists entry counts
if echo "$OUTPUT" | grep -q "entries"; then
    echo "  PASS: 'ralph learnings' shows entry counts"
else
    echo "  FAIL: 'ralph learnings' missing entry counts"
    echo "    output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

# 3. ralph learnings testing shows entries from testing.md
OUTPUT=$($TIMEOUT_CMD 10 ralph learnings testing 2>&1) || true
if echo "$OUTPUT" | grep -q "validate input args"; then
    echo "  PASS: 'ralph learnings testing' shows testing entries"
else
    echo "  FAIL: 'ralph learnings testing' missing expected content"
    echo "    output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

# 4. ralph learnings testing shows the timeout learning too
if echo "$OUTPUT" | grep -q "Use timeout for external commands"; then
    echo "  PASS: 'ralph learnings testing' shows timeout learning"
else
    echo "  FAIL: 'ralph learnings testing' missing timeout learning"
    echo "    output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

# 5. Unknown topic shows error message with available topics
OUTPUT=$($TIMEOUT_CMD 10 ralph learnings nonexistent 2>&1)
EXIT=$?
if echo "$OUTPUT" | grep -qi "no learnings found\|available topics"; then
    echo "  PASS: 'ralph learnings nonexistent' shows helpful error"
else
    echo "  FAIL: 'ralph learnings nonexistent' missing error/help message"
    echo "    exit=$EXIT output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

# 6. Unknown topic lists available topics for recovery
if echo "$OUTPUT" | grep -q "testing"; then
    echo "  PASS: 'ralph learnings nonexistent' lists available topics"
else
    echo "  FAIL: 'ralph learnings nonexistent' missing topic listing"
    echo "    output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

# 7. No learnings directory shows total of 0 learnings
rm -rf .ralph/learnings
OUTPUT=$($TIMEOUT_CMD 10 ralph learnings 2>&1)
EXIT=$?
if echo "$OUTPUT" | grep -qi "total: 0\|learnings by topic"; then
    echo "  PASS: missing learnings directory handled gracefully"
else
    echo "  FAIL: missing learnings directory produced unexpected output"
    echo "    exit=$EXIT output: $OUTPUT"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (7 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
