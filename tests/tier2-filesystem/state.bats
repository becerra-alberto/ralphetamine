#!/usr/bin/env bats
# Tier 2 — Filesystem tests for state.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"
}

teardown() {
    teardown_test_environment
}

@test "state_init: creates empty state.json when no file exists" {
    run state_init
    assert_success
    [[ -f ".ralph/state.json" ]]
    assert_json_field ".ralph/state.json" ".retry_count" "0"
    assert_json_field ".ralph/state.json" ".current_story" "null"
}

@test "state_init: bootstraps from legacy progress.txt" {
    copy_fixture progress-legacy.txt progress.txt
    run state_init
    assert_success
    [[ -f ".ralph/state.json" ]]
    # Should have 3 unique completed stories (1.1, 1.2, 2.1)
    local count
    count=$(jq '.completed_stories | length' ".ralph/state.json")
    [[ "$count" -eq 3 ]]
}

@test "state_mark_done: marks story as completed" {
    copy_fixture state-empty.json .ralph/state.json
    state_mark_done "3.1"
    run state_is_completed "3.1"
    assert_success
}

@test "state_mark_done: resets retry_count to 0" {
    copy_fixture state-retrying.json .ralph/state.json
    state_mark_done "1.2"
    assert_json_field ".ralph/state.json" ".retry_count" "0"
}

@test "state_increment_retry: increments counter" {
    copy_fixture state-empty.json .ralph/state.json
    state_increment_retry "2.1"
    assert_json_field ".ralph/state.json" ".retry_count" "1"
    state_increment_retry "2.1"
    assert_json_field ".ralph/state.json" ".retry_count" "2"
}

@test "state_set_current / state_get_current: roundtrip" {
    copy_fixture state-empty.json .ralph/state.json
    state_set_current "4.2"
    run state_get_current
    assert_success
    assert_output "4.2"
}

@test "state_completed_count: returns correct count from fixture" {
    copy_fixture state-partial.json .ralph/state.json
    run state_completed_count
    assert_success
    assert_output "3"
}

@test "state_is_completed: non-completed story returns failure" {
    copy_fixture state-partial.json .ralph/state.json
    run state_is_completed "99.99"
    assert_failure
}
