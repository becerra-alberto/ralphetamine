#!/usr/bin/env bats
# Tier 1 — Pure unit tests for spec_get_title (no filesystem)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    source_ralph_lib "ui"
    source_ralph_lib "specs"
}

@test "spec_get_title: standard story filename" {
    run spec_get_title "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_output "Initialize Project"
}

@test "spec_get_title: multi-word with numbers in story ID" {
    run spec_get_title "specs/epic-10/story-10.2-average-per-month-column.md"
    assert_success
    assert_output "Average Per Month Column"
}

@test "spec_get_title: single word slug" {
    run spec_get_title "specs/epic-3/story-3.1-refactor.md"
    assert_success
    assert_output "Refactor"
}

@test "spec_get_title: deep path stripped to just filename" {
    run spec_get_title "/some/deep/path/to/specs/epic-5/story-5.3-implement-search.md"
    assert_success
    assert_output "Implement Search"
}
