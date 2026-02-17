#!/usr/bin/env bash
# reset.sh — Reset the "run-sequential" sandbox to clean state
set -euo pipefail
cd "$(dirname "$0")"

# Remove runtime state
rm -f .ralph/state.json progress.txt
cat > .ralph/state.json << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF

# Reset learnings
rm -f .ralph/learnings/*.md
echo '{}' > .ralph/learnings/_index.json

# Reset spec frontmatter to pending
for spec in specs/epic-*/story-*.md; do
    [ -f "$spec" ] || continue
    if command -v sed &>/dev/null; then
        sed -i '' 's/^status: .*/status: pending/' "$spec" 2>/dev/null || \
        sed -i 's/^status: .*/status: pending/' "$spec"
    fi
done

# Remove generated code (keep .gitkeep)
find src -type f ! -name '.gitkeep' -delete 2>/dev/null || true
find tests -type f ! -name '.gitkeep' -delete 2>/dev/null || true

# Restore committed files and remove untracked (requires git init via setup.sh)
if [ -d .git ]; then
  git checkout -- .
  git clean -fd
fi

echo "✓ run-sequential sandbox reset"
