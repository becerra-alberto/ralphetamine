#!/usr/bin/env bash
# Ralph v2 — Shared sequential runner and failure handler
# Extracted from bin/ralph so both sequential and parallel paths can use them.

RALPH_LOCK_FILE=".ralph/.lock"

# ── Run-level timing data ──────────────────────────────────────────
declare -A _STORY_TIMINGS=()       # story_id → seconds
declare -A _STORY_OUTCOMES=()      # story_id → done|tentative|failed|absorbed
declare -A _STORY_TOKENS_IN=()     # story_id → input token count
declare -A _STORY_TOKENS_OUT=()    # story_id → output token count
declare -A _STORY_COST=()          # story_id → cost in USD (string)
declare -A _STORY_TURNS=()         # story_id → number of agentic turns
_RALPH_RUN_START_COMMIT=""
_RALPH_RUN_START_TIME=""
_RALPH_LEARNINGS_EXTRACTED=0       # count of learnings extracted this run

# Extract metrics from JSON-format Claude output.
# If the output is a valid JSON result envelope, parses token usage/cost
# and stores in _STORY_* arrays. Returns the text result on stdout for
# signal parsing. Falls back to echoing raw output if not JSON.
_extract_metrics() {
    local json_output="$1" story_id="$2"

    # Quick check: does it look like JSON result envelope?
    if echo "$json_output" | jq -e '.type == "result"' &>/dev/null 2>&1; then
        _STORY_TOKENS_IN["$story_id"]=$(echo "$json_output" | jq -r '.usage.input_tokens // 0')
        _STORY_TOKENS_OUT["$story_id"]=$(echo "$json_output" | jq -r '.usage.output_tokens // 0')
        _STORY_COST["$story_id"]=$(echo "$json_output" | jq -r '.total_cost_usd // 0')
        _STORY_TURNS["$story_id"]=$(echo "$json_output" | jq -r '.num_turns // 0')
        # Return the text result for signal parsing
        echo "$json_output" | jq -r '.result // ""'
    else
        # Not JSON (e.g., timeout killed before JSON emitted) — pass through
        echo "$json_output"
    fi
}

# Acquire an exclusive run lock. Prevents concurrent ralph instances.
# Writes PID to lock file. Detects stale locks via kill -0.
_acquire_run_lock() {
    if [[ -f "$RALPH_LOCK_FILE" ]]; then
        local existing_pid
        existing_pid=$(cat "$RALPH_LOCK_FILE" 2>/dev/null) || true
        if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" 2>/dev/null; then
            log_error "Another Ralph instance is running (PID $existing_pid)"
            log_error "If this is stale, remove $RALPH_LOCK_FILE manually"
            return 1
        fi
        log_warn "Removing stale lock (PID $existing_pid no longer running)"
        rm -f "$RALPH_LOCK_FILE"
    fi
    echo "$$" > "$RALPH_LOCK_FILE"
    log_debug "Acquired run lock (PID $$)"
}

# Release the run lock — only deletes if we own it.
_release_run_lock() {
    if [[ -f "$RALPH_LOCK_FILE" ]]; then
        local lock_pid
        lock_pid=$(cat "$RALPH_LOCK_FILE" 2>/dev/null) || true
        if [[ "$lock_pid" == "$$" ]]; then
            rm -f "$RALPH_LOCK_FILE"
            log_debug "Released run lock (PID $$)"
        fi
    fi
}

# Tracks consecutive failures per story using caller's local variables.
# Returns 0 (true) when local retry limit is reached, signaling the caller to abort.
# Relies on local_retry_count and last_failed_story from _run_sequential's scope.
_track_local_retry() {
    local story="$1"
    local max_retries="$2"
    if [[ "$story" == "$last_failed_story" ]]; then
        local_retry_count=$((local_retry_count + 1))
    else
        local_retry_count=1
        last_failed_story="$story"
    fi
    if [[ $local_retry_count -ge $max_retries ]]; then
        log "Local retry limit reached for $story ($local_retry_count/$max_retries)"
        return 0  # true — caller should abort
    fi
    return 1  # false — keep going
}

# Run a timeout postmortem analysis.
# Launches a second Claude invocation to analyze why a story timed out.
# Output: learnings extracted to .ralph/learnings/timeouts/<story>.md
# Returns 0 on success (or if postmortem disabled), non-zero on error.
_run_timeout_postmortem() {
    local story_id="$1"
    local spec_path="$2"
    local partial_output="$3"
    local timeout_secs="$4"

    # Check if postmortem is enabled
    local pm_enabled
    pm_enabled=$(config_get '.postmortem.enabled' 'true')
    if [[ "$pm_enabled" != "true" ]]; then
        log_debug "Postmortem disabled by config"
        return 0
    fi

    local pm_window
    pm_window=$(config_get '.postmortem.window_seconds' '300')
    local max_chars
    max_chars=$(config_get '.postmortem.max_output_chars' '50000')

    log_info "Running timeout postmortem for story $story_id (window: ${pm_window}s)"

    # Truncate partial output to max_chars
    local truncated_output="${partial_output:0:$max_chars}"

    # Load spec content (truncate to 5000 chars for prompt)
    local spec_content=""
    if [[ -f "$spec_path" ]]; then
        spec_content=$(head -c 5000 "$spec_path" 2>/dev/null) || true
    fi

    # Load and populate template
    local template
    if ! template=$(prompt_load_template "timeout-postmortem" 2>/dev/null); then
        log_warn "No timeout-postmortem template found. Skipping postmortem."
        return 0
    fi

    template=$(prompt_substitute "$template" \
        "STORY_ID=$story_id" \
        "SPEC_CONTENT=$spec_content" \
        "PARTIAL_OUTPUT=$truncated_output"
    )

    # Build claude command
    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local pm_output_file=".ralph/last-postmortem-output.txt"

    # Invoke Claude for postmortem (pipe-through-cat pattern)
    local pm_exit=0
    $timeout_cmd "$pm_window" claude "${claude_flags[@]}" "$template" \
        < /dev/null 2>&1 | cat > "$pm_output_file" || pm_exit=$?

    local pm_result
    pm_result=$(cat "$pm_output_file" 2>/dev/null) || true

    # Extract text from JSON envelope if needed
    if echo "$pm_result" | jq -e '.type == "result"' &>/dev/null 2>&1; then
        pm_result=$(echo "$pm_result" | jq -r '.result // ""')
    fi

    # Extract learnings from postmortem output
    if type learnings_extract &>/dev/null && [[ -n "$pm_result" ]]; then
        learnings_extract "$pm_result" "$story_id" || true
    fi

    # Persist full postmortem to .ralph/learnings/timeouts/
    mkdir -p ".ralph/learnings/timeouts"
    {
        echo "# Timeout Postmortem: Story $story_id"
        echo "Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        echo "Timeout: ${timeout_secs}s"
        echo ""
        echo "$pm_result"
    } > ".ralph/learnings/timeouts/${story_id}.md"

    # Log result
    local timestamp
    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
    echo "[TIMEOUT_POSTMORTEM] Story $story_id - $timestamp" >> progress.txt 2>/dev/null || true

    if [[ $pm_exit -eq 124 ]]; then
        log_warn "Postmortem itself timed out after ${pm_window}s (partial output persisted)"
    elif [[ $pm_exit -ne 0 ]]; then
        log_warn "Postmortem exited with code $pm_exit"
    else
        # Check for completion signal
        if signals_parse_timeout_postmortem_done "$pm_result" &>/dev/null; then
            log_info "Postmortem completed for story $story_id"
        else
            log_warn "Postmortem completed without signal (output persisted)"
        fi
    fi

    return 0
}

# Compute effective timeout: total_timeout - postmortem_window
# Returns the effective timeout on stdout. If the remaining time after
# subtracting the window is less than 60s, returns the full timeout
# (postmortem is skipped when there isn't enough time).
_compute_effective_timeout() {
    local total_timeout="$1"

    local pm_enabled
    pm_enabled=$(config_get '.postmortem.enabled' 'true')
    if [[ "$pm_enabled" != "true" ]]; then
        echo "$total_timeout"
        return
    fi

    local pm_window
    pm_window=$(config_get '.postmortem.window_seconds' '300')

    local effective=$(( total_timeout - pm_window ))
    if [[ $effective -lt 60 ]]; then
        # Not enough time for postmortem — use full timeout
        echo "$total_timeout"
    else
        echo "$effective"
    fi
}

_run_sequential() {
    local iterations="$1"
    local timeout_secs="$2"
    local verbose="$3"
    local dry_run="$4"
    local specific_story="$5"
    local resume_from="$6"

    # Capture baseline for end-of-run summary
    _RALPH_RUN_START_COMMIT=$(git rev-parse HEAD 2>/dev/null) || true
    _RALPH_RUN_START_TIME=$(date '+%s')

    local total_stories
    total_stories=$(stories_count_total)
    local done_count
    done_count=$(stories_count_completed)
    local max_retries
    max_retries=$(config_get '.loop.max_retries' '3')

    # Initialize dashboard
    # Skip in parallel context — parallel.sh uses inline display mode
    if [[ "${_RALPH_PARALLEL_CONTEXT:-}" != true ]]; then
        if type display_init &>/dev/null; then
            display_init
            display_update_stories "$total_stories" "$done_count"
            display_update_retry 0 "$max_retries"
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
    fi

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    # Local retry counter — primary defense against infinite loops.
    # Does not depend on state.json I/O succeeding.
    local local_retry_count=0
    local last_failed_story=""

    local iteration=0
    while true; do
        iteration=$((iteration + 1))

        # Check iteration limit
        if [[ "$iterations" != "0" && $iteration -gt $iterations ]]; then
            if [[ "${_RALPH_PARALLEL_CONTEXT:-}" != true ]]; then
                box_header "Reached iteration limit ($iterations)"
            fi
            _run_summary "sequential"
            break
        fi

        if [[ "${_RALPH_PARALLEL_CONTEXT:-}" != true ]]; then
            iteration_header "$iteration" "$( [[ "$iterations" == "0" ]] && echo "inf" || echo "$iterations" )"
        fi

        # Find next story
        local next_story
        if [[ -n "$specific_story" ]]; then
            next_story="$specific_story"
        elif ! next_story=$(stories_find_next "$resume_from"); then
            if [[ "$total_stories" -eq 0 ]]; then
                log_error "No stories found in stories.txt"
                return 1
            fi
            if [[ "${_RALPH_PARALLEL_CONTEXT:-}" != true ]]; then
                box_header "ALL STORIES COMPLETE!"
                log "All stories complete — Ralph loop finished"
            fi
            _run_summary "sequential"
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
        if [[ "${_RALPH_PARALLEL_CONTEXT:-}" != true ]] && type display_start_live_timer &>/dev/null; then
            display_start_live_timer
        fi

        local story_start
        story_start=$(date '+%s')

        # Compute effective timeout (reserves time for postmortem if enabled)
        local effective_timeout
        effective_timeout=$(_compute_effective_timeout "$timeout_secs")

        log "Invoking Claude (timeout: ${effective_timeout}s of ${timeout_secs}s)"

        if [[ "$verbose" == true ]]; then
            # Verbose: tee to terminal AND file
            $timeout_cmd "$effective_timeout" claude "${claude_flags[@]}" "$prompt" \
                < /dev/null 2>&1 | tee "$output_file" || exit_code=$?
        else
            # Silent: pipe-based capture (Claude CLI doesn't flush with file redirects)
            $timeout_cmd "$effective_timeout" claude "${claude_flags[@]}" "$prompt" \
                < /dev/null 2>&1 | cat > "$output_file" || exit_code=$?
        fi

        # Read captured output and extract metrics from JSON envelope
        local raw_output
        raw_output=$(cat "$output_file" 2>/dev/null) || true
        local result
        result=$(_extract_metrics "$raw_output" "$next_story")
        local result_len=${#result}
        log "Claude returned: exit_code=$exit_code output_length=$result_len"

        # Stop live timer now that Claude has returned
        if [[ "${_RALPH_PARALLEL_CONTEXT:-}" != true ]] && type display_stop_live_timer &>/dev/null; then
            display_stop_live_timer
        fi

        # Record per-story duration
        local story_end
        story_end=$(date '+%s')
        _STORY_TIMINGS["$next_story"]=$(( story_end - story_start ))

        # Extract learnings from whatever output exists, regardless of exit code.
        # Claude often emits LEARN signals before timing out — capture them early.
        if type learnings_extract &>/dev/null && [[ -n "$result" ]]; then
            learnings_extract "$result" "$next_story" || true
        fi

        # Handle timeout
        if [[ $exit_code -eq 124 ]]; then
            log_warn "Story $next_story timed out after ${effective_timeout}s"
            _STORY_OUTCOMES["$next_story"]="failed"
            if type display_story_failed &>/dev/null; then
                local dur_str=""
                [[ -n "${_STORY_TIMINGS[$next_story]:-}" ]] && \
                    dur_str=$(_display_format_duration "${_STORY_TIMINGS[$next_story]}")
                display_story_failed "$next_story" "Timeout after ${effective_timeout}s" "$dur_str"
            fi
            # Run postmortem analysis on the partial output
            _run_timeout_postmortem "$next_story" "$spec_path" "$result" "$timeout_secs" || true
            if ! _handle_failure "$next_story" "Timeout after ${effective_timeout}s" "$spec_path" "$max_retries"; then
                return 1
            fi
            _track_local_retry "$next_story" "$max_retries" && return 1
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=timeout" || true
            continue
        fi

        # Handle other errors
        if [[ $exit_code -ne 0 ]]; then
            log_error "Story $next_story failed (exit code: $exit_code)"
            _STORY_OUTCOMES["$next_story"]="failed"
            if type display_story_failed &>/dev/null; then
                local dur_str=""
                [[ -n "${_STORY_TIMINGS[$next_story]:-}" ]] && \
                    dur_str=$(_display_format_duration "${_STORY_TIMINGS[$next_story]}")
                display_story_failed "$next_story" "Exit code $exit_code" "$dur_str"
            fi
            if ! _handle_failure "$next_story" "Exit code $exit_code" "$spec_path" "$max_retries"; then
                return 1
            fi
            _track_local_retry "$next_story" "$max_retries" && return 1
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=error" || true
            continue
        fi

        # Parse signals
        local done_id
        if done_id=$(signals_parse_done "$result"); then
            if [[ "$done_id" == "$next_story" ]]; then
                log_success "Story $next_story completed!"
                _STORY_OUTCOMES["$next_story"]="done"
                state_mark_done "$next_story"
                spec_update_status "$spec_path" "done"

                # Dashboard: update completion and emit status line
                if type display_update_stories &>/dev/null; then
                    done_count=$(stories_count_completed)
                    display_update_stories "$total_stories" "$done_count"
                    display_update_last_done "$next_story"
                    display_update_retry 0 "$max_retries"
                    display_update_learnings "$(_display_count_learnings 2>/dev/null || echo 0)"
                fi
                if type display_story_completed &>/dev/null; then
                    local dur_str=""
                    [[ -n "${_STORY_TIMINGS[$next_story]:-}" ]] && \
                        dur_str=$(_display_format_duration "${_STORY_TIMINGS[$next_story]}")
                    local tokens="${_STORY_TOKENS_IN[$next_story]:-0}"
                    local cost="${_STORY_COST[$next_story]:-0}"
                    display_story_completed "$next_story" "$dur_str" "$tokens" "$cost"
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

                # Reset local retry tracking on success
                local_retry_count=0
                last_failed_story=""

                [[ -n "$specific_story" ]] && return 0
            else
                log_warn "DONE signal for $done_id but expected $next_story"
                _STORY_OUTCOMES["$next_story"]="failed"
                if ! _handle_failure "$next_story" "Mismatched DONE signal" "$spec_path" "$max_retries"; then
                    return 1
                fi
                _track_local_retry "$next_story" "$max_retries" && return 1
            fi
        elif fail_info=$(signals_parse_fail "$result"); then
            local fail_id="${fail_info%%|*}"
            local fail_reason="${fail_info#*|}"
            log_error "Story $fail_id failed: $fail_reason"
            _STORY_OUTCOMES["$next_story"]="failed"
            if ! _handle_failure "$next_story" "$fail_reason" "$spec_path" "$max_retries"; then
                return 1
            fi
            _track_local_retry "$next_story" "$max_retries" && return 1
            hooks_run "post_story" "RALPH_STORY=$next_story" "RALPH_RESULT=fail" || true
        else
            log_warn "No completion signal found"
            _STORY_OUTCOMES["$next_story"]="failed"
            if ! _handle_failure "$next_story" "No completion signal in output" "$spec_path" "$max_retries"; then
                return 1
            fi
            _track_local_retry "$next_story" "$max_retries" && return 1
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
        return 1
    fi
}

# ── End-of-run summary ─────────────────────────────────────────────
# Shared by sequential and parallel paths. Reads from:
#   _STORY_TIMINGS[], _STORY_OUTCOMES[]
#   _RALPH_RUN_START_COMMIT, _RALPH_RUN_START_TIME
#   _PARALLEL_SUCCESSFUL[], _PARALLEL_FAILED[] (parallel only — declared in parallel.sh)
_run_summary() {
    local mode="${1:-sequential}"   # sequential | parallel

    # ── Format duration helper ──────────────────────────────────────
    _fmt_duration() {
        local secs="$1"
        [[ "$secs" -lt 0 ]] && secs=0
        local h=$(( secs / 3600 ))
        local m=$(( (secs % 3600) / 60 ))
        local s=$(( secs % 60 ))
        if [[ $h -gt 0 ]]; then
            printf '%02d:%02d:%02d' "$h" "$m" "$s"
        else
            printf '%02d:%02d' "$m" "$s"
        fi
    }

    # ── Gather story lists by outcome ──────────────────────────────
    local completed_ids=() tentative_ids=() failed_ids=() absorbed_ids=()

    for sid in "${!_STORY_OUTCOMES[@]}"; do
        case "${_STORY_OUTCOMES[$sid]}" in
            done)      completed_ids+=("$sid") ;;
            tentative) tentative_ids+=("$sid") ;;
            failed)    failed_ids+=("$sid") ;;
            absorbed)  absorbed_ids+=("$sid") ;;
        esac
    done

    # Check for absorbed stories from state
    if type state_is_absorbed &>/dev/null; then
        for sid in "${completed_ids[@]}"; do
            if state_is_absorbed "$sid" 2>/dev/null; then
                absorbed_ids+=("$sid")
            fi
        done
    fi

    local total_stories
    total_stories=$(stories_count_total 2>/dev/null || echo "0")
    local done_count
    done_count=$(stories_count_completed 2>/dev/null || echo "0")

    # ── Elapsed time ────────────────────────────────────────────────
    local elapsed_str="--:--"
    local elapsed_secs=0
    if [[ -n "$_RALPH_RUN_START_TIME" ]]; then
        elapsed_secs=$(( $(date '+%s') - _RALPH_RUN_START_TIME ))
        elapsed_str=$(_fmt_duration "$elapsed_secs")
    fi

    # ── Average time per story ──────────────────────────────────────
    local avg_str="--:--"
    local stories_with_timing=${#_STORY_TIMINGS[@]}
    if [[ $stories_with_timing -gt 0 ]]; then
        local total_time=0
        for t in "${_STORY_TIMINGS[@]}"; do
            total_time=$((total_time + t))
        done
        avg_str=$(_fmt_duration $(( total_time / stories_with_timing )))
    fi

    # ── Fastest / longest ───────────────────────────────────────────
    local fastest_id="" fastest_secs=999999
    local longest_id="" longest_secs=0
    for sid in "${!_STORY_TIMINGS[@]}"; do
        local t="${_STORY_TIMINGS[$sid]}"
        if [[ $t -lt $fastest_secs ]]; then
            fastest_secs=$t; fastest_id="$sid"
        fi
        if [[ $t -gt $longest_secs ]]; then
            longest_secs=$t; longest_id="$sid"
        fi
    done

    # ── Git stats ───────────────────────────────────────────────────
    local commit_count=0 insertions=0 deletions=0 merged_count=0
    if [[ -n "$_RALPH_RUN_START_COMMIT" ]]; then
        commit_count=$(git rev-list --count "${_RALPH_RUN_START_COMMIT}..HEAD" 2>/dev/null) || commit_count=0
        local shortstat
        shortstat=$(git diff --shortstat "${_RALPH_RUN_START_COMMIT}..HEAD" 2>/dev/null) || true
        if [[ -n "$shortstat" ]]; then
            insertions=$(echo "$shortstat" | grep -o '[0-9]* insertion' | grep -o '[0-9]*') || insertions=0
            deletions=$(echo "$shortstat" | grep -o '[0-9]* deletion' | grep -o '[0-9]*') || deletions=0
        fi
    fi

    # Count merged branches (parallel only — arrays declared in parallel.sh)
    if [[ "$mode" == "parallel" ]]; then
        # Guard against undeclared array (e.g. in tests that don't source parallel.sh)
        if declare -p _PARALLEL_SUCCESSFUL &>/dev/null; then
            merged_count=${#_PARALLEL_SUCCESSFUL[@]}
        fi
    fi

    # ── Learnings ───────────────────────────────────────────────────
    local learnings_count=0
    learnings_count=$(_display_count_learnings 2>/dev/null || echo "0")

    # ── Render ──────────────────────────────────────────────────────
    echo ""
    box_header "RUN SUMMARY"

    # Progress line
    local bar
    bar=$(ui_progress_bar "$done_count" "$total_stories")
    printf "  ${CLR_DIM}%-14s${CLR_RESET} %s\n" "Progress" "$bar"
    printf "  ${CLR_DIM}%-14s${CLR_RESET} %s\n" "Elapsed" "$elapsed_str"
    if [[ $stories_with_timing -gt 0 ]]; then
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %s\n" "Avg/story" "$avg_str"
    fi
    echo ""

    # Outcome counts
    printf "  ${CLR_GREEN}%-14s${CLR_RESET} %d\n" "Completed" "${#completed_ids[@]}"
    if [[ "$mode" == "parallel" ]]; then
        printf "  ${CLR_YELLOW}%-14s${CLR_RESET} %d" "Tentative" "${#tentative_ids[@]}"
        [[ ${#tentative_ids[@]} -gt 0 ]] && printf "   ${CLR_DIM}(committed code, no DONE signal)${CLR_RESET}"
        echo ""
    fi
    printf "  ${CLR_RED}%-14s${CLR_RESET} %d\n" "Failed" "${#failed_ids[@]}"
    if [[ ${#absorbed_ids[@]} -gt 0 ]]; then
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %d\n" "Absorbed" "${#absorbed_ids[@]}"
    fi

    # ── Fastest / Longest ───────────────────────────────────────────
    if [[ -n "$fastest_id" && $stories_with_timing -gt 1 ]]; then
        echo ""
        divider
        local fastest_title longest_title
        fastest_title=$(stories_get_title "$fastest_id" 2>/dev/null || echo "")
        longest_title=$(stories_get_title "$longest_id" 2>/dev/null || echo "")
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %-10s %s — %s\n" \
            "Fastest" "$(_fmt_duration "$fastest_secs")" "$fastest_id" "$fastest_title"
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %-10s %s — %s\n" \
            "Longest" "$(_fmt_duration "$longest_secs")" "$longest_id" "$longest_title"
    fi

    # ── Git stats ───────────────────────────────────────────────────
    if [[ -n "$_RALPH_RUN_START_COMMIT" && $commit_count -gt 0 ]]; then
        echo ""
        divider
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %s\n" "Commits" "$commit_count"
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %s lines\n" "Insertions" "${insertions:-0}"
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %s lines\n" "Deletions" "${deletions:-0}"
        if [[ "$mode" == "parallel" && $merged_count -gt 0 ]]; then
            printf "  ${CLR_DIM}%-14s${CLR_RESET} %d branches\n" "Merged" "$merged_count"
        fi
    fi

    # ── Story details ───────────────────────────────────────────────
    if [[ ${#completed_ids[@]} -gt 0 || ${#tentative_ids[@]} -gt 0 || ${#failed_ids[@]} -gt 0 ]]; then
        echo ""
        divider

        if [[ ${#completed_ids[@]} -gt 0 ]]; then
            echo -e "  ${CLR_GREEN}Completed Stories${CLR_RESET}"
            for sid in "${completed_ids[@]}"; do
                local stitle dur_str=""
                stitle=$(stories_get_title "$sid" 2>/dev/null || echo "")
                if [[ -n "${_STORY_TIMINGS[$sid]:-}" ]]; then
                    dur_str=" ($(_fmt_duration "${_STORY_TIMINGS[$sid]}"))"
                fi
                printf "    ${CLR_GREEN}✓${CLR_RESET} %-8s— %-40s${CLR_DIM}%s${CLR_RESET}\n" \
                    "$sid" "$stitle" "$dur_str"
            done
        fi

        if [[ ${#tentative_ids[@]} -gt 0 ]]; then
            echo ""
            echo -e "  ${CLR_YELLOW}Tentative (review recommended)${CLR_RESET}"
            for sid in "${tentative_ids[@]}"; do
                local stitle dur_str=""
                stitle=$(stories_get_title "$sid" 2>/dev/null || echo "")
                if [[ -n "${_STORY_TIMINGS[$sid]:-}" ]]; then
                    dur_str=" ($(_fmt_duration "${_STORY_TIMINGS[$sid]}"))"
                fi
                printf "    ${CLR_YELLOW}~${CLR_RESET} %-8s— %-40s${CLR_DIM}%s${CLR_RESET}\n" \
                    "$sid" "$stitle" "$dur_str"
            done
        fi

        if [[ ${#failed_ids[@]} -gt 0 ]]; then
            echo ""
            echo -e "  ${CLR_RED}Failed${CLR_RESET}"
            for sid in "${failed_ids[@]}"; do
                local stitle dur_str=""
                stitle=$(stories_get_title "$sid" 2>/dev/null || echo "")
                if [[ -n "${_STORY_TIMINGS[$sid]:-}" ]]; then
                    dur_str=" ($(_fmt_duration "${_STORY_TIMINGS[$sid]}"))"
                fi
                printf "    ${CLR_RED}✗${CLR_RESET} %-8s— %-40s${CLR_DIM}%s${CLR_RESET}\n" \
                    "$sid" "$stitle" "$dur_str"
            done
        fi
    fi

    # ── Learnings ───────────────────────────────────────────────────
    if [[ $learnings_count -gt 0 ]]; then
        echo ""
        divider
        printf "  ${CLR_DIM}%-14s${CLR_RESET} %d extracted → .ralph/learnings/\n" "Learnings" "$learnings_count"
    fi

    # ── Pending git status ──────────────────────────────────────────
    local git_status
    git_status=$(git status --porcelain 2>/dev/null) || true
    if [[ -n "$git_status" ]]; then
        echo ""
        divider
        echo -e "  ${CLR_DIM}Pending Review${CLR_RESET}"
        echo "$git_status" | head -10 | while IFS= read -r line; do
            printf "    %s\n" "$line"
        done
        local status_lines
        status_lines=$(echo "$git_status" | wc -l | xargs)
        if [[ "$status_lines" -gt 10 ]]; then
            printf "    ${CLR_DIM}... and %d more${CLR_RESET}\n" $(( status_lines - 10 ))
        fi
    fi

    # ── Retry hint ──────────────────────────────────────────────────
    if [[ ${#failed_ids[@]} -gt 0 ]]; then
        echo ""
        divider
        local first_failed="${failed_ids[0]}"
        if [[ ${#failed_ids[@]} -eq 1 ]]; then
            echo -e "  ${CLR_DIM}→ 1 failed. Retry:${CLR_RESET} ralph run -s $first_failed"
        else
            echo -e "  ${CLR_DIM}→ ${#failed_ids[@]} failed. Retry first:${CLR_RESET} ralph run -s $first_failed"
        fi
    fi

    # ── HITL review generation (config-gated) ────────────────────
    if [[ "$(config_get '.hitl.auto_generate' 'false')" == "true" ]]; then
        if declare -f hitl_generate_report &>/dev/null; then
            local hitl_path
            hitl_path=$(config_get '.hitl.output_path' 'docs/hitl-review.html')
            if hitl_generate_report "$hitl_path" 2>/dev/null; then
                echo ""
                divider
                printf "  ${CLR_DIM}%-14s${CLR_RESET} %s\n" "HITL Review" "$hitl_path"
            fi
        fi
    fi

    # ── HITL review nudge (always shown) ───────────────────────────
    # Show nudge when auto_generate is off, or after auto_generate ran
    if [[ "$(config_get '.hitl.auto_generate' 'false')" != "true" ]]; then
        echo ""
        divider
        echo -e "  ${CLR_DIM}→ Review what was built:${CLR_RESET} ralph hitl"
    fi

    # ── Token usage summary (if metrics available) ───────────────
    local has_metrics=false
    for sid in "${!_STORY_TOKENS_IN[@]}"; do
        [[ "${_STORY_TOKENS_IN[$sid]:-0}" -gt 0 ]] && has_metrics=true && break
    done

    if [[ "$has_metrics" == true ]]; then
        echo ""
        divider
        echo -e "  ${CLR_DIM}Token Usage${CLR_RESET}"
        printf "    ${CLR_DIM}%-9s %10s %10s %8s %5s${CLR_RESET}\n" \
            "Story" "Tokens In" "Tokens Out" "Cost" "Turns"
        for sid in $(echo "${!_STORY_TOKENS_IN[@]}" | tr ' ' '\n' | sort -t. -k1,1n -k2,2n); do
            local tin="${_STORY_TOKENS_IN[$sid]:-0}"
            local tout="${_STORY_TOKENS_OUT[$sid]:-0}"
            local cost="${_STORY_COST[$sid]:-0}"
            local turns="${_STORY_TURNS[$sid]:-0}"
            [[ "$tin" -eq 0 && "$tout" -eq 0 ]] && continue
            local flag=""
            [[ "$turns" -gt 6 ]] && flag=" ⚠"
            local tin_fmt tout_fmt cost_fmt
            tin_fmt=$(printf "%'d" "$tin" 2>/dev/null || echo "$tin")
            tout_fmt=$(printf "%'d" "$tout" 2>/dev/null || echo "$tout")
            cost_fmt=$(printf '$%.2f' "$cost" 2>/dev/null || echo "\$$cost")
            printf "    %-9s %10s %10s %8s %3s%s\n" \
                "$sid" "$tin_fmt" "$tout_fmt" "$cost_fmt" "$turns" "$flag"
        done
    fi

    # ── Persist run stats to .ralph/runs/ ────────────────────────
    if type _persist_run_stats &>/dev/null; then
        _persist_run_stats "$mode" || true
    fi

    echo ""
}
