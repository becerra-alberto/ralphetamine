#!/usr/bin/env bash
# Integration test: multi-batch parallel execution (batch 0 → batch 1 → batch 2)
#
# Runs the REAL ralph binary in parallel mode with 3 batches:
#   batch 0: stories 1.1, 1.2 — run sequentially (foundation)
#   batch 1: stories 2.1, 2.2, 2.3 — run in parallel via worktrees
#   batch 2: story 3.1 — run sequentially (depends on batch 1)
#
# Verifies that batches execute in order, all stories complete, and merge
# produces a linear history with all work present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Multi-Batch Parallel Execution ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data" "$WORK_DIR/bin"

# Full stories.txt: 3 batches
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Bookmarks — multi-batch test
# [batch:0]
1.1 | Initialize schema and data store
1.2 | Seed sample data

# [batch:1]
2.1 | List all bookmarks
2.2 | Search bookmarks
2.3 | Bookmark detail view

# [batch:2]
3.1 | CLI interface and dispatcher
EOF

# Fresh state — nothing completed
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

# Create fake claude: creates a unique file per story, commits it, outputs DONE.
# Also writes a timestamp to an order log so we can verify batch ordering.
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

# Log execution order (use absolute path — we may be in a worktree)
ORDER_LOG="${RALPH_MULTI_BATCH_ORDER_LOG:-/tmp/ralph-multi-batch-order.txt}"
echo "$STORY_ID $(date '+%s%N')" >> "$ORDER_LOG"

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

ORDER_LOG="$WORK_DIR/execution-order.txt"
: > "$ORDER_LOG"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
RALPH_MULTI_BATCH_ORDER_LOG="$ORDER_LOG" \
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 90 ralph run \
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

# 2. All 6 stories in completed_stories
for s in 1.1 1.2 2.1 2.2 2.3 3.1; do
    if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: story $s in completed_stories"
    else
        echo "  FAIL: story $s NOT in completed_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 3. progress.txt has [DONE] for all 6
for s in 1.1 1.2 2.1 2.2 2.3 3.1; do
    if grep -q "\[DONE\] Story $s" progress.txt 2>/dev/null; then
        echo "  PASS: progress.txt has [DONE] for $s"
    else
        echo "  FAIL: progress.txt missing [DONE] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 4. Files from all stories exist in working tree
for s in 1-1 1-2 2-1 2-2 2-3 3-1; do
    if [[ -f "src/story-${s}.sh" ]]; then
        echo "  PASS: src/story-${s}.sh exists (merged)"
    else
        echo "  FAIL: src/story-${s}.sh missing from working tree"
        FAILURES=$((FAILURES + 1))
    fi
done

# 5. Batch ordering: use line numbers in the order log (stories are appended
#    when they START, so line order = execution start order)
if [[ -s "$ORDER_LOG" ]]; then
    # Extract the max line number per batch (last story to start)
    BATCH0_LAST_LINE=0
    BATCH1_FIRST_LINE=999999
    BATCH1_LAST_LINE=0
    BATCH2_FIRST_LINE=999999

    LINE_NUM=0
    while read -r sid _ts; do
        LINE_NUM=$((LINE_NUM + 1))
        case "$sid" in
            1.1|1.2)
                [[ "$LINE_NUM" -gt "$BATCH0_LAST_LINE" ]] && BATCH0_LAST_LINE="$LINE_NUM"
                ;;
            2.1|2.2|2.3)
                [[ "$LINE_NUM" -lt "$BATCH1_FIRST_LINE" ]] && BATCH1_FIRST_LINE="$LINE_NUM"
                [[ "$LINE_NUM" -gt "$BATCH1_LAST_LINE" ]] && BATCH1_LAST_LINE="$LINE_NUM"
                ;;
            3.1)
                [[ "$LINE_NUM" -lt "$BATCH2_FIRST_LINE" ]] && BATCH2_FIRST_LINE="$LINE_NUM"
                ;;
        esac
    done < "$ORDER_LOG"

    if [[ "$BATCH0_LAST_LINE" -lt "$BATCH1_FIRST_LINE" ]]; then
        echo "  PASS: batch 0 completed before batch 1 started"
    else
        echo "  FAIL: batch 0 last line=$BATCH0_LAST_LINE but batch 1 first line=$BATCH1_FIRST_LINE (ordering violated)"
        FAILURES=$((FAILURES + 1))
    fi

    if [[ "$BATCH1_LAST_LINE" -lt "$BATCH2_FIRST_LINE" ]]; then
        echo "  PASS: batch 1 completed before batch 2 started"
    else
        echo "  FAIL: batch 1 last line=$BATCH1_LAST_LINE but batch 2 first line=$BATCH2_FIRST_LINE (ordering violated)"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo "  SKIP: execution order log empty (cannot verify batch ordering)"
fi

# 6. Worktrees cleaned up
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

# 7. No ralph/story-* branches remain
BRANCH_COUNT=$(git branch --list 'ralph/story-*' | wc -l | tr -d ' ')
if [[ "$BRANCH_COUNT" -eq 0 ]]; then
    echo "  PASS: no ralph/story-* branches remain"
else
    echo "  FAIL: $BRANCH_COUNT ralph/story-* branches remain"
    FAILURES=$((FAILURES + 1))
fi

# 8. Git log shows merge commits from batch 1 (parallel stories get --no-ff merges)
MERGE_COUNT=$(git log --oneline --merges | grep -c "merge: story" || true)
if [[ "$MERGE_COUNT" -ge 3 ]]; then
    echo "  PASS: git log has $MERGE_COUNT merge commits (batch 1 parallel merges)"
else
    echo "  FAIL: expected >= 3 merge commits from batch 1, got $MERGE_COUNT"
    FAILURES=$((FAILURES + 1))
fi

# 9. stdout contains RUN SUMMARY
if grep -q "RUN SUMMARY" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout contains RUN SUMMARY"
else
    echo "  FAIL: stdout missing RUN SUMMARY"
    FAILURES=$((FAILURES + 1))
fi

# 10. No lock remains
if [[ ! -f ".ralph/.lock" ]]; then
    echo "  PASS: no .ralph/.lock file remains"
else
    echo "  FAIL: .ralph/.lock still exists"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    TOTAL_ASSERTIONS=$((6 + 6 + 6 + 2 + 1 + 1 + 1 + 1 + 1))  # 25
    echo "=== ALL PASSED ($TOTAL_ASSERTIONS assertions) ==="
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
    echo "  execution order:"
    cat "$ORDER_LOG" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  git log:"
    git log --oneline 2>/dev/null | head -20 | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 50 lines):"
    tail -50 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
