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

# ── MCP config defaults ──────────────────────────────────────────────────────

@test "config_get: mcp.enabled defaults to false" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get '.mcp.enabled'
    assert_success
    assert_output "false"
}

@test "config_get: mcp.browser.mode defaults to web" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get '.mcp.browser.mode'
    assert_success
    assert_output "web"
}

@test "config_get: mcp.browser.profile defaults to persistent" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get '.mcp.browser.profile'
    assert_success
    assert_output "persistent"
}

# ── MCP flag injection ───────────────────────────────────────────────────────

@test "config_get_claude_flags: omits MCP flags when mcp.enabled=false" {
    copy_fixture config.json .ralph/config.json
    config_load
    run config_get_claude_flags
    assert_success
    refute_output --partial "--mcp-config"
    refute_output --partial "--allowedTools"
    refute_output --partial "--strict-mcp-config"
}

@test "config_get_claude_flags: includes --mcp-config when enabled and config file exists" {
    mkdir -p .ralph
    cat > .ralph/config.json <<'EOF'
{
  "version": "2.4.0",
  "project": { "name": "test" },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "mcp": { "enabled": true, "config_file": ".ralph/mcp-config.json", "allowed_tools": [], "strict": false }
}
EOF
    # Pre-create the config file so the flag is injected
    echo '{"mcpServers":{}}' > .ralph/mcp-config.json
    config_load
    run config_get_claude_flags
    assert_success
    assert_output --partial "--mcp-config"
}

@test "config_get_claude_flags: --mcp-config path is absolute even with relative config_file" {
    mkdir -p .ralph
    cat > .ralph/config.json <<'EOF'
{
  "version": "2.4.0",
  "project": { "name": "test" },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "mcp": { "enabled": true, "config_file": ".ralph/mcp-config.json", "allowed_tools": [], "strict": false }
}
EOF
    echo '{"mcpServers":{}}' > .ralph/mcp-config.json
    config_load
    run config_get_claude_flags
    assert_success
    # The path after --mcp-config must start with /
    local found=false
    local next_is_path=false
    while IFS= read -r line; do
        if [[ "$next_is_path" == "true" ]]; then
            [[ "$line" == /* ]] && found=true
            next_is_path=false
        fi
        [[ "$line" == "--mcp-config" ]] && next_is_path=true
    done <<< "$output"
    [[ "$found" == "true" ]]
}

@test "config_get_claude_flags: includes --allowedTools when mcp.allowed_tools non-empty" {
    mkdir -p .ralph
    echo '{"mcpServers":{}}' > .ralph/mcp-config.json
    cat > .ralph/config.json <<'EOF'
{
  "version": "2.4.0",
  "project": { "name": "test" },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "mcp": {
    "enabled": true,
    "config_file": ".ralph/mcp-config.json",
    "allowed_tools": ["mcp__chrome-devtools__*", "Bash"],
    "strict": false
  }
}
EOF
    config_load
    run config_get_claude_flags
    assert_success
    assert_output --partial "--allowedTools"
    assert_output --partial "mcp__chrome-devtools__*"
}

@test "config_get_claude_flags: includes --strict-mcp-config when mcp.strict=true" {
    mkdir -p .ralph
    echo '{"mcpServers":{}}' > .ralph/mcp-config.json
    cat > .ralph/config.json <<'EOF'
{
  "version": "2.4.0",
  "project": { "name": "test" },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "mcp": { "enabled": true, "config_file": ".ralph/mcp-config.json", "allowed_tools": [], "strict": true }
}
EOF
    config_load
    run config_get_claude_flags
    assert_success
    assert_output --partial "--strict-mcp-config"
}

@test "config_get_claude_flags: omits --mcp-config when config file does not exist" {
    mkdir -p .ralph
    cat > .ralph/config.json <<'EOF'
{
  "version": "2.4.0",
  "project": { "name": "test" },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "mcp": { "enabled": true, "config_file": ".ralph/mcp-config.json", "allowed_tools": [], "strict": false }
}
EOF
    # Do NOT create .ralph/mcp-config.json
    config_load
    run config_get_claude_flags
    assert_success
    refute_output --partial "--mcp-config"
}
