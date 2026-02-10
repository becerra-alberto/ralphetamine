#!/usr/bin/env bash
# Integration test: HITL feedback
#
# Verifies that `ralph hitl feedback <eval.json>` generates a remediation PRD.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: HITL Feedback ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/docs"

# State with completed stories
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": ["1.1"],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Create evaluation JSON
cp "$RALPH_DIR/tests/fixtures/hitl-evaluation.json" "$WORK_DIR/eval.json"

# Init git
cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0

OUTPUT_FILE="$WORK_DIR/feedback-output.txt"
$TIMEOUT_CMD 15 ralph hitl feedback eval.json > "$OUTPUT_FILE" 2>&1 || true

# 1. Remediation PRD created
if [[ -f "docs/hitl-remediation-prd.md" ]]; then
    echo "  PASS: remediation PRD created"
else
    echo "  FAIL: remediation PRD not created"
    FAILURES=$((FAILURES + 1))
fi

# 2. Contains story IDs from failed items
if grep -q "1.1" "docs/hitl-remediation-prd.md" 2>/dev/null; then
    echo "  PASS: PRD contains story 1.1"
else
    echo "  FAIL: PRD missing story 1.1"
    FAILURES=$((FAILURES + 1))
fi

# 3. Contains reviewer notes
if grep -q "Server starts on 3000" "docs/hitl-remediation-prd.md" 2>/dev/null; then
    echo "  PASS: PRD contains reviewer notes"
else
    echo "  FAIL: PRD missing reviewer notes"
    FAILURES=$((FAILURES + 1))
fi

# 4. Uses feedback template structure
if grep -q "Remediation PRD" "docs/hitl-remediation-prd.md" 2>/dev/null; then
    echo "  PASS: PRD uses template structure"
else
    echo "  FAIL: PRD missing template structure"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (4 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  Output:"
    cat "$OUTPUT_FILE" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  PRD contents:"
    cat "docs/hitl-remediation-prd.md" 2>/dev/null | sed 's/^/    /' || echo "    (not created)"
    exit 1
fi
