#!/usr/bin/env bash
# Ralph v2 Test Runner — Execute BATS test suites by tier
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BATS="${SCRIPT_DIR}/libs/bats-core/bin/bats"
TIER="${1:-all}"

if [[ ! -x "$BATS" ]]; then
    echo "Error: BATS not found at $BATS"
    echo "Run: git submodule update --init --recursive"
    exit 1
fi

case "$TIER" in
    1|tier1) "$BATS" "$SCRIPT_DIR/tier1-unit/" ;;
    2|tier2) "$BATS" "$SCRIPT_DIR/tier2-filesystem/" ;;
    3|tier3) "$BATS" "$SCRIPT_DIR/tier3-component/" ;;
    4|tier4) "$BATS" "$SCRIPT_DIR/tier4-workflow/" ;;
    all)     "$BATS" "$SCRIPT_DIR"/tier{1,2,3,4}*/ ;;
    *)
        echo "Usage: $0 [1|2|3|4|all]"
        echo ""
        echo "Tiers:"
        echo "  1  Pure unit tests (no filesystem, no externals)"
        echo "  2  Filesystem integration (temp dirs + fixtures)"
        echo "  3  Component tests (mocked externals)"
        echo "  4  Workflow integration (full bin/ralph invocations)"
        echo "  all  Run all tiers"
        exit 1
        ;;
esac
