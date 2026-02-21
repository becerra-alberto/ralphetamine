#!/usr/bin/env bats
# Tier 3 — Component tests for lib/mcp.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    _CONFIG=""
}

teardown() {
    teardown_test_environment
}

# ── Helpers ──────────────────────────────────────────────────────────────────

_write_mcp_config() {
    local enabled="${1:-false}"
    local browser_enabled="${2:-false}"
    mkdir -p .ralph
    cat > .ralph/config.json <<EOF
{
  "version": "2.4.0",
  "project": { "name": "test-mcp" },
  "claude": { "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"] },
  "mcp": {
    "enabled": $enabled,
    "config_file": ".ralph/mcp-config.json",
    "allowed_tools": [],
    "strict": false,
    "browser": {
      "enabled": $browser_enabled,
      "manager": "mcp-run",
      "mode": "web",
      "profile": "persistent",
      "background": false,
      "headless": false,
      "ext": ""
    }
  }
}
EOF
    config_load
    source_ralph_lib "mcp"
}

# Create a fake mcp-run on PATH that emits canned JSON
_install_fake_mcp_run() {
    local launch_output="${1:-{\"run_id\": \"fake-run-123\"}}"
    local sync_output="${2:-{\"cdp_http_url\": \"http://localhost:9222\"}}"
    FAKE_BIN_DIR="${TEST_WORK_DIR}/.fake-bin"
    mkdir -p "$FAKE_BIN_DIR"
    cat > "$FAKE_BIN_DIR/mcp-run" <<FAKEMCPRUN
#!/usr/bin/env bash
CMD="\$1"
case "\$CMD" in
    launch)   echo '$launch_output' ;;
    sync-mcp) echo '$sync_output' ;;
    stop)     echo '{"status":"stopped"}' ;;
    *)        echo '{"error":"unknown command"}'; exit 1 ;;
esac
FAKEMCPRUN
    chmod +x "$FAKE_BIN_DIR/mcp-run"
    export PATH="$FAKE_BIN_DIR:$PATH"
}

# ── mcp_is_enabled ───────────────────────────────────────────────────────────

@test "mcp_is_enabled: returns 1 when mcp.enabled=false" {
    _write_mcp_config "false" "false"
    run mcp_is_enabled
    assert_failure
}

@test "mcp_is_enabled: returns 0 when mcp.enabled=true" {
    _write_mcp_config "true" "false"
    run mcp_is_enabled
    assert_success
}

# ── mcp_browser_enabled ──────────────────────────────────────────────────────

@test "mcp_browser_enabled: returns 1 when browser.enabled=false" {
    _write_mcp_config "true" "false"
    run mcp_browser_enabled
    assert_failure
}

@test "mcp_browser_enabled: returns 0 when browser.enabled=true" {
    _write_mcp_config "true" "true"
    run mcp_browser_enabled
    assert_success
}

# ── mcp_browser_start: fail fast without mcp-run ────────────────────────────

@test "mcp_browser_start: fails fast with clear error when mcp-run not on PATH" {
    _write_mcp_config "true" "true"
    # Ensure mcp-run is not on PATH by prepending a dir with no mcp-run
    local empty_dir
    empty_dir=$(mktemp -d)
    PATH="$empty_dir:$PATH" run mcp_browser_start
    assert_failure
    assert_output --partial "mcp-run"
    rmdir "$empty_dir"
}

# ── mcp_browser_start: happy path ───────────────────────────────────────────

@test "mcp_browser_start: writes .ralph/mcp-run-id after success" {
    _write_mcp_config "true" "true"
    _install_fake_mcp_run '{"run_id":"test-run-abc"}' '{"cdp_http_url":"http://localhost:9222"}'
    mcp_browser_start
    [[ -f ".ralph/mcp-run-id" ]]
    local stored_id
    stored_id=$(cat .ralph/mcp-run-id)
    [[ "$stored_id" == "test-run-abc" ]]
}

@test "mcp_browser_start: writes .ralph/mcp-manifest.json with correct fields" {
    _write_mcp_config "true" "true"
    _install_fake_mcp_run '{"run_id":"manifest-run"}' '{}'
    mcp_browser_start
    [[ -f ".ralph/mcp-manifest.json" ]]
    local mode project_root
    mode=$(jq -r '.mode' .ralph/mcp-manifest.json)
    project_root=$(jq -r '.project_root' .ralph/mcp-manifest.json)
    [[ "$mode" == "sequential" ]]
    [[ "$project_root" == "$(pwd)" ]]
}

@test "mcp_browser_start: manifest includes project_name from config" {
    _write_mcp_config "true" "true"
    _install_fake_mcp_run '{"run_id":"name-run"}' '{}'
    mcp_browser_start
    local project_name
    project_name=$(jq -r '.project_name' .ralph/mcp-manifest.json)
    [[ "$project_name" == "test-mcp" ]]
}

@test "mcp_browser_start: returns failure when mcp-run launch returns no run_id" {
    _write_mcp_config "true" "true"
    _install_fake_mcp_run '{"error":"no_id"}' '{}'
    run mcp_browser_start
    assert_failure
}

# ── mcp_browser_stop ─────────────────────────────────────────────────────────

@test "mcp_browser_stop: calls mcp-run stop with run_id and removes .ralph/mcp-run-id" {
    _write_mcp_config "true" "true"
    _install_fake_mcp_run '{"run_id":"stop-me"}' '{}'
    mkdir -p .ralph
    echo "stop-me" > .ralph/mcp-run-id
    mcp_browser_stop
    [[ ! -f ".ralph/mcp-run-id" ]]
}

@test "mcp_browser_stop: is no-op when .ralph/mcp-run-id is absent" {
    _write_mcp_config "true" "true"
    # No .ralph/mcp-run-id present
    run mcp_browser_stop
    assert_success
}

@test "mcp_browser_stop: always returns 0" {
    _write_mcp_config "true" "true"
    # Even with mcp-run not on PATH, stop should still return 0
    run mcp_browser_stop
    assert_success
}
