#!/bin/bash
# Ralph v2 — Environment prerequisite checks

prereqs_check() {
    local missing=()
    local warnings=()

    # Required tools
    command -v claude &>/dev/null || missing+=("claude (Claude Code CLI)")
    command -v jq &>/dev/null     || missing+=("jq (JSON processor)")
    command -v git &>/dev/null    || missing+=("git")
    command -v sed &>/dev/null    || missing+=("sed")
    command -v find &>/dev/null   || missing+=("find")

    # timeout: GNU coreutils on Linux, gtimeout on macOS
    if ! command -v timeout &>/dev/null; then
        if command -v gtimeout &>/dev/null; then
            warnings+=("Using 'gtimeout' as 'timeout' alias (macOS)")
        else
            missing+=("timeout (install coreutils: brew install coreutils)")
        fi
    fi

    # Report all missing at once
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools:"
        for tool in "${missing[@]}"; do
            echo "  - $tool"
        done
        return 1
    fi

    # Show warnings
    for warn in "${warnings[@]}"; do
        log_warn "$warn"
    done

    log_debug "All prerequisites satisfied"
    return 0
}

# Get the correct timeout command for this platform
prereqs_timeout_cmd() {
    if command -v timeout &>/dev/null; then
        echo "timeout"
    elif command -v gtimeout &>/dev/null; then
        echo "gtimeout"
    else
        echo ""
    fi
}

# Check that we're in a project with ralph initialized
prereqs_check_project() {
    if [[ ! -f ".ralph/config.json" ]]; then
        log_error "Not a Ralph project (no .ralph/config.json found)."
        log_error "Run 'ralph init' to initialize."
        return 1
    fi

    if [[ ! -f ".ralph/stories.txt" ]]; then
        log_error "No stories.txt found. Create .ralph/stories.txt with story IDs."
        return 1
    fi

    return 0
}
