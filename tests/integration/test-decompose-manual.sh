#!/usr/bin/env bash
# Integration test: manual decomposition via `ralph decompose <story-id>`
#
# Uses a fake claude that outputs substory blocks.
# Expected: spec files created, stories.txt updated, state marks parent as decomposed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup: copy sandbox to a temp dir ──────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Manual Decomposition ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox project
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
    "decomposed_stories": {},
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Enable decomposition
jq '.decomposition = {"enabled": true, "max_depth": 2, "timeout_seconds": 10}' \
    "$WORK_DIR/.ralph/config.json" > "$WORK_DIR/.ralph/config.json.tmp" \
    && mv "$WORK_DIR/.ralph/config.json.tmp" "$WORK_DIR/.ralph/config.json"

# Init git repo
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" config user.name "Test"
git -C "$WORK_DIR" config user.email "test@test.com"
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold"

# ── Create fake claude that outputs substory blocks ──────────────────
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"

cat > "$FAKE_BIN/claude" << 'FAKECLAUDE'
#!/usr/bin/env bash
echo "Analyzing story for decomposition..."
echo ""
echo "<ralph>SUBSTORY_START 1.1.1</ralph>"
echo "---"
echo 'id: "1.1.1"'
echo 'title: "Create base greeting function"'
echo 'status: "pending"'
echo "depends_on: []"
echo "---"
echo ""
echo "# Create base greeting function"
echo ""
echo "## Context"
echo "Create the basic greeting function."
echo ""
echo "## Acceptance Criteria"
echo "- [ ] Function exists and returns a string"
echo "<ralph>SUBSTORY_END 1.1.1</ralph>"
echo ""
echo "<ralph>SUBSTORY_START 1.1.2</ralph>"
echo "---"
echo 'id: "1.1.2"'
echo 'title: "Add CLI argument handling"'
echo 'status: "pending"'
echo "depends_on: []"
echo "---"
echo ""
echo "# Add CLI argument handling"
echo ""
echo "## Context"
echo "Add argument parsing to the script."
echo ""
echo "## Acceptance Criteria"
echo "- [ ] Script accepts name argument"
echo "<ralph>SUBSTORY_END 1.1.2</ralph>"
echo ""
echo "<ralph>DECOMPOSE_DONE 1.1: 2 sub-stories</ralph>"
FAKECLAUDE
chmod +x "$FAKE_BIN/claude"

# Mock gtimeout/timeout
cat > "$FAKE_BIN/gtimeout" << 'FAKETIMEOUT'
#!/usr/bin/env bash
shift  # skip the timeout value
"$@"
FAKETIMEOUT
chmod +x "$FAKE_BIN/gtimeout"

# ── Run ralph decompose ─────────────────────────────────────────────────
echo "  Running: ralph decompose 1.1"
echo ""

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph decompose 1.1 \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

# ── Assertions ─────────────────────────────────────────────────────────────
FAILURES=0

# 1. ralph should have exited 0 (decomposition succeeded)
if [[ $EXIT_CODE -eq 0 ]]; then
    echo "  PASS: ralph exited with code 0"
else
    echo "  FAIL: ralph exited with code $EXIT_CODE"
    FAILURES=$((FAILURES + 1))
fi

# 2. Spec files should be created
if ls specs/epic-1/story-1.1.1-*.md &>/dev/null; then
    echo "  PASS: spec file for 1.1.1 exists"
else
    echo "  FAIL: spec file for 1.1.1 not found"
    echo "    specs/epic-1/ contents:"
    ls -la specs/epic-1/ 2>/dev/null | sed 's/^/    /'
    FAILURES=$((FAILURES + 1))
fi

if ls specs/epic-1/story-1.1.2-*.md &>/dev/null; then
    echo "  PASS: spec file for 1.1.2 exists"
else
    echo "  FAIL: spec file for 1.1.2 not found"
    FAILURES=$((FAILURES + 1))
fi

# 3. stories.txt should have sub-stories inserted after parent
if grep -q "1.1.1" .ralph/stories.txt; then
    echo "  PASS: stories.txt contains 1.1.1"
else
    echo "  FAIL: stories.txt missing 1.1.1"
    FAILURES=$((FAILURES + 1))
fi

if grep -q "1.1.2" .ralph/stories.txt; then
    echo "  PASS: stories.txt contains 1.1.2"
else
    echo "  FAIL: stories.txt missing 1.1.2"
    FAILURES=$((FAILURES + 1))
fi

# 4. State should mark parent as decomposed
if jq -e '.decomposed_stories["1.1"]' .ralph/state.json &>/dev/null; then
    echo "  PASS: state.json marks 1.1 as decomposed"
else
    echo "  FAIL: state.json missing decomposed entry for 1.1"
    FAILURES=$((FAILURES + 1))
fi

# 5. Parent should be in completed_stories
if jq -e '.completed_stories[] | select(. == "1.1")' .ralph/state.json &>/dev/null; then
    echo "  PASS: state.json marks 1.1 as completed"
else
    echo "  FAIL: state.json doesn't have 1.1 in completed_stories"
    FAILURES=$((FAILURES + 1))
fi

# 6. progress.txt should have DECOMPOSED entry
if grep -q "DECOMPOSED" progress.txt 2>/dev/null; then
    echo "  PASS: progress.txt has DECOMPOSED entry"
else
    echo "  FAIL: progress.txt missing DECOMPOSED entry"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "  stories.txt:"
cat "$WORK_DIR/.ralph/stories.txt" 2>/dev/null | sed 's/^/    /'
echo ""
echo "  state.json (decomposed):"
jq '.decomposed_stories' "$WORK_DIR/.ralph/state.json" 2>/dev/null | sed 's/^/    /'
echo ""
echo "  ralph stdout (last 20 lines):"
tail -20 "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
