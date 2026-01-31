#!/usr/bin/env bats
# Tier 2 — Filesystem tests for stories.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    copy_fixture stories.txt .ralph/stories.txt
}

teardown() {
    teardown_test_environment
}

@test "stories_list_all: returns non-skipped IDs" {
    run stories_list_all
    assert_success
    # Should have 5 stories (1.1, 1.2, 2.1, 2.2, 3.1) — excludes 'x 1.3'
    assert_line --index 0 "1.1"
    assert_line --index 1 "1.2"
    assert_line --index 2 "2.1"
    assert_line --index 3 "2.2"
    assert_line --index 4 "3.1"
    # Verify skipped story not present
    refute_output --partial "1.3"
}

@test "stories_list_all: skips comment lines" {
    run stories_list_all
    assert_success
    refute_output --partial "#"
    refute_output --partial "Ralph Story Queue"
}

@test "stories_get_title: returns correct title" {
    run stories_get_title "1.1"
    assert_success
    assert_output "Initialize Project"
}

@test "stories_get_title: unknown story returns failure" {
    run stories_get_title "99.99"
    assert_failure
}

@test "stories_count_total: returns 5" {
    run stories_count_total
    assert_success
    assert_output "5"
}

@test "stories_get_batch: story in batch returns batch number" {
    run stories_get_batch "2.1"
    assert_success
    assert_output "1"
}

@test "stories_get_batch: story with no batch returns 0" {
    run stories_get_batch "1.1"
    assert_success
    assert_output "0"
}

@test "stories_get_batch_members: returns all stories in batch" {
    run stories_get_batch_members "1"
    assert_success
    assert_line --index 0 "2.1"
    assert_line --index 1 "2.2"
}

@test "stories_find_next: with partially-completed state returns first uncompleted" {
    copy_fixture state-partial.json .ralph/state.json
    # state-partial has 1.1, 1.2, 2.1 completed
    run stories_find_next
    assert_success
    assert_output "2.2"
}
