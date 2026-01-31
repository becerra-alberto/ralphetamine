#!/bin/bash
# Ralph v2 — Testing specialist phase (optional second Claude invocation)

# Run a test review after a story is implemented and committed
testing_review() {
    local story_id="$1"
    local spec_path="$2"

    local enabled
    enabled=$(config_get '.testing_phase.enabled' 'false')
    if [[ "$enabled" != "true" ]]; then
        return 0
    fi

    local timeout_secs
    timeout_secs=$(config_get '.testing_phase.timeout_seconds' '600')

    log_info "Testing specialist: reviewing story $story_id"

    # Build test review prompt
    local prompt
    prompt=$(prompt_build_test_review "$story_id" "$spec_path") || {
        log_warn "Testing specialist: failed to build prompt"
        return 0
    }

    # Build claude command
    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local result exit_code=0

    if [[ "$RALPH_VERBOSE" == true ]]; then
        result=$($timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" 2>&1 | tee /dev/stderr) || exit_code=$?
    else
        result=$($timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" 2>&1) || exit_code=$?
    fi

    # Handle timeout
    if [[ $exit_code -eq 124 ]]; then
        log_warn "Testing specialist: timed out after ${timeout_secs}s (non-fatal)"
        return 0
    fi

    # Handle errors
    if [[ $exit_code -ne 0 ]]; then
        log_warn "Testing specialist: failed (exit code $exit_code, non-fatal)"
        return 0
    fi

    # Extract learnings from test review
    if type learnings_extract &>/dev/null; then
        learnings_extract "$result" "$story_id"
    fi

    # Parse test review signal
    local review_info
    if review_info=$(signals_parse_test_review_done "$result"); then
        local review_story="${review_info%%|*}"
        local review_result="${review_info#*|}"
        log_success "Testing specialist: $review_result"

        local timestamp
        timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
        echo "[TEST_REVIEW] Story $story_id - $review_result - $timestamp" >> progress.txt
    else
        log_warn "Testing specialist: no completion signal (non-fatal)"
    fi

    return 0
}
