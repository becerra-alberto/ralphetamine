#!/usr/bin/env bash
# Ralphetamine — MCP tool support (browser sessions, config injection)

# Returns 0 if mcp.enabled == true in config, 1 otherwise.
mcp_is_enabled() {
    local enabled
    enabled=$(echo "$_CONFIG" | jq -r '.mcp.enabled' 2>/dev/null)
    [[ "$enabled" == "true" ]]
}

# Returns 0 if mcp.browser.enabled == true in config, 1 otherwise.
mcp_browser_enabled() {
    local enabled
    enabled=$(echo "$_CONFIG" | jq -r '.mcp.browser.enabled' 2>/dev/null)
    [[ "$enabled" == "true" ]]
}

# Start a managed browser session via mcp-run.
# Reads browser config, launches the session, syncs MCP config, and writes
# .ralph/mcp-run-id and .ralph/mcp-manifest.json.
# Returns 0 on success, 1 on failure.
mcp_browser_start() {
    # Fail fast if mcp-run is not installed
    if ! command -v mcp-run &>/dev/null; then
        log_error "MCP browser enabled but 'mcp-run' not found on PATH."
        log_error "Install mcp-run or disable mcp.browser.enabled in config."
        return 1
    fi

    local project_root
    project_root="$(pwd)"

    # Read browser config
    local mode profile background headless ext manager
    mode=$(echo "$_CONFIG"    | jq -r '.mcp.browser.mode    // "web"'        2>/dev/null)
    profile=$(echo "$_CONFIG" | jq -r '.mcp.browser.profile // "persistent"' 2>/dev/null)
    background=$(echo "$_CONFIG" | jq -r '.mcp.browser.background'           2>/dev/null)
    headless=$(echo "$_CONFIG"   | jq -r '.mcp.browser.headless'             2>/dev/null)
    ext=$(echo "$_CONFIG"        | jq -r '.mcp.browser.ext // ""'            2>/dev/null)
    manager=$(echo "$_CONFIG"    | jq -r '.mcp.browser.manager // "mcp-run"' 2>/dev/null)

    # Detect parallel mode for manifest
    local run_mode="sequential"
    local max_concurrent=1
    local parallel_enabled
    parallel_enabled=$(echo "$_CONFIG" | jq -r '.parallel.enabled' 2>/dev/null)
    if [[ "$parallel_enabled" == "true" || "${_RALPH_PARALLEL_MODE:-}" == "true" ]]; then
        run_mode="parallel"
        max_concurrent=$(echo "$_CONFIG" | jq -r '.parallel.max_concurrent // 8' 2>/dev/null)
        export RALPH_PARALLEL_CONCURRENCY="$max_concurrent"
    fi

    local project_name
    project_name=$(echo "$_CONFIG" | jq -r '.project.name // ""' 2>/dev/null)

    # Write .ralph/mcp-manifest.json before launch
    local run_start
    run_start=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")
    mkdir -p ".ralph"
    jq -n \
        --arg start  "$run_start" \
        --arg mode   "$run_mode" \
        --argjson mc "$max_concurrent" \
        --arg root  "$project_root" \
        --arg name  "$project_name" \
        '{
            ralph_run_start: $start,
            mode: $mode,
            max_concurrent: $mc,
            project_root: $root,
            project_name: $name
        }' > ".ralph/mcp-manifest.json"

    log_debug "MCP manifest written to .ralph/mcp-manifest.json"

    # Build mcp-run launch args
    local launch_args=(
        "launch"
        "--agent" "claude"
        "--mode"  "$mode"
        "--profile" "$profile"
        "--repo-root" "$project_root"
    )
    [[ "$background" == "true" ]] && launch_args+=("--background")
    [[ "$headless"   == "true" ]] && launch_args+=("--headless")
    [[ -n "$ext"     && "$ext" != "null" ]] && launch_args+=("--ext" "$ext")

    log_info "Starting MCP browser session (manager: $manager, mode: $mode, profile: $profile)"

    # Launch and capture JSON output
    local launch_output
    if ! launch_output=$(mcp-run "${launch_args[@]}" 2>&1); then
        log_error "mcp-run launch failed:"
        log_error "$launch_output"
        return 1
    fi

    # Extract run_id from JSON output
    local run_id
    run_id=$(echo "$launch_output" | jq -r '.run_id // ""' 2>/dev/null) || true
    if [[ -z "$run_id" || "$run_id" == "null" ]]; then
        log_error "mcp-run launch returned no run_id. Output:"
        log_error "$launch_output"
        return 1
    fi

    # Persist run_id for stop
    echo "$run_id" > ".ralph/mcp-run-id"
    log_debug "MCP browser run_id: $run_id"

    # Resolve MCP config output path (absolute)
    local mcp_config_out
    mcp_config_out=$(echo "$_CONFIG" | jq -r '.mcp.config_file // ""' 2>/dev/null)
    if [[ -z "$mcp_config_out" || "$mcp_config_out" == "null" ]]; then
        mcp_config_out="${project_root}/.ralph/mcp-config.json"
    elif [[ "$mcp_config_out" != /* ]]; then
        mcp_config_out="${project_root}/${mcp_config_out}"
    fi

    # Build mcp-run sync-mcp args
    local sync_args=(
        "sync-mcp"
        "--config" "$mcp_config_out"
        "--agent"  "claude"
        "--mode"   "$mode"
        "--profile" "$profile"
        "--repo-root" "$project_root"
    )
    [[ -n "$ext" && "$ext" != "null" ]] && sync_args+=("--ext" "$ext")

    log_info "Syncing MCP config to $mcp_config_out"

    local sync_output
    if ! sync_output=$(mcp-run "${sync_args[@]}" 2>&1); then
        log_error "mcp-run sync-mcp failed:"
        log_error "$sync_output"
        return 1
    fi

    # Log CDP URL if available
    local cdp_url
    cdp_url=$(echo "$sync_output" | jq -r '.cdp_http_url // ""' 2>/dev/null) || true
    [[ -n "$cdp_url" ]] && log_info "Browser CDP URL: $cdp_url"

    log_success "MCP browser session started (run_id: $run_id)"
    return 0
}

# Stop the managed browser session.
# Reads .ralph/mcp-run-id; no-op if missing.
# Always returns 0 (safe for ralph_on_exit registration).
mcp_browser_stop() {
    local id_file=".ralph/mcp-run-id"
    if [[ ! -f "$id_file" ]]; then
        return 0
    fi

    local run_id
    run_id=$(cat "$id_file" 2>/dev/null) || true
    if [[ -z "$run_id" ]]; then
        rm -f "$id_file"
        return 0
    fi

    log_info "Stopping MCP browser session (run_id: $run_id)"
    mcp-run stop "$run_id" 2>/dev/null || true
    rm -f "$id_file"
    return 0
}
