#!/usr/bin/env bats
# Tier 3 — Component tests for _run_summary (both sequential and parallel modes)
# Validates that summary rendering does not crash under various outcome combinations,
# especially the parallel path which references _PARALLEL_SUCCESSFUL.

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project

    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "runner"

    config_load

    # Re-declare associative arrays (declare -A in sourced files creates
    # function-local scope inside setup; we need them at test scope)
    declare -gA _STORY_OUTCOMES=()
    declare -gA _STORY_TIMINGS=()

    # Set baseline timing data
    _RALPH_RUN_START_TIME=$(date '+%s')
    _RALPH_RUN_START_COMMIT=$(git rev-parse HEAD 2>/dev/null) || true

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "_run_summary 'sequential' renders without crash" {
    _STORY_OUTCOMES["1.1"]="done"
    _STORY_TIMINGS["1.1"]=42
    run _run_summary "sequential"
    assert_success
    assert_output --partial "RUN SUMMARY"
    assert_output --partial "Completed"
}

@test "_run_summary 'parallel' with populated _PARALLEL_SUCCESSFUL — no crash" {
    # Declare the parallel arrays (normally done by sourcing parallel.sh)
    _PARALLEL_SUCCESSFUL=("1.1" "2.1")
    _PARALLEL_FAILED=()

    _STORY_OUTCOMES["1.1"]="done"
    _STORY_OUTCOMES["2.1"]="tentative"
    _STORY_TIMINGS["1.1"]=30
    _STORY_TIMINGS["2.1"]=45

    # Create a commit so git stats section renders (merged_count shown only when commit_count > 0)
    echo "test" > dummy.txt && git add dummy.txt && git commit -q -m "test"

    run _run_summary "parallel"
    assert_success
    assert_output --partial "RUN SUMMARY"
    assert_output --partial "Completed"
    assert_output --partial "Tentative"
    assert_output --partial "Merged"
}

@test "_run_summary 'parallel' with empty _PARALLEL_SUCCESSFUL — no crash" {
    _PARALLEL_SUCCESSFUL=()
    _PARALLEL_FAILED=("1.1")
    _STORY_OUTCOMES["1.1"]="failed"
    _STORY_TIMINGS["1.1"]=10

    run _run_summary "parallel"
    assert_success
    assert_output --partial "RUN SUMMARY"
    assert_output --partial "Failed"
}

@test "_run_summary 'parallel' without _PARALLEL_SUCCESSFUL declared — no crash" {
    # Simulate the case where parallel.sh was not sourced (undeclared array)
    unset _PARALLEL_SUCCESSFUL 2>/dev/null || true
    _STORY_OUTCOMES["1.1"]="done"

    run _run_summary "parallel"
    assert_success
    assert_output --partial "RUN SUMMARY"
}

@test "_run_summary merged_count reflects _PARALLEL_SUCCESSFUL length" {
    _PARALLEL_SUCCESSFUL=("1.1" "2.1" "2.2")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["1.1"]="done"
    _STORY_OUTCOMES["2.1"]="done"
    _STORY_OUTCOMES["2.2"]="tentative"
    _STORY_TIMINGS["1.1"]=20
    _STORY_TIMINGS["2.1"]=30
    _STORY_TIMINGS["2.2"]=25

    # Make a commit so git stats section shows
    echo "test" > dummy.txt && git add dummy.txt && git commit -q -m "test"

    run _run_summary "parallel"
    assert_success
    assert_output --partial "3 branches"
}

@test "_run_summary 'sequential' still works (regression)" {
    _STORY_OUTCOMES["1.1"]="done"
    _STORY_OUTCOMES["2.1"]="failed"
    _STORY_TIMINGS["1.1"]=60
    _STORY_TIMINGS["2.1"]=15

    run _run_summary "sequential"
    assert_success
    assert_output --partial "RUN SUMMARY"
    assert_output --partial "Completed"
    assert_output --partial "Failed"
    # Sequential mode should not show Merged or Tentative labels
    refute_output --partial "Merged"
    refute_output --partial "Tentative"
}

@test "_run_summary shows fastest/longest when multiple stories timed" {
    _STORY_OUTCOMES["1.1"]="done"
    _STORY_OUTCOMES["2.1"]="done"
    _STORY_TIMINGS["1.1"]=10
    _STORY_TIMINGS["2.1"]=120

    run _run_summary "sequential"
    assert_success
    assert_output --partial "Fastest"
    assert_output --partial "Longest"
}

@test "_run_summary shows retry hint for failed stories" {
    _STORY_OUTCOMES["1.1"]="failed"
    _STORY_TIMINGS["1.1"]=5

    run _run_summary "sequential"
    assert_success
    assert_output --partial "failed"
    assert_output --partial "ralph run -s 1.1"
}
