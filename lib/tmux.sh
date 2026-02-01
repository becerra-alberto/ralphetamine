#!/usr/bin/env bash
# Ralph v2 — tmux auto-wrapping (detachable sessions)

tmux_ensure() {
    # Already inside tmux
    if [[ -n "${TMUX:-}" ]]; then
        log_debug "Already in tmux session"
        return 0
    fi

    # tmux not available
    if ! command -v tmux &>/dev/null; then
        log_debug "tmux not available, running without it"
        return 0
    fi

    local session_name="ralph-$(basename "$(pwd)")"

    # Check if session already exists
    if tmux has-session -t "$session_name" 2>/dev/null; then
        log_info "Attaching to existing tmux session: $session_name"
        exec tmux attach-session -t "$session_name"
    fi

    # Create new session with remain-on-exit so crashes stay visible
    log_info "Creating tmux session: $session_name"
    exec tmux new-session -d -s "$session_name" -- "$0" "$@" \; \
        set-option -t "$session_name" remain-on-exit on \; \
        attach-session -t "$session_name"
}
