#!/usr/bin/env bash
# Integration test: parallel tentative success (commit-based fallback)
#
# Story A: claude outputs DONE + commit (normal success)
# Story B: claude creates commit but exits 0 with no signal (tentative)
# Both should end up in completed_stories with the correct outcome types.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Parallel Tentative Success ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Only 2 stories in batch 1
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Tentative test
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

cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Fake claude: 2.1 outputs DONE + commit, 2.2 commits but NO signal
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
STORY_ID=""
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "$STORY_ID" ] && echo "no story" && exit 0

SLUG=$(echo "$STORY_ID" | tr '.' '-')
mkdir -p src
echo "# Work from story $STORY_ID" > "src/story-${SLUG}.sh"
git add -A
git commit -q -m "feat(story-${STORY_ID}): implement story ${STORY_ID}"

if [[ "$STORY_ID" == "2.1" ]]; then
    echo "<ralph>DONE ${STORY_ID}</ralph>"
else
    # Story 2.2: no DONE signal, just exit 0 with commits
    echo "Implementation complete, all tests pass."
fi
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

# 2. progress.txt: story 2.2 has "tentative" marker
if grep -q "tentative" progress.txt 2>/dev/null; then
    echo "  PASS: progress.txt has tentative marker"
else
    echo "  FAIL: progress.txt missing tentative marker"
    FAILURES=$((FAILURES + 1))
fi

# 3. Both branches merged into main
for s in 2-1 2-2; do
    if [[ -f "src/story-${s}.sh" ]]; then
        echo "  PASS: src/story-${s}.sh exists (merged)"
    else
        echo "  FAIL: src/story-${s}.sh missing from working tree"
        FAILURES=$((FAILURES + 1))
    fi
done

# 4. Worktrees cleaned up
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

# 5. stdout mentions tentative success
if grep -qi "tentative" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout mentions tentative success"
else
    echo "  FAIL: stdout missing tentative mention"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (7 assertions) ==="
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
    echo "  ralph stdout (last 40 lines):"
    tail -40 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
