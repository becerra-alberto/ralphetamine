#!/usr/bin/env bash
# setup.sh — Initialize the "prd-large" sandbox
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .git ]; then
    git init
    git checkout -b main
fi

mkdir -p tasks specs .ralph

git add -A
git commit -m "initial: prd-large sandbox setup" --allow-empty
echo "✓ prd-large sandbox ready"
