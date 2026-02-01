#!/usr/bin/env bash
# Ralph v2 — Shared sequential runner and failure handler
# Extracted from bin/ralph so both sequential and parallel paths can use them.

_run_sequential() {
    local iterations="$1"
    local timeout_secs="$2"
    local verbose="$3"
    local dry_run="$4"
    local specific_story="$5"
    local resume_from="$6"

    local total_stories
    total_stories=$(stories_count_total)
    local done_count
    done_count=$(state_completed_count)
    local max_retries
    max_retries=$(config_get '.loop.max_retries' '3')

    # Initialize dashboard FIRST (sets scroll region before any output)
    if type display_init &>/dev/null; then
        display_init
        display_update_stories "$total_stories" "$done_count"
        display_update_retry 0 "$max_retries"
        display_refresh
    fi

    box_header "RALPH IMPLEMENTATION LOOP"
    box_kv "Project" "$(config_get '.project.name' '(unnamed)')"
    box_kv "Stories" "$done_count / $total_stories completed"
    box_kv "Iterations" "$( [[ "$iterations" == "0" ]] && echo "unlimited" || echo "$iterations" )"
    box_kv "Timeout" "${timeout_secs}s per story"
    [[ -n "$specific_story" ]] && box_kv "Story" "$specific_story (specific)"
    [[ -n "$resume_from" ]] && box_kv "Resume" "from $resume_from"
    echo ""

    log "Ralph loop starting"

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local iteration=0
    while true; do
        iteration=$((iteration + 1))

        # Check iteration limit
        if [[ "$iterations" != "0" && $iteration -gt $iterations ]]; then
            box_header "Reached iteration limit ($iterations)"
            break
        fi

        iteration_header "$iteration" "$( [[ "$iterations" == "0" ]] && echo "inf" || echo "$iterations" )"

        # Find next story
        local next_story
        if [[ -n "$specific_story" ]]; then
            next_story="$specific_story"
        elif ! next_story=$(stories_find_next "$resume_from"); then
            box_header "ALL STORIES COMPLETE!"
            log "All stories complete — Ralph loop finished"
            return 0
        fi
        # Clear resume after first use
        resume_from=""

        # Find spec file
        local spec_path
        if ! spec_path=$(spec_find "$next_story"); then
            log_error "Could not find spec for story $next_story"
            continue
        fi

        local title
        title=$(stories_get_title "$next_story" 2>/dev/null || spec_get_title "$spec_path")

        log "Starting story $next_story: $title"
        echo "  Story:  $next_story — $title"
        echo "  Spec:   $spec_path"

        # Dashboard: update current story and iteration
        if type display_update_current &>/dev/null; then
            display_update_current "$next_story" "$title"
            display_update_iteration "$iteration"
            display_refresh
        fi

        # Build prompt
        local prompt
        prompt=$(prompt_build "$next_story" "$spec_path") || continue

        # Dry run mode
        if [[ "$dry_run" == true ]]; then
            echo ""
            echo "[DRY RUN] Rendered prompt (first 30 lines):"
            divider
            echo "$prompt" | head -30
            echo "..."
            divider
            [[ -n "$specific_story" ]] && return 0
            continue
        fi

        # Run hooks
        hooks_run "pre_story" "RALPH_STORY=$next_story" "RALPH_SPEC=$spec_path" || true

        # Update state
        state_set_current "$next_story" || log_warn "Could not update state"

        # Build claude command
        local claude_flags=()
        while IFS= read -r flag; do
            [[ -n "$flag" ]] && claude_flags+=("$flag")
        done < <(config_get_claude_flags)

        local output_file=".ralph/last-claude-output.txt"
        local exit_code=0

        # Start live dashboard timer so elapsed clock ticks during execution
        if type display_start_live_timer &>/dev/null; then
            display_start_live_timer
        fi

        log "Invoking Claude (timeout: ${timeout_secs}s)"

        if [[ "$verbose" == true ]]; then
            # Verbose: tee to terminal AND file
            $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
                < /dev/null 2>&1 | tee "$output_file" || exit_code=$?
        else
            # Silent: write directly to file
            $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
                < /dev/null > "$output_file" 2>&1 || exit_code=$?
        fi

        # Read captured output
        local result
        result=$(cat "$output_file" 2>/dev/null) || true
        local result_len=${#result}
        log "Claude returned: exit_code=$exit_code output_length=$result_len"

        # Stop live timer now that Claude has returned
        if type display_stop_live_timer &>/dev/null; then
            display_stop_live_timer
        fi

        # Handle timeout
        if [[ $exit_code -eq 124 ]]; then
            log_warn "Story $next_story timed out after ${timeout_secs}s"
            _handle_failure "$next_story" "Timeout after ${timeout_secs}s" "$spec_path" "$max_retries"
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=timeout" || true
            continue
        fi

        # Handle other errors
        if [[ $exit_code -ne 0 ]]; then
            log_error "Story $next_story failed (exit code: $exit_code)"
            _handle_failure "$next_story" "Exit code $exit_code" "$spec_path" "$max_retries"
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=error" || true
            continue
        fi

        # Extract learnings
        if type learnings_extract &>/dev/null; then
            learnings_extract "$result" "$next_story" || true
        fi

        # Parse signals
        local done_id
        if done_id=$(signals_parse_done "$result"); then
            if [[ "$done_id" == "$next_story" ]]; then
                log_success "Story $next_story completed!"
                state_mark_done "$next_story"
                spec_update_status "$spec_path" "done"

                # Dashboard: update completion
                if type display_update_stories &>/dev/null; then
                    done_count=$(state_completed_count)
                    display_update_stories "$total_stories" "$done_count"
                    display_update_last_done "$next_story"
                    display_update_retry 0 "$max_retries"
                    display_update_learnings "$(_display_count_learnings 2>/dev/null || echo 0)"
                    display_refresh
                fi

                # Append to progress.txt
                local timestamp
                timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
                echo "[DONE] Story $next_story - $title - $timestamp" >> progress.txt 2>/dev/null || true

                # Testing specialist phase
                if [[ "$(config_get '.testing_phase.enabled' 'false')" == "true" ]]; then
                    if type testing_review &>/dev/null; then
                        testing_review "$next_story" "$spec_path"
                    fi
                fi

                hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=done" || true

                [[ -n "$specific_story" ]] && return 0
            else
                log_warn "DONE signal for $done_id but expected $next_story"
                _handle_failure "$next_story" "Mismatched DONE signal" "$spec_path" "$max_retries"
            fi
        elif fail_info=$(signals_parse_fail "$result"); then
            local fail_id="${fail_info%%|*}"
            local fail_reason="${fail_info#*|}"
            log_error "Story $fail_id failed: $fail_reason"
            _handle_failure "$next_story" "$fail_reason" "$spec_path" "$max_retries"
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=fail" || true
        else
            log_warn "No completion signal found"
            _handle_failure "$next_story" "No completion signal in output" "$spec_path" "$max_retries"
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=no_signal" || true
        fi

        hooks_run "post_iteration" "RALPH_ITERATION=$iteration" || true
    done
}

_handle_failure() {
    local story="$1"
    local reason="$2"
    local spec_path="$3"
    local max_retries="$4"

    state_increment_retry "$story"
    local retry_count
    retry_count=$(state_get_retry_count)

    local timestamp
    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
    echo "[FAIL] Story $story - $reason - $timestamp (attempt $retry_count/$max_retries)" >> progress.txt 2>/dev/null || true

    log "Story $story failed (attempt $retry_count/$max_retries): $reason"

    # Dashboard: update retry count
    if type display_update_retry &>/dev/null; then
        display_update_retry "$retry_count" "$max_retries"
        display_refresh
    fi

    if [[ $retry_count -ge $max_retries ]]; then
        box_header "MAX RETRIES EXCEEDED"
        echo "  Story $story failed $max_retries times."
        echo "  Human intervention required."
        echo ""
        echo "  Last failure: $reason"
        echo ""
        echo "  To retry: ralph run -s $story"
        log "EXITING: Story $story exceeded max retries ($max_retries)"
        exit 1
    fi
}
