#!/usr/bin/env bash
# setup.sh — Initialize the "run-parallel" sandbox
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .git ]; then
    git init
    git checkout -b main
fi

# Create empty dirs with .gitkeep
mkdir -p src tests data bin
touch src/.gitkeep tests/.gitkeep data/.gitkeep bin/.gitkeep

# Initialize progress and state
touch progress.txt
cat > .ralph/state.json << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF

git add -A
git commit -m "initial: run-parallel sandbox setup"
echo "✓ run-parallel sandbox ready"
