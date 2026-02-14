#!/usr/bin/env bash
# Integration test: pre_worktree hook in parallel execution
#
# Runs the REAL ralph binary in parallel mode with a pre_worktree hook configured.
# Stories 2.1, 2.2, 2.3 are in [batch:1].
# The hook succeeds for stories 2.1 and 2.2 but exits 1 for story 2.3.
# Assertions:
#   - 2.1 and 2.2 complete and merge
#   - 2.3 is skipped (hook failure)
#   - Hook ran for all 3 (marker files prove it)
#   - Ralph output logs the hook failure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: pre_worktree Hook ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox structure
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Marker dir for hook tracking (outside worktree, absolute path)
MARKER_DIR="$WORK_DIR/.hook-markers"
mkdir -p "$MARKER_DIR"

# Stories.txt: only batch 1
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Bookmarks — pre_worktree hook test
# [batch:1]
2.1 | List all bookmarks
2.2 | Search bookmarks
2.3 | Bookmark detail view
EOF

# Config: pre_worktree hook that succeeds for 2.1/2.2, fails for 2.3
# The hook creates marker files and conditionally exits 1
cat > "$WORK_DIR/.ralph/config.json" << CONFIGEOF
{
    "version": "2.4.0",
    "project": { "name": "bookmarks" },
    "specs": {
        "pattern": "specs/epic-{{epic}}/story-{{id}}-*.md",
        "id_format": "epic.story",
        "frontmatter_status_field": "status"
    },
    "loop": {
        "max_iterations": 0,
        "timeout_seconds": 600,
        "max_retries": 0
    },
    "claude": {
        "flags": ["--print", "--dangerously-skip-permissions"]
    },
    "commit": {
        "format": "feat(story-{{id}}): {{title}}",
        "auto_commit": true
    },
    "learnings": { "enabled": true, "max_inject_count": 5 },
    "parallel": {
        "enabled": true,
        "max_concurrent": 3,
        "strategy": "worktree",
        "auto_merge": true,
        "merge_review_timeout": 900,
        "stagger_seconds": 1
    },
    "postmortem": { "enabled": false },
    "decomposition": { "enabled": false },
    "caffeine": false,
    "hooks": {
        "pre_worktree": "touch ${MARKER_DIR}/hook-ran-\$RALPH_STORY; if [ \"\$RALPH_STORY\" = \"2.3\" ]; then exit 1; fi",
        "pre_worktree_timeout": 30
    }
}
CONFIGEOF

# State: batch 0 stories pre-completed
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

# Fake claude: creates a file, commits, outputs DONE
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

# 1. Stories 2.1 and 2.2 in completed_stories
for s in 2.1 2.2; do
    if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^${s}$"; then
        echo "  PASS: story $s in completed_stories"
    else
        echo "  FAIL: story $s NOT in completed_stories"
        FAILURES=$((FAILURES + 1))
    fi
done

# 2. Story 2.3 NOT in completed_stories (hook failed)
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^2\.3$"; then
    echo "  FAIL: story 2.3 in completed_stories (should have been skipped)"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: story 2.3 NOT in completed_stories (hook failure skipped it)"
fi

# 3. Hook marker files exist for all 3 stories (proves hook ran)
for s in 2.1 2.2 2.3; do
    if [[ -f "$MARKER_DIR/hook-ran-$s" ]]; then
        echo "  PASS: hook marker exists for story $s"
    else
        echo "  FAIL: hook marker missing for story $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 4. Files from stories 2.1 and 2.2 exist (merged)
for s in 2-1 2-2; do
    if [[ -f "src/story-${s}.sh" ]]; then
        echo "  PASS: src/story-${s}.sh exists (merged)"
    else
        echo "  FAIL: src/story-${s}.sh missing from working tree"
        FAILURES=$((FAILURES + 1))
    fi
done

# 5. File from story 2.3 does NOT exist (never ran)
if [[ -f "src/story-2-3.sh" ]]; then
    echo "  FAIL: src/story-2-3.sh exists (should not — hook failed)"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: src/story-2-3.sh does not exist (hook prevented execution)"
fi

# 6. Ralph output mentions hook failure
if grep -qi "pre_worktree hook failed" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout logs hook failure"
else
    echo "  FAIL: stdout missing hook failure message"
    FAILURES=$((FAILURES + 1))
fi

# 7. progress.txt has [DONE] for 2.1 and 2.2
for s in 2.1 2.2; do
    if grep -q "\[DONE\] Story $s" progress.txt 2>/dev/null; then
        echo "  PASS: progress.txt has [DONE] for $s"
    else
        echo "  FAIL: progress.txt missing [DONE] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 8. Worktrees cleaned up
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

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (13 assertions) ==="
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
    echo "  hook markers:"
    ls -la "$MARKER_DIR"/ 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 40 lines):"
    tail -40 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
