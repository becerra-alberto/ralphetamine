#!/usr/bin/env bats
# Tier 3 — Component tests for lib/post_run.sh

_mock_timeout() {
    shift
    "$@"
}

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
    source_ralph_lib "prompt"
    source_ralph_lib "signals"
    source_ralph_lib "hooks"
    source_ralph_lib "prereqs"
    source_ralph_lib "post_run"
    source_ralph_lib "feature_discovery"

    config_load
    state_init

    prereqs_timeout_cmd() { echo "_mock_timeout"; }

    create_mock_command "claude" 'echo "mock output"'
    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "post_run_orchestrate: no-op when not enabled" {
    # _POST_RUN_ENABLED defaults to false
    run post_run_orchestrate
    assert_success
    # Should not write anything to progress.txt
    refute_output --partial "AUTO-CONTINUE"
}

@test "post_run_orchestrate: stops when max iterations reached" {
    post_run_set_enabled
    post_run_set_max_iterations 3

    # Pre-seed state with iteration count at max
    _state_safe_write '.pipeline_iteration = 3'

    run post_run_orchestrate
    assert_success
    assert_output --partial "max pipeline iterations reached"
}

@test "post_run_orchestrate: reconcile phase non-fatal on missing module" {
    post_run_set_enabled
    post_run_set_max_iterations 5

    # Unset ralph_reconcile if defined, to simulate missing module
    unset -f ralph_reconcile 2>/dev/null || true
    unset -f e2e_run_suite 2>/dev/null || true
    unset -f feature_discovery_run 2>/dev/null || true

    # Should not fail even when phases are unavailable
    run post_run_orchestrate
    assert_success
}

@test "post_run_orchestrate: pipeline skipped when no PRD generated" {
    post_run_set_enabled
    post_run_set_max_iterations 5

    # Mock feature_discovery_run to return nothing
    feature_discovery_run() { return 0; }

    run post_run_orchestrate
    assert_success
    # Should log chain complete without launching pipeline
    assert_output --partial "no PRD generated"
}
