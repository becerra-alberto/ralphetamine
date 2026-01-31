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

@test "ralph_on_exit appends to handler registry" {
    ralph_on_exit "echo handler1"
    [[ ${#_RALPH_EXIT_HANDLERS[@]} -eq 1 ]]
    [[ "${_RALPH_EXIT_HANDLERS[0]}" == "echo handler1" ]]
}

@test "ralph_on_exit: multiple handlers registered" {
    ralph_on_exit "echo first"
    ralph_on_exit "echo second"
    ralph_on_exit "echo third"
    [[ ${#_RALPH_EXIT_HANDLERS[@]} -eq 3 ]]
}

@test "_ralph_run_exit_handlers executes all in order" {
    _RALPH_EXIT_HANDLERS=()
    ralph_on_exit 'echo "handler_a"'
    ralph_on_exit 'echo "handler_b"'

    run _ralph_run_exit_handlers
    assert_success
    assert_line --index 0 "handler_a"
    assert_line --index 1 "handler_b"
}

@test "_ralph_run_exit_handlers: failed handler does not block others" {
    _RALPH_EXIT_HANDLERS=()
    ralph_on_exit 'false'
    ralph_on_exit 'echo "still_runs"'

    run _ralph_run_exit_handlers
    assert_success
    assert_output --partial "still_runs"
}
