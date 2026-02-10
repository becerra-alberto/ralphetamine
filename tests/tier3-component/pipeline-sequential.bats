#!/usr/bin/env bats
# Tier 3 — Component tests: sequential execution path
# (reclassified from tier5 — calls _run_sequential directly, not bin/ralph)
# Uses the "Notely" mock PRD to exercise sequential DONE, FAIL→retry→DONE,
# skip handling, learnings extraction, hooks, and depends_on resolution.

# Shell function mock for timeout — passes through to the underlying command
_mock_timeout() {
    shift  # discard the timeout-seconds argument
    "$@"
}

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    load "../helpers/pipeline.bash"
    setup_test_environment
    scaffold_pipeline_project

    source_pipeline_libs
    config_load

    # Override prereqs to avoid needing real timeout/bash4
    prereqs_timeout_cmd() { echo "_mock_timeout"; }
    prereqs_require_bash4() { return 0; }

    # Set up story-aware Claude mock
    setup_pipeline_claude_mock
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

# ── Test 1: Sequential DONE ─────────────────────────────────────────────────

@test "Sequential DONE: story 1.1 completes and state is updated" {
    run _run_sequential 1 300 false false "1.1" ""
    assert_success
    assert_story_completed "1.1"
    assert_file_contains "progress.txt" "[DONE]"
    assert_file_contains "progress.txt" "1.1"
}

# ── Test 2: FAIL → retry → DONE ─────────────────────────────────────────────

@test "Sequential FAIL then DONE: story 1.2 fails first, retries, then completes" {
    # Run with 2 iterations so it can fail and retry
    run _run_sequential 2 300 false false "1.2" ""
    assert_success
    assert_story_completed "1.2"
    assert_file_contains "progress.txt" "[FAIL]"
    assert_file_contains "progress.txt" "[DONE]"
    assert_file_contains "progress.txt" "1.2"
}

# ── Test 3: Skipped story ────────────────────────────────────────────────────

@test "Skipped story (~1.3) is never executed" {
    # Run stories 1.1, 1.2 — ~1.3 should be skipped in stories_list_all
    run stories_list_all
    assert_success
    refute_output --partial "1.3"
    # Verify 1.1 and 1.2 are listed
    assert_output --partial "1.1"
    assert_output --partial "1.2"
}

# ── Test 4: Learnings extraction ─────────────────────────────────────────────

@test "Learnings extracted from DONE response with LEARN signal" {
    # Story 1.2 fixture includes a LEARN signal on retry success
    run _run_sequential 2 300 false false "1.2" ""
    assert_success
    assert_learning_stored "validate input args"
}

# ── Test 5: Hooks fire ───────────────────────────────────────────────────────

@test "Hooks fire with correct RALPH_RESULT after story completion" {
    run _run_sequential 1 300 false false "1.1" ""
    assert_success
    assert_hook_fired "1.1" "done"
}

# ── Test 6: depends_on single ────────────────────────────────────────────────

@test "depends_on: story 3.1 spec declares dependency on 2.1" {
    local spec_path="specs/epic-3/story-3.1-markdown-import.md"
    run spec_get_depends_on "$spec_path"
    assert_success
    assert_output --partial "2.1"
}

# ── Test 7: depends_on multi ─────────────────────────────────────────────────

@test "depends_on: story 3.2 spec declares dependencies on both 2.1 and 2.2" {
    local spec_path="specs/epic-3/story-3.2-json-export.md"
    run spec_get_depends_on "$spec_path"
    assert_success
    assert_output --partial "2.1"
    assert_output --partial "2.2"
}
