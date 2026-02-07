#!/usr/bin/env bats
# Tier 1 — Pure unit tests for ui.sh trap registry

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    # Reset the handler array before each test
    _RALPH_EXIT_HANDLERS=()
    source_ralph_lib "ui"
    # Re-reset after sourcing since ui.sh initializes the array
    _RALPH_EXIT_HANDLERS=()
}

# Helper functions for tests
_test_handler_a() { echo "handler_a"; }
_test_handler_b() { echo "handler_b"; }
_test_handler_noop() { :; }
_test_handler_fail() { return 1; }
_test_handler_still_runs() { echo "still_runs"; }

@test "ralph_on_exit appends to handler registry" {
    ralph_on_exit _test_handler_noop
    [[ ${#_RALPH_EXIT_HANDLERS[@]} -eq 1 ]]
    [[ "${_RALPH_EXIT_HANDLERS[0]}" == "_test_handler_noop" ]]
}

@test "ralph_on_exit: multiple handlers registered" {
    ralph_on_exit _test_handler_a
    ralph_on_exit _test_handler_b
    ralph_on_exit _test_handler_noop
    [[ ${#_RALPH_EXIT_HANDLERS[@]} -eq 3 ]]
}

@test "_ralph_run_exit_handlers executes all in order" {
    _RALPH_EXIT_HANDLERS=()
    ralph_on_exit _test_handler_a
    ralph_on_exit _test_handler_b

    run _ralph_run_exit_handlers
    assert_success
    assert_line --index 0 "handler_a"
    assert_line --index 1 "handler_b"
}

@test "_ralph_run_exit_handlers: failed handler does not block others" {
    _RALPH_EXIT_HANDLERS=()
    ralph_on_exit _test_handler_fail
    ralph_on_exit _test_handler_still_runs

    run _ralph_run_exit_handlers
    assert_success
    assert_output --partial "still_runs"
}
