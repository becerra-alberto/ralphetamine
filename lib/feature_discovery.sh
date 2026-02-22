#!/usr/bin/env bash
# Ralphetamine — Feature discovery via Claude analysis

# Analyze the codebase and generate a new PRD with actionable next stories.
# Outputs the PRD path to stdout on success; writes [DISCOVERY_DONE] to progress.txt.
# Non-fatal on all error paths (returns 0).
feature_discovery_run() {
    local timeout_secs="${1:-600}"

    local enabled
    enabled=$(config_get '.post_run.feature_discovery' 'true')
    if [[ "$enabled" != "true" ]]; then
        log_debug "Feature discovery disabled in config" >&2
        return 0
    fi

    local template_file="${RALPH_DIR}/templates/feature-discovery.md"
    if [[ ! -f "$template_file" ]]; then
        log_warn "Feature discovery: template not found at $template_file — skipping" >&2
        return 0
    fi

    log_info "Feature discovery: gathering context" >&2

    # Gather context variables
    local project_name
    project_name=$(config_get '.project.name' 'unknown')

    local completed_stories=""
    if type state_get_completed &>/dev/null; then
        completed_stories=$(state_get_completed 2>/dev/null || true)
    fi

    local recent_commits=""
    recent_commits=$(git log --oneline -20 2>/dev/null || true)

    local todo_fixme=""
    todo_fixme=$(grep -rn "TODO\|FIXME" . \
        --include="*.sh" --include="*.py" --include="*.js" --include="*.ts" --include="*.go" \
        --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir=".ralph" \
        2>/dev/null | head -50 || true)

    local readme=""
    if [[ -f "README.md" ]]; then
        readme=$(head -c 5000 README.md 2>/dev/null || true)
    fi

    local e2e_results=""
    if [[ -f ".ralph/e2e/last-result.txt" ]]; then
        e2e_results=$(cat ".ralph/e2e/last-result.txt" 2>/dev/null || true)
    fi

    local learnings=""
    if [[ -d ".ralph/learnings" ]]; then
        learnings=$(cat ".ralph/learnings"/*.md 2>/dev/null | head -c 5000 || true)
    fi

    # Build prompt from template
    local prompt
    prompt=$(sed \
        -e "s|{{PROJECT_NAME}}|${project_name}|g" \
        -e "s|{{COMPLETED_STORIES}}|${completed_stories}|g" \
        -e "s|{{RECENT_COMMITS}}|${recent_commits}|g" \
        -e "s|{{TODO_FIXME}}|${todo_fixme}|g" \
        -e "s|{{README}}|${readme}|g" \
        -e "s|{{E2E_RESULTS}}|${e2e_results}|g" \
        -e "s|{{LEARNINGS}}|${learnings}|g" \
        "$template_file")

    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local output_file=".ralph/last-discovery-output.txt"
    local exit_code=0

    log_info "Feature discovery: invoking Claude (timeout: ${timeout_secs}s)" >&2

    $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
        < /dev/null 2>&1 | cat > "$output_file" || exit_code=$?

    if [[ $exit_code -eq 124 ]]; then
        log_warn "Feature discovery: timed out after ${timeout_secs}s (non-fatal)" >&2
        return 0
    fi

    if [[ $exit_code -ne 0 ]]; then
        log_warn "Feature discovery: Claude failed (exit code $exit_code, non-fatal)" >&2
        return 0
    fi

    local result
    result=$(cat "$output_file")

    local ts_human
    ts_human=$(date '+%a %d %b %Y %H:%M:%S %Z')

    # Parse DISCOVERY_DONE signal
    local prd_path=""
    if type signals_parse_discovery_done &>/dev/null; then
        prd_path=$(signals_parse_discovery_done "$result" || true)
    fi

    if [[ -n "$prd_path" ]]; then
        log_success "Feature discovery: PRD generated at $prd_path" >&2
        echo "[DISCOVERY_DONE] ${prd_path} - ${ts_human}" >> progress.txt
        # Output the PRD path on stdout for the caller to capture
        echo "$prd_path"
    else
        log_info "Feature discovery: no actionable PRD generated (non-fatal)" >&2
        echo "[DISCOVERY_SKIP] no actionable items - ${ts_human}" >> progress.txt
    fi

    return 0
}
