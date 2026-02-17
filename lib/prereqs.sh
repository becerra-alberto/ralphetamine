#!/usr/bin/env bash
# Ralphetamine — Environment prerequisite checks

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
    if [[ ${#warnings[@]} -gt 0 ]]; then
        for warn in "${warnings[@]}"; do
            log_warn "$warn"
        done
    fi

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

# Get the current Bash version as "major.minor"
prereqs_bash_version() {
    local major="${BASH_VERSINFO[0]}"
    local minor="${BASH_VERSINFO[1]}"
    echo "${major}.${minor}"
}

# Gate features that require Bash 4.0+
prereqs_require_bash4() {
    if [[ "${BASH_VERSINFO[0]}" -lt 4 ]]; then
        log_error "This feature requires Bash 4.0+. Current: $(prereqs_bash_version)"
        log_error "On macOS: brew install bash"
        return 1
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

    local story_count
    story_count=$(grep -cvE '^[[:space:]]*(#|x[[:space:]]|$)' ".ralph/stories.txt" 2>/dev/null) || story_count=0
    if [[ "$story_count" -eq 0 ]]; then
        log_warn "stories.txt exists but has no active stories. Run /ralph to populate."
    fi

    return 0
}
