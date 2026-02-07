#!/usr/bin/env bash
# Ralph v2 — Lifecycle hook execution

# Execute a hook by name (pre_iteration, post_iteration, pre_story, post_story)
hooks_run() {
    local hook_name="$1"
    shift
    # Remaining args are environment variables to export

    local hook_cmd
    hook_cmd=$(config_get ".hooks.${hook_name}" '')

    if [[ -z "$hook_cmd" ]]; then
        return 0
    fi

    log_debug "Running hook: $hook_name"

    # Export context variables for the hook
    for pair in "$@"; do
        export "$pair"
    done

    # Execute the hook command in a subshell for sandboxing
    if bash -c "$hook_cmd"; then
        log_debug "Hook $hook_name completed successfully"
    else
        log_warn "Hook $hook_name failed (exit code: $?)"
    fi

    # Clean up exported variables
    for pair in "$@"; do
        local key="${pair%%=*}"
        unset "$key"
    done
}
