#!/usr/bin/env bash
# reset.sh — Reset the "prd-small" sandbox to clean state
set -euo pipefail
cd "$(dirname "$0")"

# Remove generated specs and ralph state
rm -rf specs/*
rm -f .ralph/stories.txt .ralph/manifest.yml

# Restore committed files and remove untracked (requires git init via setup.sh)
if [ -d .git ]; then
  git checkout -- .
  git clean -fd
fi

echo "✓ prd-small sandbox reset"
