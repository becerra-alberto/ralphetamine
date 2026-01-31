#!/usr/bin/env bats
# Tier 2 — Filesystem tests for specs.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    _CONFIG=""
    copy_fixture config.json .ralph/config.json
    config_load
    source_ralph_lib "specs"

    # Set up spec files
    copy_fixture specs/epic-1/story-1.1-initialize-project.md specs/epic-1/story-1.1-initialize-project.md
    copy_fixture specs/epic-2/story-2.1-first-parallel.md specs/epic-2/story-2.1-first-parallel.md
    copy_fixture specs/epic-2/story-2.3-with-depends.md specs/epic-2/story-2.3-with-depends.md
}

teardown() {
    teardown_test_environment
}

@test "spec_find: locates file via configured glob pattern" {
    run spec_find "1.1"
    assert_success
    assert_output --partial "story-1.1-initialize-project.md"
}

@test "spec_find: missing story returns failure" {
    run spec_find "99.99"
    assert_failure
    assert_output --partial "Spec file not found"
}

@test "spec_read: returns file contents" {
    run spec_read "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output --partial "Story 1.1: Initialize Project"
    assert_output --partial "Acceptance Criteria"
}

@test "spec_update_status: changes YAML frontmatter" {
    spec_update_status "specs/epic-1/story-1.1-initialize-project.md" "done"
    run spec_get_field "specs/epic-1/story-1.1-initialize-project.md" "status"
    assert_success
    assert_output "done"
    # Verify .bak file was cleaned up
    [[ ! -f "specs/epic-1/story-1.1-initialize-project.md.bak" ]]
}

@test "spec_get_field: returns frontmatter value" {
    run spec_get_field "specs/epic-1/story-1.1-initialize-project.md" "status"
    assert_success
    assert_output "pending"
}

@test "spec_get_depends_on: empty array returns empty output" {
    run spec_get_depends_on "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output ""
}

@test "spec_get_depends_on: inline array returns entries" {
    run spec_get_depends_on "specs/epic-2/story-2.3-with-depends.md"
    assert_success
    assert_line --index 0 "2.1"
    assert_line --index 1 "2.2"
}
