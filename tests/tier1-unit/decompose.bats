#!/usr/bin/env bats
# Tier 1 — Pure unit tests for decompose.sh helper functions (no filesystem)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    source_ralph_lib "decompose"
}

# ── story_id_depth ──────────────────────────────────────────────────────────

@test "story_id_depth: two-level ID returns 0" {
    run story_id_depth "3.1"
    assert_success
    assert_output "0"
}

@test "story_id_depth: three-level ID returns 1" {
    run story_id_depth "3.1.1"
    assert_success
    assert_output "1"
}

@test "story_id_depth: four-level ID returns 2" {
    run story_id_depth "3.1.1.2"
    assert_success
    assert_output "2"
}

# ── story_id_parent ─────────────────────────────────────────────────────────

@test "story_id_parent: two-level ID returns empty" {
    run story_id_parent "3.1"
    assert_success
    assert_output ""
}

@test "story_id_parent: three-level ID returns two-level parent" {
    run story_id_parent "3.1.1"
    assert_success
    assert_output "3.1"
}

@test "story_id_parent: four-level ID returns three-level parent" {
    run story_id_parent "3.1.1.2"
    assert_success
    assert_output "3.1.1"
}
