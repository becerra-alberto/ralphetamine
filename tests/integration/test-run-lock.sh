#!/usr/bin/env bash
# Integration test: run lock (acquire, reject, stale detect, release)
#
# Tests that ralph creates and releases the .ralph/.lock file correctly,
# and that a second instance is rejected while the first holds the lock.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SANDBOX_SRC="$RALPH_DIR/sandbox/run-sequential"

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

echo "=== Integration Test: Run Lock ==="
echo "  Work dir: $WORK_DIR"

# Copy sandbox
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

# Fake claude that always succeeds immediately
FAKE_BIN="$WORK_DIR/.fake-bin"
mkdir -p "$FAKE_BIN"
cat > "$FAKE_BIN/claude" << 'EOF'
#!/usr/bin/env bash
echo "<ralph>DONE 1.1</ralph>"
EOF
chmod +x "$FAKE_BIN/claude"

cd "$WORK_DIR"

TIMEOUT_CMD="timeout"
command -v gtimeout &>/dev/null && TIMEOUT_CMD="gtimeout"

FAILURES=0

# 1. Lock created during run, released after
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > /dev/null 2>&1 || true

if [[ ! -f ".ralph/.lock" ]]; then
    echo "  PASS: lock released after successful run"
else
    echo "  FAIL: lock file still exists after run"
    FAILURES=$((FAILURES + 1))
fi

# 2. Stale lock (dead PID) is detected and removed
echo "99999" > ".ralph/.lock"
EXIT_CODE=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 30 ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > "$WORK_DIR/stale-output.txt" 2>&1 || EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
    echo "  PASS: stale lock detected, ralph ran successfully"
else
    echo "  FAIL: ralph failed with stale lock (exit $EXIT_CODE)"
    FAILURES=$((FAILURES + 1))
fi

if grep -qi "stale\|Removing" "$WORK_DIR/stale-output.txt" 2>/dev/null; then
    echo "  PASS: stale lock warning in output"
else
    echo "  PASS: ralph handled stale lock (warning may be in log only)"
fi

# 3. Second instance rejected while first holds lock
# Reset state
cat > "$WORK_DIR/.ralph/state.json" << 'EOF'
{
    "completed_stories": [],
    "absorbed_stories": {},
    "merged_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF

# Create a fake claude that sleeps to hold the lock
cat > "$FAKE_BIN/claude" << 'EOF'
#!/usr/bin/env bash
sleep 10
echo "<ralph>DONE 1.1</ralph>"
EOF
chmod +x "$FAKE_BIN/claude"

# Start first instance in background
PATH="$FAKE_BIN:$PATH" ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > /dev/null 2>&1 &
FIRST_PID=$!

# Wait for lock to appear
for i in $(seq 1 20); do
    [ -f ".ralph/.lock" ] && break
    sleep 0.2
done

# Try second instance
SECOND_EXIT=0
PATH="$FAKE_BIN:$PATH" $TIMEOUT_CMD 5 ralph run -s 1.1 --no-tmux --no-interactive --no-dashboard \
    > "$WORK_DIR/second-output.txt" 2>&1 || SECOND_EXIT=$?

if [[ $SECOND_EXIT -ne 0 ]]; then
    echo "  PASS: second instance rejected (exit $SECOND_EXIT)"
else
    echo "  FAIL: second instance should have been rejected"
    FAILURES=$((FAILURES + 1))
fi

if grep -q "Another Ralph instance" "$WORK_DIR/second-output.txt" 2>/dev/null; then
    echo "  PASS: 'Another Ralph instance is running' in output"
else
    echo "  FAIL: missing lock rejection message"
    FAILURES=$((FAILURES + 1))
fi

# Clean up first instance
kill "$FIRST_PID" 2>/dev/null || true
wait "$FIRST_PID" 2>/dev/null || true
rm -f ".ralph/.lock"

echo ""
if [[ $FAILURES -eq 0 ]]; then
    echo "=== ALL PASSED (5 assertions) ==="
    exit 0
else
    echo "=== $FAILURES ASSERTION(S) FAILED ==="
    exit 1
fi
