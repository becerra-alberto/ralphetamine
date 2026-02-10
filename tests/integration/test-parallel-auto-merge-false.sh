#!/usr/bin/env bash
# Integration test: parallel with auto_merge=false
#
# 2 stories in [batch:1], config has auto_merge=false.
# Mock claude emits DONE for both.
#
# Expected: Both stories completed in state, worktrees preserved,
# branches preserved, no merge commits.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Parallel Auto-Merge False ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Only 2 stories in batch 1
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Auto-merge false test
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

# Override config to disable auto_merge
# NOTE: Must use string "false" not boolean false, because config_get uses
# jq's '// empty' which treats boolean false as falsy → falls back to default "true"
jq '.parallel.auto_merge = "false"' "$WORK_DIR/.ralph/config.json" > "$WORK_DIR/.ralph/config-tmp.json" \
    && mv "$WORK_DIR/.ralph/config-tmp.json" "$WORK_DIR/.ralph/config.json"

cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Count merge commits at baseline
BASELINE_MERGES=$(git log --oneline --merges 2>/dev/null | wc -l | tr -d ' ')

# Fake claude: commits and outputs DONE for each story
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

# 2. ralph/story-* branches preserved
for s in 2.1 2.2; do
    if git rev-parse --verify "ralph/story-$s" &>/dev/null; then
        echo "  PASS: branch ralph/story-$s preserved"
    else
        echo "  FAIL: branch ralph/story-$s missing"
        FAILURES=$((FAILURES + 1))
    fi
done

# 3. No new merge commits (baseline vs now)
CURRENT_MERGES=$(git log --oneline --merges 2>/dev/null | wc -l | tr -d ' ')
if [[ "$CURRENT_MERGES" -eq "$BASELINE_MERGES" ]]; then
    echo "  PASS: no merge commits (auto_merge=false)"
else
    echo "  FAIL: $((CURRENT_MERGES - BASELINE_MERGES)) new merge commits"
    FAILURES=$((FAILURES + 1))
fi

# 4. stdout mentions auto-merge disabled or worktrees
if grep -qi "auto.merge disabled\|worktrees at\|Worktrees" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout mentions auto-merge disabled or worktrees"
else
    echo "  FAIL: stdout missing auto-merge disabled message"
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
