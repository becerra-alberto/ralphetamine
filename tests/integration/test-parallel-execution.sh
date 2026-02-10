#!/usr/bin/env bash
# Integration test: parallel execution (worktree → execute → merge → cleanup)
#
# Runs the REAL ralph binary in parallel mode against the parallel sandbox.
# Stories 2.1, 2.2, 2.3 are in [batch:1] — each spawns a worktree, creates
# a unique file, commits it, and outputs DONE. After merge, all files should
# exist in the working tree.
#
# Stories 1.1 and 1.2 are in [batch:0] (sequential foundation), pre-completed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Parallel Execution ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Stories.txt: only batch 1 (stories 2.1, 2.2, 2.3)
# Pre-complete batch 0 so we go straight to parallel
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Bookmarks — parallel test
# [batch:1]
2.1 | List all bookmarks
2.2 | Search bookmarks
2.3 | Bookmark detail view
EOF

# State: 1.1 and 1.2 already done
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

# Init git
cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Create fake claude: creates a unique file per story, commits it, outputs DONE
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
# Extract story ID from prompt
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

# Create a unique file for this story
SLUG=$(echo "$STORY_ID" | tr '.' '-')
mkdir -p src
echo "# Work from story $STORY_ID" > "src/story-${SLUG}.sh"
chmod +x "src/story-${SLUG}.sh"
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

# 1. Exit code 0
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "  PASS: exit code 0"
else
    echo "  FAIL: exit code $EXIT_CODE (expected 0)"
    FAILURES=$((FAILURES + 1))
fi

# 2. All 3 stories in completed_stories
for s in 2.1 2.2 2.3; do
    if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: story $s in completed_stories"
    else
        echo "  FAIL: story $s NOT in completed_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 3. Worktrees cleaned up (directory empty or removed)
if [[ -d ".ralph/worktrees" ]]; then
    WT_COUNT=$(ls -1 ".ralph/worktrees/" 2>/dev/null | grep -c "story-" || true)
    if [[ "$WT_COUNT" -eq 0 ]]; then
        echo "  PASS: worktrees cleaned up"
    else
        echo "  FAIL: $WT_COUNT worktree directories remain"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo "  PASS: worktrees directory removed"
fi

# 4. No ralph/story-* branches remain
BRANCH_COUNT=$(git branch --list 'ralph/story-*' | wc -l | tr -d ' ')
if [[ "$BRANCH_COUNT" -eq 0 ]]; then
    echo "  PASS: no ralph/story-* branches remain"
else
    echo "  FAIL: $BRANCH_COUNT ralph/story-* branches remain"
    FAILURES=$((FAILURES + 1))
fi

# 5. Git log shows merge commits
MERGE_COUNT=$(git log --oneline --merges | grep -c "merge: story" || true)
if [[ "$MERGE_COUNT" -ge 3 ]]; then
    echo "  PASS: git log has $MERGE_COUNT merge commits"
else
    echo "  FAIL: expected >= 3 merge commits, got $MERGE_COUNT"
    FAILURES=$((FAILURES + 1))
fi

# 6. progress.txt: [DONE] for all 3
for s in 2.1 2.2 2.3; do
    if grep -q "\[DONE\] Story $s" progress.txt 2>/dev/null; then
        echo "  PASS: progress.txt has [DONE] for $s"
    else
        echo "  FAIL: progress.txt missing [DONE] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 7. No lock remains
if [[ ! -f ".ralph/.lock" ]]; then
    echo "  PASS: no .ralph/.lock file remains"
else
    echo "  FAIL: .ralph/.lock still exists"
    FAILURES=$((FAILURES + 1))
fi

# 8. Files from each story exist in working tree (proof of merge)
for s in 2-1 2-2 2-3; do
    if [[ -f "src/story-${s}.sh" ]]; then
        echo "  PASS: src/story-${s}.sh exists (merged)"
    else
        echo "  FAIL: src/story-${s}.sh missing from working tree"
        FAILURES=$((FAILURES + 1))
    fi
done

# 9. stdout: batch results line
if grep -qi "succeeded" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout contains batch results"
else
    echo "  FAIL: stdout missing batch results"
    FAILURES=$((FAILURES + 1))
fi

# 10. stdout: RUN SUMMARY
if grep -q "RUN SUMMARY" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout contains RUN SUMMARY"
else
    echo "  FAIL: stdout missing RUN SUMMARY"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (12 assertions) ==="
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
