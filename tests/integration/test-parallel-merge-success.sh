#!/usr/bin/env bash
# Integration test: parallel merge conflict resolution SUCCESS
#
# 2 stories in [batch:1], both modify the same file (src/shared.sh).
# Story 2.1 merges first (clean). Story 2.2 conflicts.
# Mock claude for merge resolution resolves the conflict and outputs MERGE_DONE.
#
# Expected: Both stories completed, both merged, branches cleaned up.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Parallel Merge Success ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Only 2 stories in batch 1
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Merge success test
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

# Create merge-review template
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
# The merge-resolution claude resolves the conflict and outputs MERGE_DONE.
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Check if this is a merge resolution invocation
for arg in "$@"; do
    if [[ "$arg" == *"Merge Resolution Agent"* || "$arg" == *"Resolve the merge"* ]]; then
        # Resolve conflict: combine both changes into a clean file
        for f in $(git diff --name-only --diff-filter=U 2>/dev/null); do
            if [[ -f "$f" ]]; then
                # Write a clean combined version
                cat > "$f" << 'RESOLVED'
#!/usr/bin/env bash
# Combined by merge resolution
list_bookmarks() { echo "listing"; }
search_bookmarks() { echo "searching"; }
RESOLVED
                git add "$f"
            fi
        done
        git commit -q -m "resolve: merge conflict" 2>/dev/null || true
        echo "<ralph>MERGE_DONE: resolved conflicts in shared.sh</ralph>"
        exit 0
    fi
done

# Normal story execution
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

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

# 1. Both stories in completed_stories
for s in 2.1 2.2; do
    if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: story $s in completed_stories"
    else
        echo "  FAIL: story $s NOT in completed_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 2. Both branches merged and deleted
BRANCH_COUNT=$(git branch --list 'ralph/story-*' | wc -l | tr -d ' ')
if [[ "$BRANCH_COUNT" -eq 0 ]]; then
    echo "  PASS: all ralph/story-* branches deleted"
else
    echo "  FAIL: $BRANCH_COUNT ralph/story-* branches remain"
    FAILURES=$((FAILURES + 1))
fi

# 3. No conflict diagnostics saved (resolution succeeded)
DIAG_COUNT=0
if [[ -d .ralph/logs ]]; then
    DIAG_COUNT=$(ls .ralph/logs/merge-conflict-*.log 2>/dev/null | wc -l | tr -d ' ') || true
fi
if [[ "$DIAG_COUNT" -eq 0 ]]; then
    echo "  PASS: no merge conflict diagnostics (resolution succeeded)"
else
    echo "  FAIL: $DIAG_COUNT merge conflict diagnostics found"
    FAILURES=$((FAILURES + 1))
fi

# 4. Working tree has both stories' changes
if [[ -f "src/story-2-1.sh" && -f "src/story-2-2.sh" ]]; then
    echo "  PASS: both stories' files exist in working tree"
else
    echo "  FAIL: missing story files in working tree"
    FAILURES=$((FAILURES + 1))
fi

# 5. progress.txt has [DONE] for both
for s in 2.1 2.2; do
    if grep -q "\[DONE\] Story $s" progress.txt 2>/dev/null; then
        echo "  PASS: progress.txt has [DONE] for $s"
    else
        echo "  FAIL: progress.txt missing [DONE] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (5 assertions) ==="
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
    echo "  ralph stdout (last 40 lines):"
    tail -40 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
