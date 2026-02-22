#!/usr/bin/env bash
# Ralphetamine — Configuration loading from .ralph/config.json

RALPH_CONFIG_FILE=".ralph/config.json"

# Default configuration (used when keys are missing from config.json)
_CONFIG_DEFAULTS='{
    "version": "2.4.0",
    "project": { "name": "" },
    "specs": {
        "pattern": "specs/epic-{{epic}}/story-{{id}}-*.md",
        "id_format": "epic.story",
        "frontmatter_status_field": "status"
    },
    "loop": {
        "max_iterations": 0,
        "timeout_seconds": 1800,
        "max_retries": 3
    },
    "validation": {
        "commands": [],
        "blocked_commands": []
    },
    "claude": {
        "flags": ["--print", "--dangerously-skip-permissions", "--output-format", "json"]
    },
    "commit": {
        "format": "feat(story-{{id}}): {{title}}",
        "stage_paths": [],
        "auto_commit": true
    },
    "testing_phase": {
        "enabled": false,
        "timeout_seconds": 600
    },
    "learnings": {
        "enabled": true,
        "max_inject_count": 5
    },
    "parallel": {
        "enabled": false,
        "max_concurrent": 8,
        "strategy": "worktree",
        "auto_merge": true,
        "merge_review_timeout": 900,
        "stagger_seconds": 3
    },
    "postmortem": {
        "enabled": true,
        "window_seconds": 300,
        "max_output_chars": 50000
    },
    "decomposition": {
        "enabled": true,
        "max_depth": 2,
        "timeout_seconds": 600
    },
    "caffeine": false,
    "hooks": {
        "pre_iteration": "",
        "post_iteration": "",
        "pre_story": "",
        "post_story": "",
        "pre_worktree": "",
        "pre_worktree_timeout": 120
    },
    "mcp": {
        "enabled": false,
        "config_file": "",
        "allowed_tools": [],
        "strict": false,
        "browser": {
            "enabled": false,
            "manager": "mcp-run",
            "mode": "web",
            "profile": "persistent",
            "background": true,
            "headless": false,
            "ext": ""
        }
    },
    "post_run": {
        "e2e_testing": true,
        "e2e_timeout_seconds": 900,
        "e2e_setup_timeout_seconds": 300,
        "feature_discovery": true,
        "discovery_timeout_seconds": 600,
        "auto_launch_pipeline": true,
        "pipeline_timeout_seconds": 3600,
        "max_pipeline_iterations": 3
    }
}'

# Merged config cache (populated by config_load)
_CONFIG=""

config_load() {
    if [[ ! -f "$RALPH_CONFIG_FILE" ]]; then
        log_error "Config file not found: $RALPH_CONFIG_FILE"
        log_error "Run 'ralph init' first."
        return 1
    fi

    local user_config
    user_config=$(cat "$RALPH_CONFIG_FILE")

    # Deep merge: defaults * user config (user wins)
    local merged
    if ! merged=$(echo "$_CONFIG_DEFAULTS" "$user_config" | jq -s '.[0] * .[1]'); then
        log_error "Failed to parse config.json"
        return 1
    fi
    _CONFIG="$merged"

    log_debug "Config loaded from $RALPH_CONFIG_FILE"
}

config_validate() {
    local pattern
    pattern=$(config_get '.specs.pattern' 'specs/epic-{{epic}}/story-{{id}}-*.md')

    local errors=()

    if [[ "$pattern" != *'{{epic}}'* ]]; then
        errors+=("specs.pattern is missing {{epic}} token: '$pattern'")
    fi

    if [[ "$pattern" != *'{{id}}'* ]]; then
        errors+=("specs.pattern is missing {{id}} token: '$pattern'")
    fi

    if [[ ${#errors[@]} -gt 0 ]]; then
        log_error "Invalid config — check .ralph/config.json:"
        for err in "${errors[@]}"; do
            log_error "  $err"
        done
        return 1
    fi

    log_debug "Config validation passed"
    return 0
}

# Get a config value by jq path (e.g., ".loop.timeout_seconds")
config_get() {
    local path="$1"
    local default="$2"

    if [[ -z "$_CONFIG" ]]; then
        config_load || return 1
    fi

    local value
    value=$(echo "$_CONFIG" | jq -r "$path" 2>/dev/null)

    if [[ -z "$value" || "$value" == "null" ]]; then
        echo "$default"
    else
        echo "$value"
    fi
}

# Get a config value as raw JSON (for arrays/objects)
config_get_json() {
    local path="$1"

    if [[ -z "$_CONFIG" ]]; then
        config_load || return 1
    fi

    echo "$_CONFIG" | jq "$path" 2>/dev/null
}

# Get all validation commands as array of {name, cmd, required}
config_get_validation_commands() {
    config_get_json '.validation.commands[]' 2>/dev/null
}

# Get blocked commands as newline-separated list
config_get_blocked_commands() {
    config_get_json '.validation.blocked_commands[]' 2>/dev/null | jq -r '.' 2>/dev/null
}

# Get claude CLI flags as array
config_get_claude_flags() {
    if [[ -z "$_CONFIG" ]]; then
        config_load || return 1
    fi

    local flags=()
    mapfile -t flags < <(echo "$_CONFIG" | jq -r '.claude.flags[]?' 2>/dev/null)

    local has_print=false
    local has_output_json=false
    local i
    for (( i=0; i<${#flags[@]}; i++ )); do
        if [[ "${flags[$i]}" == "--print" ]]; then
            has_print=true
        fi
        if [[ "${flags[$i]}" == "--output-format" && $((i + 1)) -lt ${#flags[@]} && "${flags[$((i + 1))]}" == "json" ]]; then
            has_output_json=true
        fi
    done

    # Ralph parses usage/cost/turn metrics from Claude's JSON result envelope.
    # Ensure required flags are present even in older project configs.
    [[ "$has_print" == false ]] && flags+=("--print")
    [[ "$has_output_json" == false ]] && flags+=("--output-format" "json")

    # MCP flag injection
    local mcp_enabled
    mcp_enabled=$(echo "$_CONFIG" | jq -r '.mcp.enabled' 2>/dev/null)
    if [[ "$mcp_enabled" == "true" ]]; then
        # Resolve config file path — explicit or auto-generated browser path
        local mcp_config_file
        mcp_config_file=$(echo "$_CONFIG" | jq -r '.mcp.config_file' 2>/dev/null)
        if [[ -z "$mcp_config_file" || "$mcp_config_file" == "null" ]]; then
            mcp_config_file=".ralph/mcp-config.json"
        fi
        # Resolve to absolute path (safe for parallel worktree subshells)
        if [[ "$mcp_config_file" != /* ]]; then
            mcp_config_file="$(pwd)/${mcp_config_file}"
        fi
        if [[ -f "$mcp_config_file" ]]; then
            flags+=("--mcp-config" "$mcp_config_file")
        fi

        # --allowedTools
        local allowed_tools
        allowed_tools=$(echo "$_CONFIG" | jq -r '(.mcp.allowed_tools // []) | join(",")' 2>/dev/null)
        if [[ -n "$allowed_tools" && "$allowed_tools" != "null" && "$allowed_tools" != "" ]]; then
            flags+=("--allowedTools" "$allowed_tools")
        fi

        # --strict-mcp-config
        local mcp_strict
        mcp_strict=$(echo "$_CONFIG" | jq -r '.mcp.strict' 2>/dev/null)
        if [[ "$mcp_strict" == "true" ]]; then
            flags+=("--strict-mcp-config")
        fi
    fi

    printf '%s\n' "${flags[@]}"
}
