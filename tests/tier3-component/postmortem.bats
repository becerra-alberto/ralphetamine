#!/usr/bin/env bats
# Tier 3 — Component tests for _run_timeout_postmortem and _compute_effective_timeout

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment

    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "signals"
    source_ralph_lib "prompt"
    source_ralph_lib "runner"

    # Create minimal project structure
    mkdir -p .ralph/learnings specs/epic-1
    echo '{}' > .ralph/learnings/_index.json
    touch progress.txt

    # Create a minimal config
    cat > .ralph/config.json << 'CONF'
{
    "project": { "name": "test" },
    "postmortem": {
        "enabled": true,
        "window_seconds": 300,
        "max_output_chars": 50000
    },
    "claude": {
        "flags": ["--print"]
    }
}
CONF
    config_load

    # Create a spec file for the test story
    cat > specs/epic-1/story-1.1-test-story.md << 'SPEC'
---
id: "1.1"
title: "Test Story"
status: "in-progress"
---
# Test Story
Implement a test feature.
SPEC

    # Initialize prompt templates
    prompt_init

    # Mock gtimeout/timeout
    if ! command -v timeout &>/dev/null && ! command -v gtimeout &>/dev/null; then
        create_mock_command "timeout" 'shift; "$@"'
    fi
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

# ── _compute_effective_timeout tests ──────────────────────────────

@test "_compute_effective_timeout: reduces by postmortem window" {
    run _compute_effective_timeout 1800
    assert_success
    assert_output "1500"
}

@test "_compute_effective_timeout: returns full timeout when too short" {
    # With window=300, effective would be 200 which is < 60
    # Actually 500-300=200 which is > 60, so let's use a smaller timeout
    run _compute_effective_timeout 350
    assert_success
    # 350 - 300 = 50 < 60, so returns full 350
    assert_output "350"
}

@test "_compute_effective_timeout: returns full timeout when postmortem disabled" {
    # Override config to disable postmortem
    _CONFIG=$(echo "$_CONFIG" | jq '.postmortem.enabled = false')
    run _compute_effective_timeout 1800
    assert_success
    assert_output "1800"
}

# ── _run_timeout_postmortem tests ──────────────────────────────────

@test "_run_timeout_postmortem: creates postmortem file" {
    # Mock claude to return a postmortem response
    create_mock_command "claude" '
echo "<ralph>LEARN: Story was 60% complete when it timed out</ralph>"
echo "<ralph>TIMEOUT_POSTMORTEM_DONE 1.1</ralph>"
'

    run _run_timeout_postmortem "1.1" "specs/epic-1/story-1.1-test-story.md" "partial output here" "1800"
    assert_success

    # Verify postmortem file was created
    [[ -f ".ralph/learnings/timeouts/1.1.md" ]]
    assert_file_contains ".ralph/learnings/timeouts/1.1.md" "Timeout Postmortem: Story 1.1"
    assert_file_contains ".ralph/learnings/timeouts/1.1.md" "Timeout: 1800s"
}

@test "_run_timeout_postmortem: appends to progress.txt" {
    create_mock_command "claude" '
echo "<ralph>TIMEOUT_POSTMORTEM_DONE 1.1</ralph>"
'

    run _run_timeout_postmortem "1.1" "specs/epic-1/story-1.1-test-story.md" "partial output" "1800"
    assert_success
    assert_file_contains "progress.txt" "TIMEOUT_POSTMORTEM"
    assert_file_contains "progress.txt" "1.1"
}

@test "_run_timeout_postmortem: skips when disabled" {
    _CONFIG=$(echo "$_CONFIG" | jq '.postmortem.enabled = false')

    run _run_timeout_postmortem "1.1" "specs/epic-1/story-1.1-test-story.md" "partial output" "1800"
    assert_success

    # Should NOT create the file
    [[ ! -f ".ralph/learnings/timeouts/1.1.md" ]]
}

@test "_run_timeout_postmortem: handles claude failure gracefully" {
    create_mock_command "claude" 'exit 1'

    run _run_timeout_postmortem "1.1" "specs/epic-1/story-1.1-test-story.md" "partial output" "1800"
    assert_success

    # Should still create the file (with whatever partial output exists)
    [[ -f ".ralph/learnings/timeouts/1.1.md" ]]
}

@test "_run_timeout_postmortem: truncates long output" {
    _CONFIG=$(echo "$_CONFIG" | jq '.postmortem.max_output_chars = 100')

    create_mock_command "claude" '
echo "<ralph>TIMEOUT_POSTMORTEM_DONE 1.1</ralph>"
'

    # Create a very long partial output (> 100 chars)
    local long_output
    long_output=$(printf 'x%.0s' $(seq 1 500))

    run _run_timeout_postmortem "1.1" "specs/epic-1/story-1.1-test-story.md" "$long_output" "1800"
    assert_success

    # Should still complete without error
    [[ -f ".ralph/learnings/timeouts/1.1.md" ]]
}
