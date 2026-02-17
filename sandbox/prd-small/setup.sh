#!/usr/bin/env bash
# setup.sh — Initialize the "prd-small" sandbox
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .git ]; then
    git init
    git checkout -b main
fi

mkdir -p tasks specs .ralph

git add -A
git commit -m "initial: prd-small sandbox setup" --allow-empty
echo "✓ prd-small sandbox ready"
