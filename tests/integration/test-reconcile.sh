#!/usr/bin/env bash
# Integration test: reconcile (dry-run and --apply)
#
# Creates orphaned ralph/story-* branches, verifies dry-run has no side effects,
# then --apply merges, updates state, and cleans up branches.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Reconcile ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Fresh state
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Init git
cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Create orphaned branches with real work
git checkout -b "ralph/story-1.1" 2>/dev/null
echo "greeter work for 1.1" > src/greeter.sh
git add src/greeter.sh
git commit -q -m "feat: story 1.1 greeter"
git checkout - 2>/dev/null

git checkout -b "ralph/story-1.2" 2>/dev/null
echo "test work for 1.2" > tests/test-greeter.sh
git add tests/test-greeter.sh
git commit -q -m "feat: story 1.2 tests"
git checkout - 2>/dev/null

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0

# ── Dry-run assertions ──────────────────────────────────────────────

DRY_OUTPUT="$WORK_DIR/dry-output.txt"
$TIMEOUT_CMD 15 ralph reconcile > "$DRY_OUTPUT" 2>&1 || true

# 1. Dry-run lists orphaned branches
if grep -q "ralph/story-1.1" "$DRY_OUTPUT" 2>/dev/null; then
    echo "  PASS: dry-run lists orphaned branch 1.1"
else
    echo "  FAIL: dry-run missing branch 1.1"
    FAILURES=$((FAILURES + 1))
fi

# 2. Dry-run: no changes to state
COMPLETED=$(jq '.completed_stories | length' .ralph/state.json 2>/dev/null || echo "0")
if [[ "$COMPLETED" == "0" ]]; then
    echo "  PASS: dry-run did not modify state"
else
    echo "  FAIL: dry-run modified state ($COMPLETED completed)"
    FAILURES=$((FAILURES + 1))
fi

# 3. Dry-run: no merge commits in log
MERGE_COUNT=$(git log --oneline --merges | grep -c "reconcile" || true)
if [[ "$MERGE_COUNT" -eq 0 ]]; then
    echo "  PASS: dry-run produced no merge commits"
else
    echo "  FAIL: dry-run produced $MERGE_COUNT merge commits"
    FAILURES=$((FAILURES + 1))
fi

# ── --apply assertions ──────────────────────────────────────────────

APPLY_OUTPUT="$WORK_DIR/apply-output.txt"
$TIMEOUT_CMD 15 ralph reconcile --apply > "$APPLY_OUTPUT" 2>&1 || true

# 4. Stories in completed_stories
for s in 1.1 1.2; do
    if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: --apply: story $s in completed_stories"
    else
        echo "  FAIL: --apply: story $s NOT in completed_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 5. Stories in merged_stories
for s in 1.1 1.2; do
    if jq -r '.merged_stories[]' .ralph/state.json 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: --apply: story $s in merged_stories"
    else
        echo "  FAIL: --apply: story $s NOT in merged_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 6. Progress.txt has [RECONCILED] entries
for s in 1.1 1.2; do
    if grep -q "\[RECONCILED\] Story $s" progress.txt 2>/dev/null; then
        echo "  PASS: progress.txt has [RECONCILED] for $s"
    else
        echo "  FAIL: progress.txt missing [RECONCILED] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 7. Branches deleted
for s in 1.1 1.2; do
    if git rev-parse --verify "ralph/story-$s" &>/dev/null; then
        echo "  FAIL: branch ralph/story-$s still exists"
        FAILURES=$((FAILURES + 1))
    else
        echo "  PASS: branch ralph/story-$s deleted"
    fi
done

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (10 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  state.json:"
    jq . .ralph/state.json 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  progress.txt:"
    cat progress.txt 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  --apply output:"
    cat "$APPLY_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
