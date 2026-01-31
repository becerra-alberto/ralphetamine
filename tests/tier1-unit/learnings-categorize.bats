#!/usr/bin/env bats
# Tier 1 — Pure unit tests for _learnings_categorize (no filesystem)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    source_ralph_lib "learnings"
}

@test "categorize: testing keywords" {
    run _learnings_categorize "jest playwright expect describe assertions"
    assert_success
    assert_output "testing"
}

@test "categorize: framework keywords" {
    run _learnings_categorize "Svelte 5 runes require special handling"
    assert_success
    assert_output "framework"
}

@test "categorize: data-model keywords" {
    run _learnings_categorize "SQLite migration columns need explicit types"
    assert_success
    assert_output "data-model"
}

@test "categorize: tooling keywords" {
    run _learnings_categorize "vite build config needs special entry"
    assert_success
    assert_output "tooling"
}

@test "categorize: patterns keywords" {
    run _learnings_categorize "architecture design pattern for services"
    assert_success
    assert_output "patterns"
}

@test "categorize: gotchas keywords" {
    run _learnings_categorize "careful workaround for this pitfall in the API"
    assert_success
    assert_output "gotchas"
}

@test "categorize: uncategorized for unknown text" {
    run _learnings_categorize "random unrelated text about nothing specific"
    assert_success
    assert_output "uncategorized"
}
