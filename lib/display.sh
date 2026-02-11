#!/usr/bin/env bash
# Ralph v2 — Real-time dashboard display (Level 2: structured panel)
# Uses POSIX-standard tput for cursor positioning. Bash 3.2 compatible.
# Degrades to single-line progress (Level 1) if terminal is too small.

# ── Dashboard state ──────────────────────────────────────────────────
RALPH_DASHBOARD="${RALPH_DASHBOARD:-true}"
RALPH_START_TIME="${RALPH_START_TIME:-}"

# Panel dimensions
_DISPLAY_PANEL_LINES=6  # header(1) + data(4) + footer(1)
_DISPLAY_MIN_WIDTH=68
_DISPLAY_INITIALIZED=false
_DISPLAY_TIMER_PID=""
_DISPLAY_PANEL_ROW=""   # Absolute row where panel starts (1-indexed)

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
    if [[ "$RALPH_DASHBOARD" != "true" ]]; then
        return 0
    fi

    RALPH_START_TIME=$(date '+%s')

    # Check terminal size for degradation
    if ! _display_can_render_panel; then
        _DISPLAY_INITIALIZED=false
        return 0
    fi

    _DISPLAY_INITIALIZED=true

    # Calculate panel position: pin to bottom of terminal
    local rows
    rows=$(tput lines 2>/dev/null) || rows=24
    _DISPLAY_PANEL_ROW=$((rows - _DISPLAY_PANEL_LINES))

    # Set scroll region to exclude bottom panel area + buffer rows.
    # The buffer prevents log output from bleeding into the panel.
    printf '\033[1;%dr' "$((_DISPLAY_PANEL_ROW - 2))"

    # Handle terminal resize — recalculate panel position
    trap '_display_handle_resize' WINCH

    # Register cleanup to restore full scroll region on exit
    if type ralph_on_exit &>/dev/null; then
        ralph_on_exit _display_cleanup
    fi
}

# Recalculate panel position on terminal resize
_display_handle_resize() {
    if [[ "$_DISPLAY_INITIALIZED" == true ]]; then
        local rows
        rows=$(tput lines 2>/dev/null) || rows=24
        _DISPLAY_PANEL_ROW=$((rows - _DISPLAY_PANEL_LINES))
        printf '\033[1;%dr' "$((_DISPLAY_PANEL_ROW - 2))"
        display_refresh
    fi
}

# ── Data update functions ────────────────────────────────────────────
# Call these to update cached data, then call display_refresh to redraw.

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

# ── Rendering ────────────────────────────────────────────────────────

display_refresh() {
    if [[ "$RALPH_DASHBOARD" != "true" ]]; then
        return 0
    fi

    if [[ "$_DISPLAY_INITIALIZED" == true ]] && _display_can_render_panel; then
        _display_render_panel
    else
        _display_render_progress_line
    fi
}

# Level 1: Single progress line (fallback)
_display_render_progress_line() {
    local bar
    bar=$(ui_progress_bar "$_DISPLAY_DONE_STORIES" "$_DISPLAY_TOTAL_STORIES" 16)

    local current_label=""
    if [[ -n "$_DISPLAY_CURRENT_STORY" ]]; then
        current_label="$_DISPLAY_CURRENT_STORY"
        [[ -n "$_DISPLAY_CURRENT_TITLE" ]] && current_label="$_DISPLAY_CURRENT_STORY $_DISPLAY_CURRENT_TITLE"
        # Truncate to 30 chars
        current_label="${current_label:0:30}"
    fi

    # Use carriage return to overwrite the line
    printf "\r${CLR_DIM}Stories${CLR_RESET} %s  ${CLR_DIM}|${CLR_RESET}  %s  ${CLR_DIM}|${CLR_RESET}  Retry: %d/%d  ${CLR_DIM}|${CLR_RESET}  Learnings: %d    " \
        "$bar" "$current_label" "$_DISPLAY_RETRY_COUNT" "$_DISPLAY_MAX_RETRIES" "$_DISPLAY_LEARNINGS_COUNT"
}

# Level 2: Structured dashboard panel
_display_render_panel() {
    local cols
    cols=$(_display_term_cols)
    local width=$(( cols > 70 ? 70 : cols ))
    local inner=$(( width - 2 ))  # Inside the box (excluding side borders)
    local half=$(( inner / 2 ))

    # Calculate elapsed time
    local elapsed_str="00:00:00"
    if [[ -n "$RALPH_START_TIME" ]]; then
        elapsed_str=$(_display_format_elapsed "$RALPH_START_TIME")
    fi

    # Calculate "last done ago" string
    local last_done_str="--"
    if [[ -n "$_DISPLAY_LAST_DONE" && -n "$_DISPLAY_LAST_DONE_AGO" ]]; then
        local ago_str
        ago_str=$(_display_format_elapsed "$_DISPLAY_LAST_DONE_AGO")
        last_done_str="$_DISPLAY_LAST_DONE (${ago_str} ago)"
    fi

    # Build progress bar
    local bar
    bar=$(ui_progress_bar "$_DISPLAY_DONE_STORIES" "$_DISPLAY_TOTAL_STORIES" 12)

    # Workers string
    local workers_str="${_DISPLAY_WORKERS_ACTIVE}/${_DISPLAY_WORKERS_MAX} active"
    if [[ "$_DISPLAY_WORKERS_MAX" -eq 0 ]]; then
        workers_str="sequential"
    fi

    # Current story display
    local current_str="$_DISPLAY_CURRENT_STORY"
    if [[ -n "$_DISPLAY_CURRENT_TITLE" ]]; then
        current_str="$_DISPLAY_CURRENT_STORY $_DISPLAY_CURRENT_TITLE"
    fi
    # Truncate if too long for left column
    local max_current=$(( half - 14 ))
    [[ "$max_current" -lt 5 ]] && max_current=5
    current_str="${current_str:0:$max_current}"

    # Save cursor, jump to fixed panel position, render, restore cursor
    printf '\0337'                              # DEC save cursor
    printf '\033[%d;1H' "$_DISPLAY_PANEL_ROW"   # absolute row, column 1

    # Render panel lines
    _display_box_top "$width"
    _display_box_row "$inner" "$half" "Progress" "$bar" "Iteration" "$_DISPLAY_ITERATION"
    _display_box_row "$inner" "$half" "Current" "$current_str" "Retries" "${_DISPLAY_RETRY_COUNT}/${_DISPLAY_MAX_RETRIES}"
    _display_box_row "$inner" "$half" "Workers" "$workers_str" "Learnings" "$_DISPLAY_LEARNINGS_COUNT total"
    _display_box_row "$inner" "$half" "Last Done" "$last_done_str" "Elapsed" "$elapsed_str"
    _display_box_bottom "$width"

    printf '\0338'                              # DEC restore cursor
}

# ── Box drawing helpers ──────────────────────────────────────────────

_display_box_top() {
    local width="$1"
    local inner=$(( width - 2 ))
    local title=" RALPH DASHBOARD "
    local title_len=${#title}
    local pad_left=$(( (inner - title_len) / 2 ))
    local pad_right=$(( inner - title_len - pad_left ))

    printf '\r'
    printf "${CLR_CYAN}"
    printf '%s' "$(printf '%.0s=' $(seq 1 "$pad_left"))"
    printf "${CLR_BOLD}%s${CLR_RESET}${CLR_CYAN}" "$title"
    printf '%s' "$(printf '%.0s=' $(seq 1 "$pad_right"))"
    printf "${CLR_RESET}"
    # Clear rest of line
    tput el 2>/dev/null || printf '\033[K'
    printf '\n'
}

_display_box_bottom() {
    local width="$1"
    local inner=$(( width - 2 ))
    printf '\r'
    printf "${CLR_CYAN}"
    printf '%s' "$(printf '%.0s=' $(seq 1 "$inner"))"
    printf "${CLR_RESET}"
    tput el 2>/dev/null || printf '\033[K'
    printf '\n'
}

_display_box_row() {
    local inner="$1"
    local half="$2"
    local left_label="$3"
    local left_value="$4"
    local right_label="$5"
    local right_value="$6"

    local left_str
    left_str=$(printf "  ${CLR_DIM}%-12s${CLR_RESET} %s" "$left_label" "$left_value")

    local right_str
    right_str=$(printf "${CLR_DIM}%-12s${CLR_RESET} %s" "$right_label" "$right_value")

    # Print left side, then separator, then right side
    # Use raw widths (without ANSI) for padding calculation
    local left_raw
    left_raw=$(printf "  %-12s %s" "$left_label" "$left_value")
    local left_len=${#left_raw}
    local pad_between=$(( half - left_len ))
    [[ "$pad_between" -lt 1 ]] && pad_between=1

    printf '\r'
    printf '%b' "$left_str"
    printf '%*s' "$pad_between" ""
    printf "${CLR_DIM}|${CLR_RESET}  "
    printf '%b' "$right_str"
    tput el 2>/dev/null || printf '\033[K'
    printf '\n'
}

# ── Utility functions ────────────────────────────────────────────────

# Check if terminal is wide enough for the panel
_display_can_render_panel() {
    local cols
    cols=$(_display_term_cols)
    [[ "$cols" -ge "$_DISPLAY_MIN_WIDTH" ]]
}

# Get terminal width (columns)
_display_term_cols() {
    local cols
    cols=$(tput cols 2>/dev/null) || cols=80
    echo "$cols"
}

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

    # Find pid directories matching current shell or any
    for pid_dir in "$worktree_dir"/.pids-*/; do
        [[ -d "$pid_dir" ]] || continue
        for pid_file in "$pid_dir"/pid_*; do
            [[ -f "$pid_file" ]] || continue
            local pid="${pid_file##*pid_}"
            # Check if the process is still running
            if kill -0 "$pid" 2>/dev/null; then
                count=$((count + 1))
            fi
        done
    done
    echo "$count"
}

# Refresh display data from state files, then redraw
display_refresh_from_state() {
    if [[ "$RALPH_DASHBOARD" != "true" ]]; then
        return 0
    fi

    # Read stories count
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

    # Read current story and retry count
    if type state_get_current &>/dev/null; then
        local current
        current=$(state_get_current 2>/dev/null || echo "")
        local retry
        retry=$(state_get_retry_count 2>/dev/null || echo "0")
        _DISPLAY_CURRENT_STORY="$current"
        _DISPLAY_RETRY_COUNT="$retry"
    fi

    # Read learnings count
    _DISPLAY_LEARNINGS_COUNT=$(_display_count_learnings)

    display_refresh
}

# ── Live timer ─────────────────────────────────────────────────────
# Background process that refreshes the dashboard every N seconds
# so the elapsed timer ticks while Claude is running.

display_start_live_timer() {
    [[ "$RALPH_DASHBOARD" != "true" ]] && return 0
    [[ "$_DISPLAY_INITIALIZED" != true ]] && return 0

    # Kill any existing timer
    display_stop_live_timer

    (
        trap 'exit 0' TERM INT
        while true; do
            sleep 1
            display_refresh_from_state 2>/dev/null || true
        done
    ) &
    _DISPLAY_TIMER_PID=$!
}

display_stop_live_timer() {
    if [[ -n "${_DISPLAY_TIMER_PID:-}" ]]; then
        kill "$_DISPLAY_TIMER_PID" 2>/dev/null
        wait "$_DISPLAY_TIMER_PID" 2>/dev/null || true
        _DISPLAY_TIMER_PID=""
    fi
}

_display_cleanup() {
    display_stop_live_timer
    printf '\033[r'          # reset scroll region to full terminal
    printf '\033[%d;1H' "$(tput lines 2>/dev/null || echo 24)"  # move cursor to bottom
}
