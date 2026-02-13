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
CREATE_SPEC_SOURCE="${RALPH_DIR}/commands/create-spec.md"
if [[ ! -f "$CREATE_SPEC_SOURCE" ]]; then
    CREATE_SPEC_SOURCE="${RALPH_DIR}/commands/ralph-v2/step_3-add-ad-hoc-spec.md"
fi
cp "$CREATE_SPEC_SOURCE" "${CLAUDE_COMMANDS_DIR}/ralph-create-spec.md"
echo "Installed: ${CLAUDE_COMMANDS_DIR}/ralph-create-spec.md"

RECONCILE_CLAUDE_COMMAND_SOURCE="${RALPH_DIR}/commands/ralph-reconcile-claude-code.md"
if [[ -f "$RECONCILE_CLAUDE_COMMAND_SOURCE" ]]; then
    cp "$RECONCILE_CLAUDE_COMMAND_SOURCE" "${CLAUDE_COMMANDS_DIR}/ralph-reconcile-claude-code.md"
    echo "Installed: ${CLAUDE_COMMANDS_DIR}/ralph-reconcile-claude-code.md"
fi

RECONCILE_CODEX_COMMAND_SOURCE="${RALPH_DIR}/commands/ralph-reconcile-codex.md"
if [[ -f "$RECONCILE_CODEX_COMMAND_SOURCE" ]]; then
    cp "$RECONCILE_CODEX_COMMAND_SOURCE" "${CLAUDE_COMMANDS_DIR}/ralph-reconcile-codex.md"
    echo "Installed: ${CLAUDE_COMMANDS_DIR}/ralph-reconcile-codex.md"
fi

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

# Install /ralph-run-reconcile-claude-code skill (with references)
RECONCILE_CLAUDE_SKILL_DIR="${HOME}/.claude/skills/ralph-run-reconcile-claude-code"
mkdir -p "$RECONCILE_CLAUDE_SKILL_DIR"
if [[ -f "${RECONCILE_CLAUDE_SKILL_DIR}/SKILL.md" ]]; then
    cp "${RECONCILE_CLAUDE_SKILL_DIR}/SKILL.md" "${RECONCILE_CLAUDE_SKILL_DIR}/SKILL.md.bak"
    echo "Backed up: ${RECONCILE_CLAUDE_SKILL_DIR}/SKILL.md -> SKILL.md.bak"
fi
cp -R "${RALPH_DIR}/skills/ralph-run-reconcile-claude-code/." "$RECONCILE_CLAUDE_SKILL_DIR/"
echo "Installed: ${RECONCILE_CLAUDE_SKILL_DIR}/SKILL.md (reconcile for Claude Code)"

# Install /ralph-run-reconcile-codex skill (with references)
RECONCILE_CODEX_SKILL_DIR="${HOME}/.claude/skills/ralph-run-reconcile-codex"
mkdir -p "$RECONCILE_CODEX_SKILL_DIR"
if [[ -f "${RECONCILE_CODEX_SKILL_DIR}/SKILL.md" ]]; then
    cp "${RECONCILE_CODEX_SKILL_DIR}/SKILL.md" "${RECONCILE_CODEX_SKILL_DIR}/SKILL.md.bak"
    echo "Backed up: ${RECONCILE_CODEX_SKILL_DIR}/SKILL.md -> SKILL.md.bak"
fi
cp -R "${RALPH_DIR}/skills/ralph-run-reconcile-codex/." "$RECONCILE_CODEX_SKILL_DIR/"
echo "Installed: ${RECONCILE_CODEX_SKILL_DIR}/SKILL.md (reconcile for Codex)"

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
echo "  /ralph-reconcile-claude-code # Reconcile the latest run (Claude Code mode)"
echo "  /ralph-reconcile-codex       # Reconcile the latest run (Codex mode)"
echo "  ralph run           # Run autonomous implementation loop"
echo ""
