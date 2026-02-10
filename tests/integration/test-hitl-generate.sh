#!/usr/bin/env bash
# Integration test: HITL generate
#
# Verifies that `ralph hitl generate` produces an HTML review page
# with story data from completed specs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: HITL Generate ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/docs"

# State with completed stories
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": ["1.1", "1.2"],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Init git
cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Mock 'open' to prevent browser launch
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/open" << 'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$FAKE_BIN/open"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0

OUTPUT_FILE="$WORK_DIR/hitl-output.txt"
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 15 ralph hitl generate --output docs/hitl-review.html \
    > "$OUTPUT_FILE" 2>&1 || true

# 1. HTML file created
if [[ -f "docs/hitl-review.html" ]]; then
    echo "  PASS: HTML file created at docs/hitl-review.html"
else
    echo "  FAIL: HTML file not created"
    FAILURES=$((FAILURES + 1))
fi

# 2. HTML contains story data (STORIES_DATA placeholder replaced)
if grep -q "1.1" "docs/hitl-review.html" 2>/dev/null; then
    echo "  PASS: HTML contains story 1.1 data"
else
    echo "  FAIL: HTML missing story 1.1 data"
    FAILURES=$((FAILURES + 1))
fi

# 3. HTML contains story 1.2
if grep -q "1.2" "docs/hitl-review.html" 2>/dev/null; then
    echo "  PASS: HTML contains story 1.2 data"
else
    echo "  FAIL: HTML missing story 1.2 data"
    FAILURES=$((FAILURES + 1))
fi

# 4. Project name injected
if grep -q "greeter" "docs/hitl-review.html" 2>/dev/null; then
    echo "  PASS: project name 'greeter' injected into HTML"
else
    echo "  FAIL: project name not in HTML"
    FAILURES=$((FAILURES + 1))
fi

# 5. HTML is valid (has DOCTYPE and closing html tag)
if head -1 "docs/hitl-review.html" | grep -q "DOCTYPE" 2>/dev/null; then
    echo "  PASS: HTML has DOCTYPE"
else
    echo "  FAIL: HTML missing DOCTYPE"
    FAILURES=$((FAILURES + 1))
fi

# 6. Stories grouped by epic (epic header present)
if grep -q "epic" "docs/hitl-review.html" 2>/dev/null; then
    echo "  PASS: epic grouping present in HTML"
else
    echo "  FAIL: epic grouping missing"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (6 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  Output:"
    cat "$OUTPUT_FILE" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
