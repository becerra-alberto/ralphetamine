#!/usr/bin/env bats
# Tier 2 — Extra filesystem tests for stories.sh
# Covers stories_append, stories_count_remaining, stories_list_details

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    copy_fixture stories.txt .ralph/stories.txt
    copy_fixture state-partial.json .ralph/state.json
}

teardown() {
    teardown_test_environment
}

@test "stories_append: adds new story to stories.txt" {
    stories_append "4.1" "New Feature Story"
    assert_file_contains ".ralph/stories.txt" "4.1 | New Feature Story"
}

@test "stories_count_remaining: with partial state returns correct count" {
    # state-partial.json has [1.1, 1.2, 2.1] completed
    # stories.txt has 5 active stories: 1.1, 1.2, 2.1, 2.2, 3.1
    # Remaining = 5 - 3 = 2
    run stories_count_remaining
    assert_success
    assert_output "2"
}

@test "stories_list_details: returns full lines excluding skipped and comments" {
    run stories_list_details
    assert_success
    # Should include active stories with their titles
    assert_output --partial "1.1 | Initialize Project"
    assert_output --partial "2.1 | First Parallel Story"
    assert_output --partial "3.1 | Regular Story"
    # Should NOT include skipped story or comments
    refute_output --partial "x 1.3"
    refute_output --partial "# Ralph Story Queue"
}
