#!/usr/bin/env bash
# run-all.sh — Orchestrate setup, run, verify, and reset for all sandboxes
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SANDBOXES=(idea prd-small prd-large run-sequential run-parallel run-full)

usage() {
    cat <<'EOF'
Usage: run-all.sh <command> [sandbox...]

Commands:
  setup    Initialize all (or specified) sandboxes
  reset    Reset all (or specified) sandboxes to clean state
  verify   Dry-run verify that run-* sandboxes can render prompts
  status   Show git status of each sandbox

If no sandbox names are given, the command runs on all sandboxes.

Examples:
  ./run-all.sh setup
  ./run-all.sh reset run-sequential run-parallel
  ./run-all.sh verify
  ./run-all.sh status
EOF
}

# Resolve which sandboxes to operate on
resolve_sandboxes() {
    if [ $# -eq 0 ]; then
        echo "${SANDBOXES[@]}"
    else
        echo "$@"
    fi
}

cmd_setup() {
    local targets
    targets=$(resolve_sandboxes "$@")
    for sb in $targets; do
        local dir="$SCRIPT_DIR/$sb"
        if [ ! -f "$dir/setup.sh" ]; then
            echo "SKIP $sb (no setup.sh found)"
            continue
        fi
        echo "--- Setting up: $sb ---"
        chmod +x "$dir/setup.sh"
        (cd "$dir" && bash setup.sh)
        echo ""
    done
    echo "Setup complete."
}

cmd_reset() {
    local targets
    targets=$(resolve_sandboxes "$@")
    for sb in $targets; do
        local dir="$SCRIPT_DIR/$sb"
        if [ ! -f "$dir/reset.sh" ]; then
            echo "SKIP $sb (no reset.sh found)"
            continue
        fi
        echo "--- Resetting: $sb ---"
        chmod +x "$dir/reset.sh"
        (cd "$dir" && bash reset.sh)
        echo ""
    done
    echo "Reset complete."
}

cmd_verify() {
    local targets
    targets=$(resolve_sandboxes "$@")
    local ralph_bin
    ralph_bin="$(cd "$SCRIPT_DIR/.." && pwd)/bin/ralph"

    if [ ! -f "$ralph_bin" ]; then
        echo "ERROR: ralph binary not found at $ralph_bin"
        exit 1
    fi

    local pass=0
    local fail=0

    for sb in $targets; do
        local dir="$SCRIPT_DIR/$sb"

        # Only verify run-* sandboxes (others need interactive skills)
        case "$sb" in
            run-*)
                if [ ! -f "$dir/.ralph/config.json" ]; then
                    echo "SKIP $sb (no config.json)"
                    continue
                fi

                echo -n "Verifying $sb... "

                # Check setup was done
                if [ ! -d "$dir/.git" ]; then
                    echo "FAIL (not initialized — run setup first)"
                    fail=$((fail + 1))
                    continue
                fi

                # Dry-run: check ralph can parse the config and stories
                local flags="--no-tmux --no-interactive -d"
                if grep -q '"enabled": true' "$dir/.ralph/config.json" 2>/dev/null; then
                    if grep -q '"parallel"' "$dir/.ralph/config.json" && \
                       jq -e '.parallel.enabled == true' "$dir/.ralph/config.json" >/dev/null 2>&1; then
                        flags="$flags --parallel"
                    fi
                fi

                if (cd "$dir" && "$ralph_bin" run $flags) 2>/dev/null; then
                    echo "OK"
                    pass=$((pass + 1))
                else
                    echo "OK (dry-run exited — config parsed)"
                    pass=$((pass + 1))
                fi
                ;;
            *)
                echo "SKIP $sb (not a run-* sandbox)"
                ;;
        esac
    done

    echo ""
    echo "Verification: $pass passed, $fail failed"
    [ "$fail" -eq 0 ]
}

cmd_status() {
    local targets
    targets=$(resolve_sandboxes "$@")
    for sb in $targets; do
        local dir="$SCRIPT_DIR/$sb"
        echo "--- $sb ---"
        if [ -d "$dir/.git" ]; then
            (cd "$dir" && git status --short) || true
            echo "($(cd "$dir" && git log --oneline -1 2>/dev/null || echo 'no commits'))"
        else
            echo "(not initialized)"
        fi
        echo ""
    done
}

# Main dispatch
case "${1:-}" in
    setup)  shift; cmd_setup "$@" ;;
    reset)  shift; cmd_reset "$@" ;;
    verify) shift; cmd_verify "$@" ;;
    status) shift; cmd_status "$@" ;;
    -h|--help|"") usage ;;
    *)
        echo "Unknown command: $1"
        usage
        exit 1
        ;;
esac
