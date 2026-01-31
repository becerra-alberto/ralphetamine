#!/usr/bin/env bats
# Tier 3 — Component tests for _run_sequential with mocked Claude
# Tests the full sequential runner loop: DONE/FAIL/timeout/no-signal paths,
# iteration limit, dry-run, and specific-story modes.

# The mock timeout command simply passes through to the underlying command.
# It must be a function (not a script) so it inherits PATH and can find 'claude'.
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

    # Source all libraries that _run_sequential depends on
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
    # This avoids the PATH issues with mock script files
    prereqs_timeout_cmd() { echo "_mock_timeout"; }

    # Mock claude CLI via script on PATH
    create_mock_command "claude" 'echo "mock"'

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "DONE path: marks story completed and writes progress" {
    mock_claude_output "claude-outputs/done.txt"
    run _run_sequential 1 1800 false false "1.1" ""
    assert_success
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" == *"1.1"* ]]
    assert_file_contains "progress.txt" "[DONE]"
    assert_file_contains "progress.txt" "1.1"
}

@test "FAIL path: increments retry and writes progress" {
    mock_claude_output "claude-outputs/fail.txt"
    run _run_sequential 1 1800 false false "1.1" ""
    assert_success
    assert_json_field ".ralph/state.json" ".retry_count" "1"
    assert_file_contains "progress.txt" "[FAIL]"
}

@test "Timeout path (exit 124): records timeout and increments retry" {
    # Override timeout function to simulate exit 124 (timeout)
    _mock_timeout() { return 124; }
    run _run_sequential 1 1800 false false "1.1" ""
    assert_success
    assert_json_field ".ralph/state.json" ".retry_count" "1"
    assert_file_contains "progress.txt" "Timeout"
}

@test "No-signal path: records missing signal and increments retry" {
    mock_claude_output "claude-outputs/no-signal.txt"
    run _run_sequential 1 1800 false false "1.1" ""
    assert_success
    assert_json_field ".ralph/state.json" ".retry_count" "1"
    assert_file_contains "progress.txt" "No completion signal"
}

@test "Iteration limit stops loop after N iterations" {
    mock_claude_output "claude-outputs/fail.txt"
    run _run_sequential 1 1800 false false "1.1" ""
    assert_success
    assert_json_field ".ralph/state.json" ".retry_count" "1"
}

@test "Dry-run skips Claude invocation and shows DRY RUN marker" {
    run _run_sequential 1 1800 false true "1.1" ""
    assert_success
    assert_output --partial "[DRY RUN]"
    assert_json_field ".ralph/state.json" ".retry_count" "0"
}

@test "Specific story (-s) runs only that story" {
    create_mock_command "claude" "echo '<ralph>DONE 2.1</ralph>'"
    run _run_sequential 1 1800 false false "2.1" ""
    assert_success
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" == *"2.1"* ]]
    [[ "$completed" != *"1.1"* ]]
}
