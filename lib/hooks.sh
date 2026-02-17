#!/usr/bin/env bash
# Ralphetamine — Lifecycle hook execution

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

# Execute a hook with strict semantics (propagates exit code).
# Used for pre_worktree where failure must abort the story.
# Args: hook_name [KEY=VALUE ...]
hooks_run_strict() {
    local hook_name="$1"
    shift

    local hook_cmd
    hook_cmd=$(config_get ".hooks.${hook_name}" '')

    if [[ -z "$hook_cmd" ]]; then
        return 0
    fi

    log_debug "Running strict hook: $hook_name"

    # Read per-hook timeout (default 120s)
    local hook_timeout
    hook_timeout=$(config_get ".hooks.${hook_name}_timeout" '120')

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    # Export context variables for the hook
    for pair in "$@"; do
        export "$pair"
    done

    # Resolve working directory: use RALPH_WORKTREE if exported, else current dir
    local work_dir="${RALPH_WORKTREE:-.}"

    # Execute the hook with timeout in the worktree directory
    local exit_code=0
    if [[ -n "$timeout_cmd" ]]; then
        ( cd "$work_dir" && $timeout_cmd "$hook_timeout" bash -c "$hook_cmd" ) || exit_code=$?
    else
        ( cd "$work_dir" && bash -c "$hook_cmd" ) || exit_code=$?
    fi

    # Clean up exported variables
    for pair in "$@"; do
        local key="${pair%%=*}"
        unset "$key"
    done

    if [[ $exit_code -ne 0 ]]; then
        log_error "Strict hook $hook_name failed (exit code: $exit_code)"
    else
        log_debug "Strict hook $hook_name completed successfully"
    fi

    return $exit_code
}
