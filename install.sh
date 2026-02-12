#!/usr/bin/env bash
# Ralph v2 — Install script
# Adds bin/ralph to PATH via symlink

set -euo pipefail

RALPH_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_BIN="${RALPH_DIR}/bin/ralph"
INSTALL_DIR="${HOME}/.local/bin"

echo "Ralph v2 Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Warn if Bash 4+ is not available (ralph requires it at runtime)
if [[ "${BASH_VERSINFO[0]}" -lt 4 ]]; then
    _has_bash4=false
    for _bash in /opt/homebrew/bin/bash /usr/local/bin/bash; do
        [[ -x "$_bash" ]] && "$_bash" -c '[[ "${BASH_VERSINFO[0]}" -ge 4 ]]' 2>/dev/null && _has_bash4=true && break
    done
    if [[ "$_has_bash4" == false ]]; then
        echo "WARNING: Ralph requires Bash 4.0+. Current system bash is ${BASH_VERSINFO[0]}.${BASH_VERSINFO[1]}."
        echo "Install via: brew install bash"
        echo ""
    fi
fi

# Make ralph executable
chmod +x "$RALPH_BIN"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Create symlink (remove existing file or symlink first)
if [[ -e "${INSTALL_DIR}/ralph" || -L "${INSTALL_DIR}/ralph" ]]; then
    rm "${INSTALL_DIR}/ralph"
fi

ln -s "$RALPH_BIN" "${INSTALL_DIR}/ralph"
echo "Symlinked: ${INSTALL_DIR}/ralph -> ${RALPH_BIN}"

# Install global Claude Code command (fallback for projects without ralph init)
CLAUDE_COMMANDS_DIR="${HOME}/.claude/commands"
mkdir -p "$CLAUDE_COMMANDS_DIR"
cp "${RALPH_DIR}/commands/create-spec.md" "${CLAUDE_COMMANDS_DIR}/ralph-create-spec.md"
echo "Installed: ${CLAUDE_COMMANDS_DIR}/ralph-create-spec.md"

# Install /ralph skill (backup old one if it exists)
SKILL_DIR="${HOME}/.claude/skills/ralph"
mkdir -p "$SKILL_DIR"
if [[ -f "${SKILL_DIR}/SKILL.md" ]]; then
    cp "${SKILL_DIR}/SKILL.md" "${SKILL_DIR}/SKILL.md.bak"
    echo "Backed up: ${SKILL_DIR}/SKILL.md -> SKILL.md.bak"
fi
cp "${RALPH_DIR}/skills/SKILL.md" "${SKILL_DIR}/SKILL.md"
echo "Installed: ${SKILL_DIR}/SKILL.md (v2)"

# Install /ralph-pipeline-interactive skill
INTERACTIVE_SKILL_DIR="${HOME}/.claude/skills/ralph-pipeline-interactive"
mkdir -p "$INTERACTIVE_SKILL_DIR"
if [[ -f "${INTERACTIVE_SKILL_DIR}/SKILL.md" ]]; then
    cp "${INTERACTIVE_SKILL_DIR}/SKILL.md" "${INTERACTIVE_SKILL_DIR}/SKILL.md.bak"
    echo "Backed up: ${INTERACTIVE_SKILL_DIR}/SKILL.md -> SKILL.md.bak"
fi
cp "${RALPH_DIR}/skills/ralph-pipeline-interactive/SKILL.md" "${INTERACTIVE_SKILL_DIR}/SKILL.md"
echo "Installed: ${INTERACTIVE_SKILL_DIR}/SKILL.md (interactive pipeline)"

# Install /ralph-pipeline-full-auto skill
FULLAUTO_SKILL_DIR="${HOME}/.claude/skills/ralph-pipeline-full-auto"
mkdir -p "$FULLAUTO_SKILL_DIR"
if [[ -f "${FULLAUTO_SKILL_DIR}/SKILL.md" ]]; then
    cp "${FULLAUTO_SKILL_DIR}/SKILL.md" "${FULLAUTO_SKILL_DIR}/SKILL.md.bak"
    echo "Backed up: ${FULLAUTO_SKILL_DIR}/SKILL.md -> SKILL.md.bak"
fi
cp "${RALPH_DIR}/skills/ralph-pipeline-full-auto/SKILL.md" "${FULLAUTO_SKILL_DIR}/SKILL.md"
echo "Installed: ${FULLAUTO_SKILL_DIR}/SKILL.md (full-auto pipeline)"

# Check if INSTALL_DIR is in PATH
if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
    echo ""
    echo "Add to your shell profile (~/.zshrc or ~/.bashrc):"
    echo ""
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "Then restart your shell or run: source ~/.zshrc"
else
    echo ""
    echo "ralph is now available on your PATH."
fi

echo ""
echo "Usage:"
echo "  cd your-project"
echo "  ralph init          # Initialize Ralph in project"
echo "  /prd                # Create a PRD in Claude Code"
echo "  /ralph              # Convert PRD to specs + story queue"
echo "  /ralph-pipeline-interactive  # Guided pipeline with user checkpoints"
echo "  /ralph-pipeline-full-auto    # Fully autonomous pipeline (zero input)"
echo "  ralph run           # Run autonomous implementation loop"
echo ""
