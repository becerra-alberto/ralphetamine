#!/usr/bin/env bash
# Integration test: lifecycle hooks (M3)
#
# Verifies that pre_story and post_story hooks fire with correct
# environment variables (RALPH_STORY, RALPH_RESULT, RALPH_SPEC)
# through the real ralph binary.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Lifecycle Hooks ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Create hook scripts that log env vars to a file
HOOK_LOG="$WORK_DIR/.hook-log"
: > "$HOOK_LOG"

cat > "$WORK_DIR/.pre-story-hook.sh" << HOOK
#!/usr/bin/env bash
echo "PRE_STORY:RALPH_STORY=\${RALPH_STORY:-unset}:RALPH_SPEC=\${RALPH_SPEC:-unset}" >> "$HOOK_LOG"
HOOK
chmod +x "$WORK_DIR/.pre-story-hook.sh"

cat > "$WORK_DIR/.post-story-hook.sh" << HOOK
#!/usr/bin/env bash
echo "POST_STORY:RALPH_STORY=\${RALPH_STORY:-unset}:RALPH_RESULT=\${RALPH_RESULT:-unset}" >> "$HOOK_LOG"
HOOK
chmod +x "$WORK_DIR/.post-story-hook.sh"

# Configure hooks in config.json
jq --arg pre "bash $WORK_DIR/.pre-story-hook.sh" \
   --arg post "bash $WORK_DIR/.post-story-hook.sh" \
   '.hooks.pre_story = $pre | .hooks.post_story = $post' \
   "$WORK_DIR/.ralph/config.json" > "$WORK_DIR/.ralph/config.json.tmp" \
   && mv "$WORK_DIR/.ralph/config.json.tmp" "$WORK_DIR/.ralph/config.json"

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
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold" --allow-empty

# Create fake claude
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
echo "<ralph>DONE ${STORY_ID}</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# Run ralph for story 1.1 only
cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run \
    -s 1.1 --no-tmux --no-interactive --no-dashboard \
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

# 2. pre_story hook fired
if grep -q "^PRE_STORY:" "$HOOK_LOG" 2>/dev/null; then
    echo "  PASS: pre_story hook fired"
else
    echo "  FAIL: pre_story hook did not fire"
    FAILURES=$((FAILURES + 1))
fi

# 3. pre_story hook received RALPH_STORY=1.1
if grep -q "PRE_STORY:RALPH_STORY=1.1:" "$HOOK_LOG" 2>/dev/null; then
    echo "  PASS: pre_story hook received RALPH_STORY=1.1"
else
    echo "  FAIL: pre_story hook missing RALPH_STORY=1.1"
    FAILURES=$((FAILURES + 1))
fi

# 4. pre_story hook received RALPH_SPEC with spec path
if grep -q "RALPH_SPEC=specs/epic-1/story-1.1" "$HOOK_LOG" 2>/dev/null; then
    echo "  PASS: pre_story hook received RALPH_SPEC"
else
    echo "  FAIL: pre_story hook missing RALPH_SPEC"
    FAILURES=$((FAILURES + 1))
fi

# 5. post_story hook fired
if grep -q "^POST_STORY:" "$HOOK_LOG" 2>/dev/null; then
    echo "  PASS: post_story hook fired"
else
    echo "  FAIL: post_story hook did not fire"
    FAILURES=$((FAILURES + 1))
fi

# 6. post_story hook received RALPH_STORY=1.1
if grep -q "POST_STORY:RALPH_STORY=1.1:" "$HOOK_LOG" 2>/dev/null; then
    echo "  PASS: post_story hook received RALPH_STORY=1.1"
else
    echo "  FAIL: post_story hook missing RALPH_STORY=1.1"
    FAILURES=$((FAILURES + 1))
fi

# 7. post_story hook received RALPH_RESULT=done
if grep -q "RALPH_RESULT=done" "$HOOK_LOG" 2>/dev/null; then
    echo "  PASS: post_story hook received RALPH_RESULT=done"
else
    echo "  FAIL: post_story hook missing RALPH_RESULT=done"
    FAILURES=$((FAILURES + 1))
fi

# 8. pre_story fired BEFORE post_story (ordering)
PRE_LINE=$(grep -n "^PRE_STORY:" "$HOOK_LOG" 2>/dev/null | head -1 | cut -d: -f1)
POST_LINE=$(grep -n "^POST_STORY:" "$HOOK_LOG" 2>/dev/null | head -1 | cut -d: -f1)
if [[ -n "$PRE_LINE" && -n "$POST_LINE" && "$PRE_LINE" -lt "$POST_LINE" ]]; then
    echo "  PASS: pre_story fired before post_story"
else
    echo "  FAIL: hook ordering incorrect (pre=$PRE_LINE, post=$POST_LINE)"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (8 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    echo ""
    echo "  hook log:"
    cat "$HOOK_LOG" 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 20 lines):"
    tail -20 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
