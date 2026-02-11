#!/usr/bin/env bash
# Integration test: verify decomposition depth guard prevents infinite nesting
#
# Creates a story at depth 2 (four-level ID: 1.1.1.1) and verifies
# that `ralph decompose` refuses to decompose it further.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

# ── Setup ──────────────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Decomposition Depth Guard ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox project
cp -R "$SANDBOX_SRC/.ralph" "$WORK_DIR/.ralph"
cp -R "$SANDBOX_SRC/specs" "$WORK_DIR/specs"
cp    "$SANDBOX_SRC/CLAUDE.md" "$WORK_DIR/CLAUDE.md"
mkdir -p "$WORK_DIR/src" "$WORK_DIR/tests"

# Fresh state with decomposed_stories field
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": ["1.1", "1.1.1"],
    "absorbed_stories": {},
    "merged_stories": [],
    "decomposed_stories": {
        "1.1": ["1.1.1", "1.1.2"],
        "1.1.1": ["1.1.1.1", "1.1.1.2"]
    },
    "current_story": null,
    "retry_count": 0
}
EOF
: > "$WORK_DIR/progress.txt"
mkdir -p "$WORK_DIR/.ralph/learnings"
echo '{}' > "$WORK_DIR/.ralph/learnings/_index.json"

# Set max_depth to 2 (default)
jq '.decomposition = {"enabled": true, "max_depth": 2, "timeout_seconds": 10}' \
    "$WORK_DIR/.ralph/config.json" > "$WORK_DIR/.ralph/config.json.tmp" \
    && mv "$WORK_DIR/.ralph/config.json.tmp" "$WORK_DIR/.ralph/config.json"

# Add the four-level story and its spec
cat >> "$WORK_DIR/.ralph/stories.txt" << 'EOF'
1.1.1.1 | Deep sub-story
EOF

mkdir -p "$WORK_DIR/specs/epic-1"
cat > "$WORK_DIR/specs/epic-1/story-1.1.1.1-deep.md" << 'EOF'
---
id: "1.1.1.1"
title: "Deep Sub-Story"
status: "pending"
---
# Deep Sub-Story
## Acceptance Criteria
- [ ] Something works
EOF

# Init git repo
git -C "$WORK_DIR" init -q
git -C "$WORK_DIR" config user.name "Test"
git -C "$WORK_DIR" config user.email "test@test.com"
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -q -m "test scaffold"

# ── Run ralph decompose on the deep story ────────────────────────────
cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

RALPH_OUTPUT="$WORK_DIR/ralph-stdout.txt"
EXIT_CODE=0
$TIMEOUT_CMD 15 ralph decompose 1.1.1.1 \
    > "$RALPH_OUTPUT" 2>&1 || EXIT_CODE=$?

echo ""
echo "=== Results ==="
echo "  Exit code: $EXIT_CODE"

# ── Assertions ─────────────────────────────────────────────────────────────
FAILURES=0

# 1. ralph should have exited non-zero (decomposition refused)
if [[ $EXIT_CODE -ne 0 ]]; then
    echo "  PASS: ralph exited with code $EXIT_CODE (decomposition refused)"
else
    echo "  FAIL: ralph exited 0 but decomposition should have been refused"
    FAILURES=$((FAILURES + 1))
fi

# 2. Output should mention depth/max_depth
if grep -qi "depth" "$RALPH_OUTPUT" 2>/dev/null; then
    echo "  PASS: output mentions depth"
else
    echo "  FAIL: output doesn't mention depth"
    FAILURES=$((FAILURES + 1))
fi

# 3. No new spec files should be created for five-level IDs
if ls specs/epic-1/story-1.1.1.1.*.md &>/dev/null 2>&1; then
    echo "  FAIL: found unexpected five-level spec files"
    FAILURES=$((FAILURES + 1))
else
    echo "  PASS: no five-level spec files created"
fi

echo ""
echo "  ralph stdout:"
cat "$RALPH_OUTPUT" 2>/dev/null | sed 's/^/    /'

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
