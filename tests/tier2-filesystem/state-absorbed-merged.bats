#!/usr/bin/env bats
# Tier 2 — Filesystem tests for state absorbed/merged operations and schema upgrade

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"
    mkdir -p .ralph
    copy_fixture state-empty.json .ralph/state.json
}

teardown() {
    teardown_test_environment
}

@test "state_mark_absorbed: adds to absorbed_stories map and completed_stories" {
    # Ensure schema has absorbed/merged fields
    _state_ensure_schema
    state_mark_absorbed "2.1" "1.1"
    assert_json_field ".ralph/state.json" '.absorbed_stories["2.1"]' "1.1"
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json)
    echo "$completed" | grep -q "^2.1$"
}

@test "state_is_absorbed: returns 0 for absorbed story" {
    _state_ensure_schema
    state_mark_absorbed "2.1" "1.1"
    run state_is_absorbed "2.1"
    assert_success
}

@test "state_is_absorbed: returns 1 for non-absorbed story" {
    _state_ensure_schema
    run state_is_absorbed "3.1"
    assert_failure
}

@test "state_absorbed_by: returns the absorber story ID" {
    _state_ensure_schema
    state_mark_absorbed "2.1" "1.1"
    run state_absorbed_by "2.1"
    assert_success
    assert_output "1.1"
}

@test "state_mark_merged: adds to merged_stories array" {
    _state_ensure_schema
    state_mark_merged "1.1"
    local merged
    merged=$(jq -r '.merged_stories[]' .ralph/state.json)
    echo "$merged" | grep -q "^1.1$"
}

@test "state_get_merged: returns merged story list" {
    _state_ensure_schema
    state_mark_merged "1.1"
    state_mark_merged "2.1"
    run state_get_merged
    assert_success
    assert_line --index 0 "1.1"
    assert_line --index 1 "2.1"
}

@test "_state_ensure_schema: upgrades legacy state and is idempotent" {
    # Use legacy state without absorbed/merged fields
    copy_fixture state-legacy-no-absorbed.json .ralph/state.json

    # Should not have absorbed_stories or merged_stories
    run jq -e '.absorbed_stories' .ralph/state.json
    assert_failure

    # Upgrade schema
    _state_ensure_schema

    # Now should have both fields
    run jq -e '.absorbed_stories' .ralph/state.json
    assert_success
    run jq -e '.merged_stories' .ralph/state.json
    assert_success

    # Existing data preserved
    assert_json_field ".ralph/state.json" '.completed_stories[0]' "1.1"

    # Idempotent — running again should not error
    _state_ensure_schema
    assert_json_field ".ralph/state.json" '.completed_stories[0]' "1.1"
}
