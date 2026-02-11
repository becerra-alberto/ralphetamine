#!/usr/bin/env bats
# Tier 2 — Filesystem tests for decomposition state management

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

@test "state_mark_decomposed: marks parent as completed" {
    copy_fixture state-empty.json .ralph/state.json
    # Ensure schema has decomposed_stories field
    _state_ensure_schema
    state_mark_decomposed "3.1" "3.1.1" "3.1.2"
    run state_is_completed "3.1"
    assert_success
}

@test "state_mark_decomposed: records children in decomposed_stories" {
    copy_fixture state-empty.json .ralph/state.json
    _state_ensure_schema
    state_mark_decomposed "3.1" "3.1.1" "3.1.2" "3.1.3"
    # Verify decomposed_stories has the parent key
    local child_count
    child_count=$(jq '.decomposed_stories["3.1"] | length' .ralph/state.json)
    [[ "$child_count" -eq 3 ]]
}

@test "state_mark_decomposed: resets retry count" {
    copy_fixture state-retrying.json .ralph/state.json
    _state_ensure_schema
    state_mark_decomposed "1.2" "1.2.1" "1.2.2"
    assert_json_field ".ralph/state.json" ".retry_count" "0"
}

@test "state_is_decomposed: returns true for decomposed story" {
    copy_fixture state-empty.json .ralph/state.json
    _state_ensure_schema
    state_mark_decomposed "3.1" "3.1.1" "3.1.2"
    run state_is_decomposed "3.1"
    assert_success
}

@test "state_is_decomposed: returns false for non-decomposed story" {
    copy_fixture state-empty.json .ralph/state.json
    _state_ensure_schema
    run state_is_decomposed "3.1"
    assert_failure
}

@test "state_get_decomposition_children: returns children" {
    copy_fixture state-empty.json .ralph/state.json
    _state_ensure_schema
    state_mark_decomposed "3.1" "3.1.1" "3.1.2"
    run state_get_decomposition_children "3.1"
    assert_success
    assert_line --index 0 "3.1.1"
    assert_line --index 1 "3.1.2"
}

@test "_state_ensure_schema: adds decomposed_stories field to legacy state" {
    copy_fixture state-empty.json .ralph/state.json
    # state-empty.json might not have decomposed_stories
    _state_ensure_schema
    local has_field
    has_field=$(jq 'has("decomposed_stories")' .ralph/state.json)
    [[ "$has_field" == "true" ]]
}
