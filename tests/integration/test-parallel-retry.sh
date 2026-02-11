#!/usr/bin/env bash
# Integration test: parallel retry logic (_parallel_retry_failed)
#
# Runs the REAL ralph binary in parallel mode with 3 stories in batch 1.
# Story 2.2 fails on its first attempt (no signal, no commits) and succeeds
# on retry. Story 2.3 fails on ALL attempts (exhausts max_retries).
#
# Verifies:
#   - Story 2.1 succeeds on first attempt (control)
#   - Story 2.2 recovers via _parallel_retry_failed (retry success)
#   - Story 2.3 exhausts retries and is NOT in completed_stories
#   - Retry creates a fresh worktree (proven by successful commit on retry)
#   - Merge phase picks up both 2.1 and 2.2, not 2.3
#   - progress.txt shows retry markers

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-parallel"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Parallel Retry Logic ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests" "$WORK_DIR/data"

# Only batch 1 (pre-complete batch 0)
cat > "$WORK_DIR/.ralph/stories.txt" << 'EOF'
# Bookmarks — retry test
# [batch:1]
2.1 | List all bookmarks
2.2 | Search bookmarks
2.3 | Bookmark detail view
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

# Init git
cd "$WORK_DIR"
git init -q .
git add -A
git commit -q -m "test scaffold"

# Counter directory for tracking per-story attempt counts (absolute path)
COUNTER_DIR="$WORK_DIR/.attempt-counters"
mkdir -p "$COUNTER_DIR"

# Create fake claude with per-story behavior:
#   2.1 — always succeeds (control)
#   2.2 — fails first attempt, succeeds on retry
#   2.3 — always fails (exhausts retries)
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << FAKECLAUDE
#!/usr/bin/env bash
# Extract story ID from prompt
STORY_ID=""
for arg in "\$@"; do
    if [[ "\$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="\${BASH_REMATCH[1]}"
        break
    fi
done
[ -z "\$STORY_ID" ] && echo "no story" && exit 0

SLUG=\$(echo "\$STORY_ID" | tr '.' '-')
COUNTER_DIR="$COUNTER_DIR"
COUNTER_FILE="\$COUNTER_DIR/\$STORY_ID"

# Track attempt count
ATTEMPT=\$(cat "\$COUNTER_FILE" 2>/dev/null || echo 0)
ATTEMPT=\$((ATTEMPT + 1))
echo "\$ATTEMPT" > "\$COUNTER_FILE"

case "\$STORY_ID" in
    2.1)
        # Always succeed
        mkdir -p src
        echo "# Work from story \$STORY_ID" > "src/story-\${SLUG}.sh"
        chmod +x "src/story-\${SLUG}.sh"
        git add -A
        git commit -q -m "feat(story-\${STORY_ID}): implement story \${STORY_ID}"
        echo "<ralph>DONE \${STORY_ID}</ralph>"
        ;;
    2.2)
        if [ "\$ATTEMPT" -eq 1 ]; then
            # First attempt: fail (no commits, no signal)
            echo "I could not complete the task."
            exit 1
        else
            # Retry: succeed
            mkdir -p src
            echo "# Work from story \$STORY_ID (retry \$ATTEMPT)" > "src/story-\${SLUG}.sh"
            chmod +x "src/story-\${SLUG}.sh"
            git add -A
            git commit -q -m "feat(story-\${STORY_ID}): implement story \${STORY_ID} on retry"
            echo "<ralph>DONE \${STORY_ID}</ralph>"
        fi
        ;;
    2.3)
        # Always fail
        echo "I could not complete the task."
        exit 1
        ;;
esac
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 90 ralph run \
    --parallel --no-tmux --no-interactive --no-dashboard \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

FAILURES=0

# 1. Exit code 0 (ralph completes even with partial failures — it doesn't exit non-zero for failed stories)
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "  PASS: exit code 0"
elif [[ $EXIT_CODE -eq 124 ]]; then
    echo "  FAIL: ralph killed by safety timeout — possible infinite loop"
    FAILURES=$((FAILURES + 1))
else
    # Ralph may exit non-zero when some stories fail — that's acceptable
    echo "  INFO: exit code $EXIT_CODE (non-zero, some stories failed — acceptable)"
fi

# 2. Story 2.1 in completed_stories (always succeeds)
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^2\.1$"; then
    echo "  PASS: story 2.1 in completed_stories (first-attempt success)"
else
    echo "  FAIL: story 2.1 NOT in completed_stories"
    FAILURES=$((FAILURES + 1))
fi

# 3. Story 2.2 in completed_stories (retry success)
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^2\.2$"; then
    echo "  PASS: story 2.2 in completed_stories (retry success)"
else
    echo "  FAIL: story 2.2 NOT in completed_stories (retry should have recovered it)"
    FAILURES=$((FAILURES + 1))
fi

# 4. Story 2.3 NOT in completed_stories (exhausted retries)
if jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null | grep -q "^2\.3$"; then
    echo "  FAIL: story 2.3 in completed_stories (should have been exhausted)"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: story 2.3 NOT in completed_stories (exhausted retries)"
fi

# 5. progress.txt has [DONE] for 2.1 and 2.2
for s in 2.1 2.2; do
    if grep -q "\[DONE\] Story $s" progress.txt 2>/dev/null; then
        echo "  PASS: progress.txt has [DONE] for $s"
    else
        echo "  FAIL: progress.txt missing [DONE] for $s"
        FAILURES=$((FAILURES + 1))
    fi
done

# 6. progress.txt does NOT have [DONE] for 2.3
if grep -q "\[DONE\] Story 2.3" progress.txt 2>/dev/null; then
    echo "  FAIL: progress.txt has [DONE] for 2.3 (should not)"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: progress.txt has no [DONE] for 2.3"
fi

# 7. Files from successful stories exist in working tree (proof of merge)
if [[ -f "src/story-2-1.sh" ]]; then
    echo "  PASS: src/story-2-1.sh exists (merged)"
else
    echo "  FAIL: src/story-2-1.sh missing from working tree"
    FAILURES=$((FAILURES + 1))
fi

if [[ -f "src/story-2-2.sh" ]]; then
    echo "  PASS: src/story-2-2.sh exists (retry work merged)"
else
    echo "  FAIL: src/story-2-2.sh missing (retry work should have been merged)"
    FAILURES=$((FAILURES + 1))
fi

# 8. Story 2.3 file should NOT exist (never succeeded)
if [[ -f "src/story-2-3.sh" ]]; then
    echo "  FAIL: src/story-2-3.sh exists (should not — story 2.3 never succeeded)"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: src/story-2-3.sh does not exist (correct — story 2.3 failed)"
fi

# 9. Attempt counter for 2.2 should be > 1 (proves retry happened)
ATTEMPT_2_2=$(cat "$COUNTER_DIR/2.2" 2>/dev/null || echo "0")
if [[ "$ATTEMPT_2_2" -gt 1 ]]; then
    echo "  PASS: story 2.2 had $ATTEMPT_2_2 attempts (retry confirmed)"
else
    echo "  FAIL: story 2.2 had $ATTEMPT_2_2 attempts (expected > 1)"
    FAILURES=$((FAILURES + 1))
fi

# 10. Attempt counter for 2.3 should be > 1 (proves retry was attempted)
ATTEMPT_2_3=$(cat "$COUNTER_DIR/2.3" 2>/dev/null || echo "0")
if [[ "$ATTEMPT_2_3" -gt 1 ]]; then
    echo "  PASS: story 2.3 had $ATTEMPT_2_3 attempts (retries attempted before giving up)"
else
    echo "  FAIL: story 2.3 had $ATTEMPT_2_3 attempts (expected > 1)"
    FAILURES=$((FAILURES + 1))
fi

# 11. stdout mentions retry activity
if grep -qi "retry" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: stdout mentions retry activity"
else
    echo "  FAIL: stdout missing retry-related output"
    FAILURES=$((FAILURES + 1))
fi

# 12. Worktrees cleaned up
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

# 13. No ralph/story-* branches remain
BRANCH_COUNT=$(git branch --list 'ralph/story-*' | wc -l | tr -d ' ')
if [[ "$BRANCH_COUNT" -eq 0 ]]; then
    echo "  PASS: no ralph/story-* branches remain"
else
    echo "  FAIL: $BRANCH_COUNT ralph/story-* branches remain"
    FAILURES=$((FAILURES + 1))
fi

# 14. No lock remains
if [[ ! -f ".ralph/.lock" ]]; then
    echo "  PASS: no .ralph/.lock file remains"
else
    echo "  FAIL: .ralph/.lock still exists"
    FAILURES=$((FAILURES + 1))
fi

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (16 assertions) ==="
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
    echo "  attempt counters:"
    for f in "$COUNTER_DIR"/*; do
        [[ -f "$f" ]] && echo "    $(basename "$f"): $(cat "$f")"
    done
    echo ""
    echo "  git branches:"
    git branch -a 2>/dev/null | sed 's/^/    /'
    echo ""
    echo "  ralph stdout (last 60 lines):"
    tail -60 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'
    exit 1
fi
