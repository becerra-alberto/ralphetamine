#!/usr/bin/env bats
# Tier 4 — Workflow test: ralph status & ralph stories

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project
    # Pre-populate state with some completed stories
    copy_fixture state-partial.json .ralph/state.json
    RALPH_BIN="${RALPH_DIR}/bin/ralph"
}

teardown() {
    teardown_test_environment
}

@test "ralph status: output contains completed count and project name" {
    run "$RALPH_BIN" status
    assert_success
    assert_output --partial "test-project"
    assert_output --partial "3 / 5"
}

@test "ralph stories: lists story IDs with status indicators" {
    run "$RALPH_BIN" stories
    assert_success
    assert_output --partial "1.1"
    assert_output --partial "2.1"
    assert_output --partial "3.1"
    assert_output --partial "done"
}
