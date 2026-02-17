#!/usr/bin/env bash
# setup.sh — Initialize the "idea" sandbox
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .git ]; then
    git init
    git checkout -b main
fi

mkdir -p tasks
echo '{}' > .gitkeep-tasks 2>/dev/null || true

git add -A
git commit -m "initial: idea sandbox setup" --allow-empty
echo "✓ idea sandbox ready"
