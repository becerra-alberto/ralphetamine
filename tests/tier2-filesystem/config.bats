#!/usr/bin/env bats
# Tier 2 — Filesystem tests for config.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    # Reset config cache between tests
    _CONFIG=""
}

teardown() {
    teardown_test_environment
}

@test "config_load: valid config loads successfully" {
    copy_fixture config.json .ralph/config.json
    run config_load
    assert_success
}

@test "config_load: missing config returns failure" {
    run config_load
    assert_failure
    assert_output --partial "Config file not found"
}

@test "config_get: nested value" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get '.project.name'
    assert_success
    assert_output "test-project"
}

@test "config_get: missing key with default" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get '.nonexistent.key' 'fallback-value'
    assert_success
    assert_output "fallback-value"
}

@test "config_load: minimal config merges with defaults" {
    copy_fixture config-minimal.json .ralph/config.json
    config_load
    # Should get minimal's project name
    run config_get '.project.name'
    assert_output "minimal"
    # Should get defaults for unspecified keys
    run config_get '.loop.timeout_seconds'
    assert_output "1800"
    run config_get '.loop.max_retries'
    assert_output "3"
}

@test "config_get_json: returns array for validation commands" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get_json '.validation.commands'
    assert_success
    # Should contain our two commands
    assert_output --partial "npm test"
    assert_output --partial "npm run lint"
}

@test "config_get_claude_flags: returns each flag on separate line" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get_claude_flags
    assert_success
    assert_line --index 0 "--print"
    assert_line --index 1 "--dangerously-skip-permissions"
    assert_line --index 2 "--output-format"
    assert_line --index 3 "json"
}

@test "config_get_claude_flags: appends required JSON output flags for legacy config" {
    mkdir -p .ralph
    cat > .ralph/config.json <<'EOF'
{
  "version": "2.4.0",
  "project": { "name": "legacy" },
  "claude": {
    "flags": ["--dangerously-skip-permissions"]
  }
}
EOF
    config_load
    run config_get_claude_flags
    assert_success
    assert_line --index 0 "--dangerously-skip-permissions"
    assert_line --index 1 "--print"
    assert_line --index 2 "--output-format"
    assert_line --index 3 "json"
}
