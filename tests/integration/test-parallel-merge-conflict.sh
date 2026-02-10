#!/usr/bin/env bash
# Integration test: parallel merge conflict
#
# 2 stories in [batch:1], both modify the same file (src/shared.sh).
# Story 2.1 merges first (clean). Story 2.2 conflicts.
# Mock claude for merge resolution outputs MERGE_FAIL.
#
# Expected: Story A completed, Story B NOT completed, diagnostics saved,
# B's branch preserved.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Parallel Merge Conflict ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Only 2 stories in batch 1
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Conflict test
# [batch:1]
2.1 | List all bookmarks
2.2 | Search bookmarks
EOF

cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": ["1.1", "1.2"],
    "absorbed_stories": {},
    "merged_stories": ["1.1", "1.2"],
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Create the shared file that both stories will modify
mkdir -p "$WORK_DIR/src"
echo '#!/usr/bin/env bash' > "$WORK_DIR/src/shared.sh"
echo '# Original shared module' >> "$WORK_DIR/src/shared.sh"
echo 'echo "base version"' >> "$WORK_DIR/src/shared.sh"

# Create merge-review template (needed for conflict resolution)
mkdir -p "$WORK_DIR/.ralph/templates"
cat > "$WORK_DIR/.ralph/templates/merge-review.md" << 'TMPL'
Resolve the merge conflict for story {{STORY_ID}} on branch {{BRANCH_NAME}}.
Conflicting files: {{CONFLICT_FILES}}
TMPL

cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Fake claude: both stories modify shared.sh with conflicting content.
# The merge-resolution claude (detected by "Resolve the merge" in prompt)
# outputs MERGE_FAIL.
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Check if this is a merge resolution invocation
for arg in "$@"; do
    if [[ "$arg" == *"Merge Resolution Agent"* || "$arg" == *"Resolve the merge"* ]]; then
        echo "<ralph>MERGE_FAIL: cannot resolve conflicting changes to shared.sh</ralph>"
        exit 0
    fi
done

# Normal story execution: extract story ID
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

# Both stories modify the SAME file with different content → conflict
mkdir -p src
if [[ "$STORY_ID" == "2.1" ]]; then
    cat > src/shared.sh << 'CONTENT'
#!/usr/bin/env bash
# Modified by story 2.1 - list feature
list_bookmarks() { echo "listing"; }
CONTENT
else
    cat > src/shared.sh << 'CONTENT'
#!/usr/bin/env bash
# Modified by story 2.2 - search feature
search_bookmarks() { echo "searching"; }
CONTENT
fi

# Also create a unique file so we can track merges
SLUG=$(echo "$STORY_ID" | tr '.' '-')
echo "# Story $STORY_ID work" > "src/story-${SLUG}.sh"

git add -A
git commit -q -m "feat(story-${STORY_ID}): implement story ${STORY_ID}"
echo "<ralph>DONE ${STORY_ID}</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 60 ralph run \
    --parallel --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

FAILURES=0

# 1. At least one story completed (the first to merge succeeds)
COMPLETED_COUNT=$(jq '.completed_stories | length' .ralph/state.json 2>/dev/null || echo 0)
# Pre-completed stories (1.1, 1.2) + at least one new one
if [[ "$COMPLETED_COUNT" -ge 3 ]]; then
    echo "  PASS: at least one new story completed ($COMPLETED_COUNT total)"
else
    echo "  FAIL: expected >= 3 completed, got $COMPLETED_COUNT"
    FAILURES=$((FAILURES + 1))
fi

# 2. NOT both new stories completed (one should have conflicted)
if [[ "$COMPLETED_COUNT" -le 3 ]]; then
    echo "  PASS: not all stories completed (conflict detected)"
else
    echo "  FAIL: all stories completed but conflict was expected"
    FAILURES=$((FAILURES + 1))
fi

# 3. Conflict diagnostics saved
DIAG_COUNT=$(ls .ralph/logs/merge-conflict-*.log 2>/dev/null | wc -l | tr -d ' ')
if [[ "$DIAG_COUNT" -ge 1 ]]; then
    echo "  PASS: merge conflict diagnostics saved ($DIAG_COUNT files)"
else
    echo "  FAIL: no merge conflict diagnostics found"
    FAILURES=$((FAILURES + 1))
fi

# 4. Failed story's branch preserved
# The story that conflicted should still have its branch
PRESERVED_BRANCHES=$(git branch --list 'ralph/story-*' | wc -l | tr -d ' ')
if [[ "$PRESERVED_BRANCHES" -ge 1 ]]; then
    echo "  PASS: conflicted story branch preserved ($PRESERVED_BRANCHES branches)"
else
    echo "  FAIL: no ralph/story-* branches preserved"
    FAILURES=$((FAILURES + 1))
fi

# 5. progress.txt has at least one [DONE]
DONE_COUNT=$(grep -c "\[DONE\]" progress.txt 2>/dev/null || true)
if [[ "$DONE_COUNT" -ge 1 ]]; then
    echo "  PASS: progress.txt has $DONE_COUNT [DONE] entries"
else
    echo "  FAIL: no [DONE] entries in progress.txt"
    FAILURES=$((FAILURES + 1))
fi

# 6. Working tree has the merged story's changes
# At least one story-*.sh file should exist
MERGED_FILES=$(ls src/story-*.sh 2>/dev/null | wc -l | tr -d ' ')
if [[ "$MERGED_FILES" -ge 1 ]]; then
    echo "  PASS: merged story files exist ($MERGED_FILES)"
else
    echo "  FAIL: no merged story files found"
    FAILURES=$((FAILURES + 1))
fi

# 7. No merge conflict markers in working tree
CONFLICT_MARKERS=0
if [[ -d src ]]; then
    CONFLICT_MARKERS=$(grep -rl "<<<<<<" src/ 2>/dev/null | wc -l | tr -d ' ') || true
fi
if [[ "$CONFLICT_MARKERS" -eq 0 ]]; then
    echo "  PASS: no merge conflict markers in working tree"
else
    echo "  FAIL: $CONFLICT_MARKERS files have conflict markers"
    FAILURES=$((FAILURES + 1))
fi

# 8. stdout mentions conflict
if grep -qi "conflict" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout mentions conflict"
else
    echo "  FAIL: stdout missing conflict mention"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (8 assertions) ==="
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
    echo "  git branches:"
    git branch -a 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  diagnostics:"
    cat .ralph/logs/merge-conflict-*.log 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 40 lines):"
    tail -40 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
