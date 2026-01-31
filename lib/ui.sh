#!/bin/bash
# Ralph v2 — UI helpers: logging, colors, box drawing, trap registry

# ── Centralized EXIT trap registry ──────────────────────────────────────────
# Multiple modules (caffeine, parallel PID cleanup) need EXIT traps.
# This registry prevents trap clobbering — each module registers a handler
# via ralph_on_exit() instead of calling `trap` directly.
_RALPH_EXIT_HANDLERS=()

ralph_on_exit() {
    _RALPH_EXIT_HANDLERS+=("$1")
}

_ralph_run_exit_handlers() {
    if [[ ${#_RALPH_EXIT_HANDLERS[@]} -gt 0 ]]; then
        for handler in "${_RALPH_EXIT_HANDLERS[@]}"; do
            eval "$handler" || true
        done
    fi
}
trap _ralph_run_exit_handlers EXIT

# ── Colors ──────────────────────────────────────────────────────────────────
readonly CLR_RESET='\033[0m'
readonly CLR_RED='\033[0;31m'
readonly CLR_GREEN='\033[0;32m'
readonly CLR_YELLOW='\033[0;33m'
readonly CLR_BLUE='\033[0;34m'
readonly CLR_CYAN='\033[0;36m'
readonly CLR_DIM='\033[2m'
readonly CLR_BOLD='\033[1m'

# ── Logging ─────────────────────────────────────────────────────────────────

RALPH_LOG_FILE="${RALPH_LOG_FILE:-ralph.log}"
RALPH_VERBOSE="${RALPH_VERBOSE:-false}"

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $*" | tee -a "$RALPH_LOG_FILE"
}

log_debug() {
    if [[ "$RALPH_VERBOSE" == true ]]; then
        local timestamp
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo -e "${CLR_DIM}[$timestamp] $*${CLR_RESET}" | tee -a "$RALPH_LOG_FILE"
    fi
}

log_success() {
    echo -e "${CLR_GREEN}[OK]${CLR_RESET} $*"
    log "[OK] $*"
}

log_error() {
    echo -e "${CLR_RED}[ERROR]${CLR_RESET} $*" >&2
    log "[ERROR] $*"
}

log_warn() {
    echo -e "${CLR_YELLOW}[WARN]${CLR_RESET} $*"
    log "[WARN] $*"
}

log_info() {
    echo -e "${CLR_CYAN}[INFO]${CLR_RESET} $*"
    log "[INFO] $*"
}

# ── Box drawing ─────────────────────────────────────────────────────────────

box_header() {
    local title="$1"
    local width=68
    local pad=$(( (width - ${#title} - 2) / 2 ))
    local pad_right=$(( width - ${#title} - 2 - pad ))

    echo ""
    printf '╔'; printf '═%.0s' $(seq 1 $width); printf '╗\n'
    printf '║'; printf ' %.0s' $(seq 1 $pad); printf '%s' "$title"; printf ' %.0s' $(seq 1 $pad_right); printf '║\n'
    printf '╚'; printf '═%.0s' $(seq 1 $width); printf '╝\n'
    echo ""
}

box_kv() {
    local key="$1"
    local value="$2"
    printf "  ${CLR_DIM}%-14s${CLR_RESET} %s\n" "$key:" "$value"
}

iteration_header() {
    local current="$1"
    local total="$2"
    echo ""
    echo "┌────────────────────────────────────────────────────────────────────┐"
    printf "│  Iteration %-3s of %-3s                                              │\n" "$current" "$total"
    echo "└────────────────────────────────────────────────────────────────────┘"
}

divider() {
    echo "────────────────────────────────────────────────────────────────────"
}

# ── Progress bar ─────────────────────────────────────────────────────
# Renders a progress bar string: [████████░░░░] 5/12
# Usage: ui_progress_bar <completed> <total> [width]
# Width defaults to 20. Output is returned via stdout (no newline).
ui_progress_bar() {
    local completed="$1"
    local total="$2"
    local width="${3:-20}"

    if [[ "$total" -le 0 ]]; then
        printf '['; printf '░%.0s' $(seq 1 "$width"); printf '] 0/0'
        return 0
    fi

    local filled=$(( (completed * width) / total ))
    # Clamp filled to width
    [[ "$filled" -gt "$width" ]] && filled="$width"
    local empty=$(( width - filled ))

    printf '['
    [[ "$filled" -gt 0 ]] && printf '█%.0s' $(seq 1 "$filled")
    [[ "$empty" -gt 0 ]] && printf '░%.0s' $(seq 1 "$empty")
    printf '] %d/%d' "$completed" "$total"
}
