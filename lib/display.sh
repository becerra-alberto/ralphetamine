#!/usr/bin/env bash
# Ralph v2 — Append-only display (event-driven status lines)
# No scroll regions, no cursor manipulation. CI-safe.

# ── Dashboard state ──────────────────────────────────────────────────
RALPH_DASHBOARD="${RALPH_DASHBOARD:-true}"
RALPH_START_TIME="${RALPH_START_TIME:-}"

_DISPLAY_HEARTBEAT_PID=""
_DISPLAY_HEARTBEAT_INTERVAL="${RALPH_HEARTBEAT_INTERVAL:-300}"  # seconds (default 5 min)

# Cached display data (updated via display_update_*)
_DISPLAY_TOTAL_STORIES=0
_DISPLAY_DONE_STORIES=0
_DISPLAY_CURRENT_STORY=""
_DISPLAY_CURRENT_TITLE=""
_DISPLAY_RETRY_COUNT=0
_DISPLAY_MAX_RETRIES=3
_DISPLAY_ITERATION=0
_DISPLAY_LEARNINGS_COUNT=0
_DISPLAY_WORKERS_ACTIVE=0
_DISPLAY_WORKERS_MAX=0
_DISPLAY_LAST_DONE=""
_DISPLAY_LAST_DONE_AGO=""

# ── Initialization ───────────────────────────────────────────────────

display_init() {
    RALPH_START_TIME=$(date '+%s')

    # Register cleanup via centralized trap registry
    if type ralph_on_exit &>/dev/null; then
        ralph_on_exit _display_cleanup
    fi
}

# ── Plain/CI detection ───────────────────────────────────────────────

# Returns 0 if output should be plain (no ANSI colors).
# Detects CI environments, non-TTY, NO_COLOR, TERM=dumb.
_display_is_plain() {
    [[ -n "${NO_COLOR:-}" ]] && return 0
    [[ "${CI:-}" == "true" ]] && return 0
    [[ "${TERM:-}" == "dumb" ]] && return 0
    [[ ! -t 1 ]] && return 0
    return 1
}

# ── Data update functions ────────────────────────────────────────────
# Call these to update cached data. No immediate rendering — output is
# emitted at story start/end events, not on every data change.

display_update_stories() {
    local total="$1"
    local done="$2"
    _DISPLAY_TOTAL_STORIES="$total"
    _DISPLAY_DONE_STORIES="$done"
}

display_update_current() {
    local story="$1"
    local title="${2:-}"
    _DISPLAY_CURRENT_STORY="$story"
    _DISPLAY_CURRENT_TITLE="$title"
}

display_update_retry() {
    local count="$1"
    local max="${2:-3}"
    _DISPLAY_RETRY_COUNT="$count"
    _DISPLAY_MAX_RETRIES="$max"
}

display_update_iteration() {
    local iteration="$1"
    _DISPLAY_ITERATION="$iteration"
}

display_update_learnings() {
    local count="$1"
    _DISPLAY_LEARNINGS_COUNT="$count"
}

display_update_workers() {
    local active="$1"
    local max="$2"
    _DISPLAY_WORKERS_ACTIVE="$active"
    _DISPLAY_WORKERS_MAX="$max"
}

display_update_last_done() {
    local story="$1"
    _DISPLAY_LAST_DONE="$story"
    _DISPLAY_LAST_DONE_AGO=$(date '+%s')
}

# ── Story status emitters (append-only lines) ────────────────────────

# Emit a single line when a story completes successfully.
# Usage: display_story_completed "3.1" "10m 35s" "42000" "$0.38"
display_story_completed() {
    local id="$1"
    local duration="${2:-}"
    local tokens="${3:-}"
    local cost="${4:-}"

    local detail=""
    [[ -n "$duration" ]] && detail=" (${duration}"
    [[ -n "$tokens" && "$tokens" != "0" ]] && detail="${detail}, ${tokens} tokens"
    [[ -n "$cost" && "$cost" != "0" ]] && detail="${detail}, \$${cost}"
    [[ -n "$detail" ]] && detail="${detail})"

    if _display_is_plain; then
        echo "[OK] Story ${id} completed!${detail}"
    else
        echo -e "${CLR_GREEN}[OK]${CLR_RESET} Story ${id} completed!${CLR_DIM}${detail}${CLR_RESET}"
    fi
}

# Emit a single line when a story fails.
# Usage: display_story_failed "3.1" "Timeout after 1800s" "10m 35s" "42000" "$0.38"
display_story_failed() {
    local id="$1"
    local reason="${2:-}"
    local duration="${3:-}"
    local tokens="${4:-}"
    local cost="${5:-}"

    local detail=""
    [[ -n "$reason" ]] && detail=": ${reason}"
    local metrics=""
    [[ -n "$duration" ]] && metrics=" (${duration}"
    [[ -n "$tokens" && "$tokens" != "0" ]] && metrics="${metrics}, ${tokens} tokens"
    [[ -n "$cost" && "$cost" != "0" ]] && metrics="${metrics}, \$${cost}"
    [[ -n "$metrics" ]] && metrics="${metrics})"

    if _display_is_plain; then
        echo "[FAIL] Story ${id} failed${detail}${metrics}"
    else
        echo -e "${CLR_RED}[FAIL]${CLR_RESET} Story ${id} failed${detail}${CLR_DIM}${metrics}${CLR_RESET}"
    fi
}

# Emit a batch results summary line.
# Usage: display_batch_results 3 1
display_batch_results() {
    local succeeded="$1"
    local failed="$2"

    if _display_is_plain; then
        echo "[INFO] Batch results: ${succeeded} succeeded, ${failed} failed"
    else
        echo -e "${CLR_CYAN}[INFO]${CLR_RESET} Batch results: ${succeeded} succeeded, ${failed} failed"
    fi
}

# ── Heartbeat ─────────────────────────────────────────────────────────
# Lightweight periodic status line during long-running Claude invocations.
# Replaces the 1-second background timer + scroll-region refresh.

# Start a heartbeat for a story. Prints a status line every N minutes.
# Usage: _display_start_heartbeat "3.1"
_display_start_heartbeat() {
    [[ "$RALPH_DASHBOARD" != "true" ]] && return 0

    local story_id="${1:-}"

    # Kill any existing heartbeat first (exclusive resource)
    _display_stop_heartbeat

    (
        trap 'exit 0' TERM INT
        while true; do
            sleep "$_DISPLAY_HEARTBEAT_INTERVAL"
            local elapsed_str="??:??:??"
            if [[ -n "$RALPH_START_TIME" ]]; then
                elapsed_str=$(_display_format_elapsed "$RALPH_START_TIME")
            fi
            local msg="... running"
            [[ -n "$story_id" ]] && msg="... running story ${story_id}"
            if _display_is_plain; then
                echo "[$(date '+%H:%M:%S')] ${msg} (elapsed: ${elapsed_str})"
            else
                echo -e "${CLR_DIM}[$(date '+%H:%M:%S')] ${msg} (elapsed: ${elapsed_str})${CLR_RESET}"
            fi
        done
    ) &
    _DISPLAY_HEARTBEAT_PID=$!
}

# Stop the heartbeat.
_display_stop_heartbeat() {
    if [[ -n "${_DISPLAY_HEARTBEAT_PID:-}" ]]; then
        kill "$_DISPLAY_HEARTBEAT_PID" 2>/dev/null
        wait "$_DISPLAY_HEARTBEAT_PID" 2>/dev/null || true
        _DISPLAY_HEARTBEAT_PID=""
    fi
}

# Start a batch heartbeat for parallel mode.
# Usage: _display_start_batch_heartbeat
_display_start_batch_heartbeat() {
    [[ "$RALPH_DASHBOARD" != "true" ]] && return 0

    _display_stop_heartbeat

    (
        trap 'exit 0' TERM INT
        while true; do
            sleep "$_DISPLAY_HEARTBEAT_INTERVAL"
            local elapsed_str="??:??:??"
            if [[ -n "$RALPH_START_TIME" ]]; then
                elapsed_str=$(_display_format_elapsed "$RALPH_START_TIME")
            fi
            local workers_str=""
            [[ "$_DISPLAY_WORKERS_MAX" -gt 0 ]] && workers_str="workers: ${_DISPLAY_WORKERS_ACTIVE}/${_DISPLAY_WORKERS_MAX}, "
            if _display_is_plain; then
                echo "[$(date '+%H:%M:%S')] ... parallel batch running (${workers_str}elapsed: ${elapsed_str})"
            else
                echo -e "${CLR_DIM}[$(date '+%H:%M:%S')] ... parallel batch running (${workers_str}elapsed: ${elapsed_str})${CLR_RESET}"
            fi
        done
    ) &
    _DISPLAY_HEARTBEAT_PID=$!
}

# ── Backward-compatible aliases ───────────────────────────────────────
# Callers in runner.sh / parallel.sh use these names.

display_start_live_timer() {
    _display_start_heartbeat "${_DISPLAY_CURRENT_STORY:-}"
}

display_stop_live_timer() {
    _display_stop_heartbeat
}

# No-op — there is no stateful panel to refresh.
display_refresh() {
    return 0
}

# Refresh from state: still updates cached data (used by summary), but no render.
display_refresh_from_state() {
    if [[ "$RALPH_DASHBOARD" != "true" ]]; then
        return 0
    fi

    local total=0 done_count=0
    if type stories_count_total &>/dev/null; then
        total=$(stories_count_total 2>/dev/null || echo "0")
    fi
    if type stories_count_completed &>/dev/null; then
        done_count=$(stories_count_completed 2>/dev/null || echo "0")
    elif type state_completed_count &>/dev/null; then
        done_count=$(state_completed_count 2>/dev/null || echo "0")
    fi
    display_update_stories "$total" "$done_count"

    if type state_get_current &>/dev/null; then
        local current
        current=$(state_get_current 2>/dev/null || echo "")
        local retry
        retry=$(state_get_retry_count 2>/dev/null || echo "0")
        _DISPLAY_CURRENT_STORY="$current"
        _DISPLAY_RETRY_COUNT="$retry"
    fi

    _DISPLAY_LEARNINGS_COUNT=$(_display_count_learnings)
}

# ── Utility functions ────────────────────────────────────────────────

# Format elapsed time from a start timestamp to now
# Usage: _display_format_elapsed <start_epoch>
_display_format_elapsed() {
    local start="$1"
    local now
    now=$(date '+%s')
    local diff=$(( now - start ))
    [[ "$diff" -lt 0 ]] && diff=0

    local hours=$(( diff / 3600 ))
    local mins=$(( (diff % 3600) / 60 ))
    local secs=$(( diff % 60 ))
    printf '%02d:%02d:%02d' "$hours" "$mins" "$secs"
}

# Format seconds into human-readable duration string
# Usage: _display_format_duration <seconds>
_display_format_duration() {
    local secs="$1"
    [[ "$secs" -lt 0 ]] && secs=0
    local m=$(( secs / 60 ))
    local s=$(( secs % 60 ))
    if [[ $m -gt 0 ]]; then
        printf '%dm %02ds' "$m" "$s"
    else
        printf '%ds' "$s"
    fi
}

# Count total learnings from .ralph/learnings/ directory
_display_count_learnings() {
    local dir=".ralph/learnings"
    local total=0

    if [[ ! -d "$dir" ]]; then
        echo "0"
        return
    fi

    for file in "$dir"/*.md; do
        [[ -f "$file" ]] || continue
        local count
        count=$(grep -c '^- ' "$file" 2>/dev/null || echo "0")
        total=$((total + count))
    done
    echo "$total"
}

# Count active workers from PID directory
_display_count_active_workers() {
    local worktree_dir=".ralph/worktrees"
    local count=0

    for pid_dir in "$worktree_dir"/.pids-*/; do
        [[ -d "$pid_dir" ]] || continue
        for pid_file in "$pid_dir"/pid_*; do
            [[ -f "$pid_file" ]] || continue
            local pid="${pid_file##*pid_}"
            if kill -0 "$pid" 2>/dev/null; then
                count=$((count + 1))
            fi
        done
    done
    echo "$count"
}

# ── Cleanup ──────────────────────────────────────────────────────────

_display_cleanup() {
    _display_stop_heartbeat
}
