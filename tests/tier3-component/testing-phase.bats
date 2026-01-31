#!/usr/bin/env bats
# Tier 3 — Component tests for testing_review (testing specialist phase)
# Tests enabled/disabled config, DONE signal, timeout, and no-signal paths.

# Shell function mock for timeout — inherits PATH so 'claude' mock is found
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
    source_ralph_lib "learnings"
    source_ralph_lib "testing"

    config_load

    # Override prereqs_timeout_cmd to use our shell function
    prereqs_timeout_cmd() { echo "_mock_timeout"; }

    # Mock claude
    create_mock_command "claude" 'echo "mock"'

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "testing_review: disabled config skips entirely" {
    # Default config has testing_phase.enabled=false
    mock_claude_output "claude-outputs/test-review-done.txt"
    run testing_review "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    # Should NOT write TEST_REVIEW to progress since it's disabled
    assert_file_not_contains "progress.txt" "TEST_REVIEW"
}

@test "testing_review: enabled + DONE signal writes TEST_REVIEW to progress" {
    # Override config to enable testing phase
    _CONFIG=$(echo "$_CONFIG" | jq '.testing_phase.enabled = true')
    mock_claude_output "claude-outputs/test-review-done.txt"
    run testing_review "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
    assert_file_contains "progress.txt" "[TEST_REVIEW]"
}

@test "testing_review: enabled + timeout (exit 124) returns 0 (non-fatal)" {
    _CONFIG=$(echo "$_CONFIG" | jq '.testing_phase.enabled = true')
    _mock_timeout() { return 124; }
    run testing_review "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
}

@test "testing_review: enabled + no signal returns 0 (non-fatal)" {
    _CONFIG=$(echo "$_CONFIG" | jq '.testing_phase.enabled = true')
    mock_claude_output "claude-outputs/no-signal.txt"
    run testing_review "1.1" "specs/epic-1/story-1.1-initialize-project.md"
    assert_success
}
