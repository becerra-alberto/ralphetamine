#!/usr/bin/env bats
# Tier 3 — Production-faithful integration tests for _run_sequential
#
# These tests reproduce failure modes that the standard test suite misses because:
#   1. BATS `run` executes in a $() subshell that isolates shell options
#   2. Mocks simulate exit codes without real OS-level signals
#   3. Test setup never enables `set -Eeuo pipefail`
#
# Key technique: execute _run_sequential DIRECTLY (no `run`) in the test shell
# with `set -Eeuo pipefail` active, then assert via side-effect files.
# Strict mode is enabled per-test (not in setup) to avoid interfering with BATS.

# The mock timeout command simply passes through to the underlying command.
# Must be a function (not a script) so it inherits PATH and can find 'claude'.
_mock_timeout() {
    shift  # discard the timeout-seconds argument
    "$@"
}

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project

    # Disable dashboard — no terminal in test environment
    export RALPH_DASHBOARD="false"

    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "prompt"
    source_ralph_lib "signals"
    source_ralph_lib "hooks"
    source_ralph_lib "learnings"
    source_ralph_lib "testing"
    source_ralph_lib "runner"

    config_load

    # Override prereqs_timeout_cmd to return our shell function name
    prereqs_timeout_cmd() { echo "_mock_timeout"; }

    # Default mock claude — individual tests override as needed
    create_mock_command "claude" 'echo "mock"'

    # Redirect log to a real file so we can assert against it
    export RALPH_LOG_FILE="ralph.log"
    touch ralph.log
    touch progress.txt
}

teardown() {
    set +Eeu +o pipefail 2>/dev/null || true
    cleanup_mocks
    teardown_test_environment
}

# ─── Test 1: No false CRASH on successful DONE ─────────────────────────
# Targets: ui.sh ERR trap BASH_SUBSHELL guard
#
# Without the guard, internal $() calls (stories_find_next, state_completed_count)
# trigger the ERR trap and produce false [CRASH] lines even on success.
@test "production: no false CRASH on successful DONE" {
    mock_claude_output "claude-outputs/done.txt"

    # Enable production shell options, then run directly (no BATS `run`)
    set -Eeuo pipefail
    _run_sequential 1 1800 false false "1.1" "" || true
    set +Eeu +o pipefail

    # Assert: zero [CRASH] entries in log
    assert_file_not_contains "ralph.log" "[CRASH]"

    # Assert: story 1.1 is marked completed
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" == *"1.1"* ]]
}

# ─── Test 2: No false CRASH on timeout ─────────────────────────────────
# Targets: ui.sh ERR trap BASH_SUBSHELL guard + runner.sh file-based capture
#
# Without the guard, the timeout exit code propagates through $() and fires
# the ERR trap. This catches both the runner.sh $() removal and the ui.sh
# subshell guard.
@test "production: no false CRASH on timeout" {
    # Override timeout function to simulate exit 124
    _mock_timeout() { return 124; }

    set -Eeuo pipefail
    _run_sequential 1 1800 false false "1.1" "" || true
    set +Eeu +o pipefail

    # Assert: zero [CRASH] entries in log
    assert_file_not_contains "ralph.log" "[CRASH]"

    # Assert: progress records timeout
    assert_file_contains "progress.txt" "Timeout"

    # Assert: retry count incremented
    assert_json_field ".ralph/state.json" ".retry_count" "1"
}

# ─── Test 3: DONE with no LEARN tags succeeds under pipefail ───────────
# Targets: signals.sh `|| true` fix in signals_parse_learnings
#
# Without `|| true`, grep returns 1 (no matches), pipefail propagates it,
# and the function fails — causing a crash or false failure.
@test "production: DONE with no LEARN tags succeeds under pipefail" {
    mock_claude_output "claude-outputs/done-no-learns.txt"

    set -Eeuo pipefail
    _run_sequential 1 1800 false false "1.1" "" || true
    set +Eeu +o pipefail

    # Assert: story completed successfully
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" == *"1.1"* ]]

    # Assert: zero [CRASH] entries
    assert_file_not_contains "ralph.log" "[CRASH]"
}

# ─── Test 4: Output file written even on timeout ───────────────────────
# Targets: runner.sh file-based capture
#
# With the old $() pattern, timeout would discard pipe buffers and result
# would be empty. With file-based capture, output written before timeout
# is preserved on disk.
@test "production: output file written even on simulated timeout" {
    # Mock claude writes output then the timeout wrapper returns 124
    create_mock_command "claude" 'echo "partial output before timeout"'
    _mock_timeout() {
        shift  # discard timeout seconds
        "$@"   # run claude (which writes output)
        return 124
    }

    set -Eeuo pipefail
    _run_sequential 1 1800 false false "1.1" "" || true
    set +Eeu +o pipefail

    # Assert: output file exists and has content
    [[ -f ".ralph/last-claude-output.txt" ]]
    [[ -s ".ralph/last-claude-output.txt" ]]
    assert_file_contains ".ralph/last-claude-output.txt" "partial output before timeout"
}

# ─── Test 5: Real timeout kills mock claude, output survives ───────────
# Targets: runner.sh file-based capture with actual SIGTERM
#
# This is the only test that uses a real timeout command to send SIGTERM.
# It verifies the core fix: file redirect survives process termination.
@test "production: real timeout kills slow claude, output survives" {
    # Determine which timeout command is available
    local real_timeout=""
    if command -v gtimeout &>/dev/null; then
        real_timeout="gtimeout"
    elif command -v timeout &>/dev/null; then
        real_timeout="timeout"
    else
        skip "no timeout/gtimeout command available"
    fi

    # Mock claude: writes output then sleeps long enough to be killed
    create_mock_command "claude" '
echo "output written before sleep"
sleep 30
echo "this should never appear"
'

    # Override prereqs to return the real timeout command
    eval "prereqs_timeout_cmd() { echo '$real_timeout'; }"

    set -Eeuo pipefail
    _run_sequential 1 2 false false "1.1" "" || true
    set +Eeu +o pipefail

    # Assert: output file contains text written before the sleep/kill
    [[ -f ".ralph/last-claude-output.txt" ]]
    assert_file_contains ".ralph/last-claude-output.txt" "output written before sleep"

    # Assert: timeout was recorded in progress
    assert_file_contains "progress.txt" "Timeout"
}
