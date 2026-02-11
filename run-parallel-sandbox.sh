#!/usr/bin/env bash
# run-parallel-sandbox.sh — Run ralph parallel on a sandbox copy (outside CC)
set -euo pipefail

RALPH_DIR="$(cd "$(dirname "$0")" && pwd)"
SANDBOX="$RALPH_DIR/sandbox/run-parallel"
WORKDIR=$(mktemp -d)

echo "=== Ralph Parallel Sandbox Test ==="
echo "  Ralph:   $RALPH_DIR"
echo "  Sandbox: $SANDBOX"
echo "  Workdir: $WORKDIR"
echo ""

# Copy sandbox to temp dir
cp -R "$SANDBOX"/ "$WORKDIR"/

cd "$WORKDIR"

# Initialize git if needed and reset state
if [ ! -d .git ]; then
    git init -b main
    git add -A
    git commit -m "initial: sandbox setup"
fi

# Reset state cleanly
bash reset.sh

# Commit clean state so worktrees have a clean base
git add -A
git commit -m "reset: clean state for parallel run" --allow-empty

echo ""
echo "=== Starting ralph run --parallel ==="
echo ""

# Run ralph
"$RALPH_DIR/bin/ralph" run --parallel --no-tmux --no-interactive 2>&1 | tee "$WORKDIR/ralph-output.txt"
exit_code=${PIPESTATUS[0]}

echo ""
echo "=== Run Complete (exit code: $exit_code) ==="
echo "  Output saved to: $WORKDIR/ralph-output.txt"
echo "  State:  $(cat .ralph/state.json)"
echo "  Workdir: $WORKDIR"
