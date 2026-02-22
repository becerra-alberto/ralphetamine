#!/usr/bin/env bats
# Tier 1 — Unit tests for pipeline_iteration state functions

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"

    mkdir -p .ralph
}

teardown() {
    teardown_test_environment
}

@test "state_get_pipeline_iteration: fresh state returns 0" {
    cat > .ralph/state.json << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0,
    "pipeline_iteration": 0
}
EOF
    run state_get_pipeline_iteration
    assert_success
    assert_output "0"
}

@test "state_increment_pipeline_iteration: increments from 0 to 1" {
    cat > .ralph/state.json << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0,
    "pipeline_iteration": 0
}
EOF
    state_increment_pipeline_iteration
    run state_get_pipeline_iteration
    assert_success
    assert_output "1"
}

@test "state_increment_pipeline_iteration: multiple increments accumulate" {
    cat > .ralph/state.json << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0,
    "pipeline_iteration": 0
}
EOF
    state_increment_pipeline_iteration
    state_increment_pipeline_iteration
    state_increment_pipeline_iteration
    run state_get_pipeline_iteration
    assert_success
    assert_output "3"
}

@test "_state_ensure_schema: adds pipeline_iteration to legacy state" {
    # Legacy state without pipeline_iteration
    cat > .ralph/state.json << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
    _state_ensure_schema
    run state_get_pipeline_iteration
    assert_success
    assert_output "0"
}
