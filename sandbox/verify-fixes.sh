#!/usr/bin/env bash
# verify-fixes.sh — Spawn Terminal.app windows to run the full test matrix
#
# Phase 1: 3 parallel terminals (run-sequential, run-parallel, run-full)
# Phase 2: Sequential tests on run-sequential (dry-run, single-story, timeout)
# Phase 3: Retry test on run-parallel (run twice with reset between)
#
# Usage:
#   ./verify-fixes.sh           # Interactive — runs phase 1, prompts for 2 & 3
#   ./verify-fixes.sh phase1    # Just the 3 parallel runs
#   ./verify-fixes.sh phase2    # Just dry-run / single-story / timeout
#   ./verify-fixes.sh phase3    # Just the retry test
#   ./verify-fixes.sh all       # All phases, prompted between each

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
header(){ echo -e "\n${BOLD}━━━ $* ━━━${NC}\n"; }

# Open a new Terminal.app window and run a command
spawn_terminal() {
    local title="$1"
    local cmd="$2"
    osascript <<EOF
tell application "Terminal"
    activate
    set newTab to do script "${cmd//\"/\\\"}"
    set custom title of front window to "${title//\"/\\\"}"
end tell
EOF
    ok "Spawned: $title"
}

reset_sandbox() {
    local name="$1"
    local dir="$SCRIPT_DIR/$name"
    if [[ -f "$dir/reset.sh" ]]; then
        info "Resetting $name..."
        (cd "$dir" && bash reset.sh) 2>&1 | sed 's/^/    /'
        ok "$name reset"
    else
        warn "No reset.sh for $name"
    fi
}

wait_for_enter() {
    echo ""
    echo -e "${YELLOW}$1${NC}"
    read -r -p "Press Enter to continue (or Ctrl-C to abort)... "
    echo ""
}

# ─── Phase 1: Parallel runs ─────────────────────────────────────────────────

phase1() {
    header "PHASE 1: Parallel Runs (3 terminals)"
    echo "  T1: run-sequential  — ralph run (greeter, 3 stories)"
    echo "  T2: run-parallel    — ralph run (bookmarks, 6 stories in 3 batches)"
    echo "  T3: run-full        — ralph run (calculator, 5 stories mixed mode)"
    echo ""

    # Reset all 3
    reset_sandbox "run-sequential"
    reset_sandbox "run-parallel"
    reset_sandbox "run-full"
    echo ""

    # Spawn 3 terminals
    spawn_terminal "T1: Sequential (greeter)" \
        "cd '$SCRIPT_DIR/run-sequential' && echo '=== T1: Sequential Run (greeter) ===' && ralph run --no-tmux --no-interactive; echo ''; echo 'T1 FINISHED — press Ctrl-C or close window'; read"

    spawn_terminal "T2: Parallel (bookmarks)" \
        "cd '$SCRIPT_DIR/run-parallel' && echo '=== T2: Parallel Run (bookmarks) ===' && ralph run --no-tmux --no-interactive; echo ''; echo 'T2 FINISHED — press Ctrl-C or close window'; read"

    spawn_terminal "T3: Full (calculator)" \
        "cd '$SCRIPT_DIR/run-full' && echo '=== T3: Full Run (calculator) ===' && ralph run --no-tmux --no-interactive; echo ''; echo 'T3 FINISHED — press Ctrl-C or close window'; read"

    echo ""
    info "3 terminals spawned. Watch for:"
    echo "  T1: Should complete 3/3 stories sequentially"
    echo "  T2: Should complete 6/6 — batch 0 (1.1, 1.2 seq) -> batch 1 (2.1-2.3 parallel) -> batch 2 (3.1 seq)"
    echo "  T3: Should complete 5/5 — batch 0 (1.1, 1.2 seq) -> batch 1 (2.1, 2.2 parallel) -> batch 2 (3.1 seq)"
}

# ─── Phase 2: Sequential tests (dry-run, single-story, timeout) ─────────────

phase2() {
    header "PHASE 2: Sequential Tests (1 terminal, 3 sub-tests)"
    echo "  T4: Dry run         — ralph run -d"
    echo "  T5: Single story    — ralph run -s 1.1 -v  (check dashboard shows N/N not N+1/N)"
    echo "  T6: Short timeout   — ralph run -s 1.1 -t 2  (should trigger retry path)"
    echo ""

    reset_sandbox "run-sequential"

    # Build a compound command that runs all 3 sub-tests in sequence
    local cmd
    cmd=$(cat <<'INNEREOF'
cd 'SANDBOX_DIR'

echo '━━━ T4: Dry Run ━━━'
echo ''
ralph run -d --no-tmux --no-interactive
echo ''
echo 'T4 done. Expected: rendered prompts for each story, no actual execution.'
echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
read -p 'Press Enter for T5 (single story + verbose)...'

echo ''
echo 'Resetting sandbox...'
bash reset.sh
echo ''

echo '━━━ T5: Single Story + Verbose ━━━'
echo 'Watch: dashboard should show correct count (N/N), NOT N+1/N'
echo ''
ralph run -s 1.1 -v --no-tmux --no-interactive
echo ''
echo 'T5 done. Was the dashboard count correct (not 4/3 or similar)?'
echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
read -p 'Press Enter for T6 (short timeout)...'

echo ''
echo 'Resetting sandbox...'
bash reset.sh
echo ''

echo '━━━ T6: Short Timeout (2s) ━━━'
echo 'Expected: timeout triggers retry path.'
echo ''
ralph run -s 1.1 -t 2 --no-tmux --no-interactive
echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'T6 done. Expected: timeout after 2s, retry path exercised.'
echo ''
echo 'PHASE 2 COMPLETE — press Ctrl-C or close window'
read
INNEREOF
)
    # Replace placeholder with actual path
    cmd="${cmd//SANDBOX_DIR/$SCRIPT_DIR/run-sequential}"

    spawn_terminal "T4-T6: Sequential Tests" "$cmd"

    echo ""
    info "Terminal spawned. Follow the prompts inside it for each sub-test."
}

# ─── Phase 3: Retry test ────────────────────────────────────────────────────

phase3() {
    header "PHASE 3: Retry Test (1 terminal, run parallel twice)"
    echo "  T7: Run parallel -> reset -> run parallel again"
    echo "  Verifies worktree cleanup: second run should NOT fail on 'git worktree add'"
    echo ""

    reset_sandbox "run-parallel"

    local cmd
    cmd=$(cat <<'INNEREOF'
cd 'SANDBOX_DIR'

echo '━━━ T7: Retry Test — First Run ━━━'
echo ''
ralph run --no-tmux --no-interactive
echo ''
echo 'First run complete.'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
read -p 'Press Enter to reset and run again...'

echo ''
echo 'Resetting sandbox...'
bash reset.sh
echo ''

echo '━━━ T7: Retry Test — Second Run ━━━'
echo 'Watch: should NOT see "Failed to create worktree" errors'
echo ''
ralph run --no-tmux --no-interactive
echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'Second run complete. Any worktree errors above = BUG NOT FIXED'
echo ''
echo 'PHASE 3 COMPLETE — press Ctrl-C or close window'
read
INNEREOF
)
    cmd="${cmd//SANDBOX_DIR/$SCRIPT_DIR/run-parallel}"

    spawn_terminal "T7: Retry Test" "$cmd"

    echo ""
    info "Terminal spawned. Follow the prompts inside it."
}

# ─── Main ────────────────────────────────────────────────────────────────────

usage() {
    cat <<EOF
Usage: $(basename "$0") [phase1|phase2|phase3|all]

Phases:
  phase1    3 parallel terminals: sequential, parallel, full runs
  phase2    1 terminal: dry-run, single-story, timeout (sequential)
  phase3    1 terminal: retry test (run parallel twice)
  all       All phases with prompts between each

No argument: same as 'all'

Test matrix:
  T1  run-sequential   ralph run                           Phase 1
  T2  run-parallel     ralph run                           Phase 1
  T3  run-full         ralph run                           Phase 1
  T4  run-sequential   ralph run -d                        Phase 2
  T5  run-sequential   ralph run -s 1.1 -v                 Phase 2
  T6  run-sequential   ralph run -s 1.1 -t 2               Phase 2
  T7  run-parallel     ralph run (twice, reset between)    Phase 3
EOF
}

case "${1:-all}" in
    phase1)
        phase1
        ;;
    phase2)
        phase2
        ;;
    phase3)
        phase3
        ;;
    all)
        header "RALPH v2 — FIX VERIFICATION TEST MATRIX"
        echo "This will spawn Terminal.app windows in 3 phases."
        echo "Total: 5 terminals, 7 test runs, 3 sandboxes."
        echo ""

        phase1
        wait_for_enter "Wait for Phase 1 terminals (T1-T3) to finish before continuing."

        phase2
        wait_for_enter "Wait for Phase 2 terminal (T4-T6) to finish before continuing."

        phase3

        echo ""
        header "ALL PHASES LAUNCHED"
        echo "Expected outcomes after all fixes:"
        echo "  T1: 3/3 sequential stories complete"
        echo "  T2: 6/6 parallel stories (batch 0 seq -> batch 1 parallel -> batch 2 seq)"
        echo "  T3: 5/5 mixed stories (batch 0 seq -> batch 1 parallel -> batch 2 seq)"
        echo "  T4: Dry run renders prompts without executing"
        echo "  T5: Dashboard shows N/N, NOT N+1/N"
        echo "  T6: Timeout after 2s, retry path exercised"
        echo "  T7: Second run has NO worktree creation errors"
        ;;
    -h|--help)
        usage
        ;;
    *)
        echo "Unknown phase: $1"
        usage
        exit 1
        ;;
esac
