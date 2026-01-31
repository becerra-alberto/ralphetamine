#!/bin/bash
# Ralph v2 — Install script
# Adds bin/ralph to PATH via symlink

set -euo pipefail

RALPH_DIR="$(cd "$(dirname "$0")" && pwd)"
RALPH_BIN="${RALPH_DIR}/bin/ralph"
INSTALL_DIR="${HOME}/.local/bin"

echo "Ralph v2 Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Make ralph executable
chmod +x "$RALPH_BIN"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Create symlink
if [[ -L "${INSTALL_DIR}/ralph" ]]; then
    rm "${INSTALL_DIR}/ralph"
fi

ln -s "$RALPH_BIN" "${INSTALL_DIR}/ralph"
echo "Symlinked: ${INSTALL_DIR}/ralph -> ${RALPH_BIN}"

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
echo "  ralph init"
echo "  ralph run"
echo ""
