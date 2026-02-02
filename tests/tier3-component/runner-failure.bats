#!/usr/bin/env bats
# Tier 3 — Component tests for runner.sh _handle_failure

# Wrapper must be defined before any @test blocks
_wrapped_handle_failure() {
    _handle_failure "$@"
}

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"
    source_ralph_lib "runner"
    copy_fixture state-empty.json .ralph/state.json
    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "_handle_failure: increments retry count in state.json" {
    run _wrapped_handle_failure "2.1" "npm test failed" "specs/epic-2/story-2.1.md" "3"
    assert_success
    assert_json_field ".ralph/state.json" ".retry_count" "1"
}

@test "_handle_failure: appends FAIL line to progress.txt with attempt count" {
    run _wrapped_handle_failure "2.1" "npm test failed" "specs/epic-2/story-2.1.md" "3"
    assert_success
    assert_file_contains "progress.txt" "FAIL"
    assert_file_contains "progress.txt" "2.1"
    assert_file_contains "progress.txt" "attempt 1/3"
}

@test "_handle_failure: at max retries exits with code 1" {
    state_increment_retry "2.1"
    state_increment_retry "2.1"
    run _wrapped_handle_failure "2.1" "persistent failure" "specs/epic-2/story-2.1.md" "3"
    assert_failure
    assert_output --partial "MAX RETRIES"
}

@test "_handle_failure: under max retries returns normally" {
    run _wrapped_handle_failure "2.1" "transient error" "specs/epic-2/story-2.1.md" "3"
    assert_success
    assert_json_field ".ralph/state.json" ".retry_count" "1"
}

@test "_handle_failure: returns 1 at max retries (not exit)" {
    # Pre-increment retries to reach the limit
    state_increment_retry "2.1"
    state_increment_retry "2.1"
    # With return 1 (not exit 1), BATS `run` captures it as a failure status
    run _wrapped_handle_failure "2.1" "persistent failure" "specs/epic-2/story-2.1.md" "3"
    assert_failure
    assert_output --partial "MAX RETRIES"
    # Verify progress.txt was still written before returning
    assert_file_contains "progress.txt" "FAIL"
    assert_file_contains "progress.txt" "persistent failure"
}
