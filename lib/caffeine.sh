#!/usr/bin/env bash
# Ralph v2 — macOS caffeinate management (prevent sleep during long runs)

_CAFFEINE_PID=""

caffeine_start() {
    if [[ "$(uname -s)" != "Darwin" ]]; then
        log_debug "Caffeine: not macOS, skipping"
        return 0
    fi

    if ! command -v caffeinate &>/dev/null; then
        log_debug "Caffeine: caffeinate not found"
        return 0
    fi

    # -d: prevent display sleep
    # -i: prevent idle sleep
    # -m: prevent disk sleep
    # -s: prevent system sleep (AC power)
    caffeinate -dims &
    _CAFFEINE_PID=$!

    log_debug "Caffeine: started (PID $_CAFFEINE_PID)"
}

caffeine_stop() {
    if [[ -n "$_CAFFEINE_PID" ]]; then
        kill "$_CAFFEINE_PID" 2>/dev/null || true
        log_debug "Caffeine: stopped (PID $_CAFFEINE_PID)"
        _CAFFEINE_PID=""
    fi
}
