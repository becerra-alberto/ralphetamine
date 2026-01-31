#!/usr/bin/env bats
# Tier 3 — Component tests for prompt_build (full template rendering)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    _CONFIG=""
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "signals"
    source_ralph_lib "learnings"
    source_ralph_lib "prompt"

    # Set up full project scaffold
    copy_fixture config.json .ralph/config.json
    copy_fixture stories.txt .ralph/stories.txt
    copy_fixture state-empty.json .ralph/state.json
    copy_fixture specs/epic-1/story-1.1-initialize-project.md specs/epic-1/story-1.1-initialize-project.md
    mkdir -p .ralph/learnings
    echo '{}' > .ralph/learnings/_index.json

    config_load
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "prompt_build: output contains story ID and spec content" {
    run prompt_build "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output --partial "1.1"
    assert_output --partial "Initialize Project"
    assert_output --partial "Acceptance Criteria"
}

@test "prompt_build: output contains commit message format" {
    run prompt_build "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output --partial "feat(story-1.1)"
}

@test "prompt_build: output contains validation commands when configured" {
    run prompt_build "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output --partial "npm test"
}

@test "prompt_build: output contains blocked commands" {
    run prompt_build "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output --partial "NEVER run"
}

@test "prompt_build: learnings section absent when no learnings exist" {
    run prompt_build "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    # With no learnings, the LEARNINGS conditional block should be removed
    refute_output --partial "LEARNINGS FROM PREVIOUS STORIES"
}
