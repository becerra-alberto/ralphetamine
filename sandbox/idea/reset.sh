#!/usr/bin/env bash
# reset.sh — Reset the "idea" sandbox to clean state
set -euo pipefail
cd "$(dirname "$0")"

# Remove generated PRD output
rm -rf tasks/*

# Restore committed files and remove untracked (requires git init via setup.sh)
if [ -d .git ]; then
  git checkout -- .
  git clean -fd
fi

echo "✓ idea sandbox reset"
