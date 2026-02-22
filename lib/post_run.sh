#!/usr/bin/env bash
# Ralphetamine — Post-run chain orchestrator
# Chains: reconcile → E2E test → feature discovery → next pipeline

_POST_RUN_ENABLED=false
_POST_RUN_MAX_ITERATIONS=3

post_run_set_enabled() {
    _POST_RUN_ENABLED=true
}

post_run_set_max_iterations() {
    _POST_RUN_MAX_ITERATIONS="${1:-3}"
}

# Main entry point — called after sequential or parallel run completes
post_run_orchestrate() {
    if [[ "$_POST_RUN_ENABLED" != true ]]; then
        return 0
    fi

    # Read current iteration counter from state
    local current_iter
    current_iter=$(state_get_pipeline_iteration 2>/dev/null || echo "0")

    if [[ "$current_iter" -ge "$_POST_RUN_MAX_ITERATIONS" ]]; then
        log_info "AUTO-CONTINUE CHAIN: max pipeline iterations reached ($current_iter/$_POST_RUN_MAX_ITERATIONS). Stopping."
        return 0
    fi

    log_info "AUTO-CONTINUE CHAIN: starting post-run chain (iteration $((current_iter + 1))/$_POST_RUN_MAX_ITERATIONS)"

    # Phase 1: Reconcile
    _post_run_phase_reconcile || true

    # Phase 2: E2E Testing
    _post_run_phase_e2e_testing || true

    # Phase 3: Feature Discovery
    local prd_path=""
    prd_path=$(_post_run_phase_feature_discovery) || true

    # Phase 4: Next pipeline (only if we got a PRD path)
    if [[ -n "$prd_path" ]]; then
        _post_run_phase_next_pipeline "$prd_path" || true
    else
        log_info "AUTO-CONTINUE CHAIN: no PRD generated — chain complete"
    fi
}

_post_run_phase_reconcile() {
    log_info "AUTO-CONTINUE CHAIN [1/4]: reconcile"

    # Lazy-source reconcile.sh if not yet loaded
    if ! type ralph_reconcile &>/dev/null; then
        if [[ -f "${RALPH_DIR}/lib/reconcile.sh" ]]; then
            # shellcheck source=/dev/null
            source "${RALPH_DIR}/lib/reconcile.sh"
        else
            log_debug "reconcile.sh not found — skipping reconcile phase"
            return 0
        fi
    fi

    ralph_reconcile --apply || true
}

_post_run_phase_e2e_testing() {
    log_info "AUTO-CONTINUE CHAIN [2/4]: E2E testing"

    if ! type e2e_run_suite &>/dev/null; then
        log_debug "e2e_run_suite not available — skipping E2E phase"
        return 0
    fi

    local timeout_secs
    timeout_secs=$(config_get '.post_run.e2e_timeout_seconds' '900')

    e2e_run_suite "$timeout_secs" || true
}

_post_run_phase_feature_discovery() {
    log_info "AUTO-CONTINUE CHAIN [3/4]: feature discovery" >&2

    if ! type feature_discovery_run &>/dev/null; then
        log_debug "feature_discovery_run not available — skipping discovery phase" >&2
        return 0
    fi

    local timeout_secs
    timeout_secs=$(config_get '.post_run.discovery_timeout_seconds' '600')

    # Run feature_discovery_run; it writes its own logs to stderr and echoes the PRD path to stdout
    feature_discovery_run "$timeout_secs" || true
}

_post_run_phase_next_pipeline() {
    local prd_path="$1"

    local auto_launch
    auto_launch=$(config_get '.post_run.auto_launch_pipeline' 'true')
    if [[ "$auto_launch" != "true" ]]; then
        log_info "AUTO-CONTINUE CHAIN [4/4]: auto_launch_pipeline=false — skipping"
        return 0
    fi

    log_info "AUTO-CONTINUE CHAIN [4/4]: launching next pipeline from $prd_path"

    # Increment counter BEFORE invoking Claude (survives child process boundaries)
    state_increment_pipeline_iteration || true

    _post_run_invoke_pipeline "$prd_path" || true
}

_post_run_invoke_pipeline() {
    local prd_path="$1"

    # Read the skill content
    local skill_file="${RALPH_DIR}/skills/ralph-pipeline-full-auto/SKILL.md"
    if [[ ! -f "$skill_file" ]]; then
        log_warn "Pipeline skill not found at $skill_file — skipping"
        return 0
    fi

    local skill_content
    skill_content=$(cat "$skill_file")

    # Prepend auto-continue directive: skip iTerm2 launch, run in-process
    local directive
    directive="IMPORTANT AUTO-CONTINUE DIRECTIVE: You are running inside an autonomous post-run chain. Skip Phase 9 (AppleScript/iTerm2 launch). Instead, run 'bash run-ralph.sh' directly in-process (not in a new terminal). The PRD file to use is: ${prd_path}"

    local prompt="${directive}

---

${skill_content}"

    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local timeout_secs
    timeout_secs=$(config_get '.post_run.pipeline_timeout_seconds' '3600')

    local output_file=".ralph/last-pipeline-output.txt"
    local exit_code=0

    $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
        < /dev/null 2>&1 | cat > "$output_file" || exit_code=$?

    if [[ $exit_code -eq 124 ]]; then
        log_warn "AUTO-CONTINUE CHAIN: pipeline invocation timed out after ${timeout_secs}s (non-fatal)"
    elif [[ $exit_code -ne 0 ]]; then
        log_warn "AUTO-CONTINUE CHAIN: pipeline invocation failed (exit code $exit_code, non-fatal)"
    else
        log_success "AUTO-CONTINUE CHAIN: pipeline invocation complete"
    fi
}
