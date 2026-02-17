#!/usr/bin/env bash
# Ralph v2 — Git worktree parallelization and merge orchestration
# Requires Bash 4.0+ (gated at entry via prereqs_require_bash4)

RALPH_WORKTREE_DIR=".ralph/worktrees"

# Module-scope arrays for batch results (not declared inside functions)
_PARALLEL_SUCCESSFUL=()
_PARALLEL_FAILED=()
_PARALLEL_PID_DIR=""
_RALPH_PARALLEL_CONTEXT=false

# Per-story start-time tracking (story → epoch) for duration calculation
declare -A _PARALLEL_STORY_START

_parallel_cleanup_pid_dir() {
    [[ -n "$_PARALLEL_PID_DIR" && -d "$_PARALLEL_PID_DIR" ]] || return 0

    # Kill all tracked worker processes before removing PID files.
    # Without this, Ctrl+C leaves orphaned timeout/claude processes
    # running (potentially for 30+ minutes) burning API credits.
    for pid_file in "$_PARALLEL_PID_DIR"/pid_*; do
        [[ -f "$pid_file" ]] || continue
        local pid="${pid_file##*pid_}"
        if kill -0 "$pid" 2>/dev/null; then
            # Kill the process group rooted at the subshell — this reaches
            # the timeout command and Claude process beneath it
            kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
        fi
    done

    rm -rf "$_PARALLEL_PID_DIR"
}

# Check if a story branch has new commits relative to a base branch.
# Returns 0 (true) if the branch has commits beyond the base.
_parallel_has_new_commits() {
    local story="$1"
    local base_branch="$2"
    local branch_name="ralph/story-${story}"

    # Branch must exist
    git rev-parse --verify "$branch_name" &>/dev/null || return 1

    local count
    count=$(git rev-list --count "${base_branch}..${branch_name}" 2>/dev/null) || return 1
    [[ "$count" -gt 0 ]]
}

# Run required validation commands inside a worktree directory.
# Returns 0 if all required validations pass (or none configured), 1 otherwise.
_parallel_validate_worktree() {
    local story="$1"
    local worktree_dir="$2"

    local validation_json
    validation_json=$(config_get_json '.validation.commands') 2>/dev/null || true

    # No validation commands configured — accept tentative success as-is
    if [[ -z "$validation_json" || "$validation_json" == "null" || "$validation_json" == "[]" ]]; then
        return 0
    fi

    local cmd_count
    cmd_count=$(echo "$validation_json" | jq 'length' 2>/dev/null) || return 0
    [[ "$cmd_count" -eq 0 ]] && return 0

    log_debug "Validating tentative story $story ($cmd_count commands)"

    local i=0
    while [[ $i -lt $cmd_count ]]; do
        local name cmd required
        name=$(echo "$validation_json" | jq -r ".[$i].name // \"check\"" 2>/dev/null)
        cmd=$(echo "$validation_json" | jq -r ".[$i].cmd // empty" 2>/dev/null)
        required=$(echo "$validation_json" | jq -r ".[$i].required // \"true\"" 2>/dev/null)

        i=$((i + 1))
        [[ -z "$cmd" ]] && continue
        [[ "$required" != "true" ]] && continue

        # Run validation with a 60-second timeout inside the worktree
        local timeout_cmd
        timeout_cmd=$(prereqs_timeout_cmd)
        if ! ( cd "$worktree_dir" && $timeout_cmd 60 bash -c "$cmd" ) &>/dev/null; then
            log_warn "Story $story: validation '$name' failed ($cmd)"
            return 1
        fi
    done

    return 0
}

# Run the pre_worktree hook for a freshly created worktree.
# On failure: removes worktree + branch, returns 1.
_parallel_setup_worktree() {
    local story="$1"
    local worktree_dir="$2"
    local branch_name="$3"
    local project_dir
    project_dir=$(pwd)

    if ! hooks_run_strict "pre_worktree" \
        "RALPH_STORY=$story" \
        "RALPH_WORKTREE=$worktree_dir" \
        "RALPH_BRANCH=$branch_name" \
        "RALPH_PROJECT_DIR=$project_dir"; then

        log_error "pre_worktree hook failed for story $story — skipping"
        git worktree unlock "$worktree_dir" 2>/dev/null || true
        git worktree remove "$worktree_dir" --force 2>/dev/null || true
        rm -rf "$worktree_dir" 2>/dev/null || true
        git branch -D "$branch_name" 2>/dev/null || true
        return 1
    fi
}

# Main parallel execution entry point
parallel_run() {
    prereqs_require_bash4 || return 1

    # Source shared runner (for _run_sequential fallback)
    if ! type _run_sequential &>/dev/null; then
        source "${RALPH_DIR}/lib/runner.sh"
    fi

    local timeout_secs="$1"
    local verbose="$2"
    local dry_run="$3"

    # Capture baseline for end-of-run summary
    _RALPH_RUN_START_COMMIT=$(git rev-parse HEAD 2>/dev/null) || true
    _RALPH_RUN_START_TIME=$(date '+%s')

    local max_concurrent
    max_concurrent=$(config_get '.parallel.max_concurrent' '8')
    local stagger_seconds
    stagger_seconds=$(config_get '.parallel.stagger_seconds' '3')
    local auto_merge
    auto_merge=$(config_get '.parallel.auto_merge' 'true')

    local total_stories remaining_stories
    total_stories=$(stories_count_total)
    remaining_stories=$(stories_count_remaining)
    if [[ "$total_stories" -eq 0 ]]; then
        log_error "No stories found in stories.txt"
        return 1
    fi
    if [[ "$remaining_stories" -eq 0 ]]; then
        log_success "All $total_stories stories already complete"
        return 0
    fi

    log_info "Parallel mode: max_concurrent=$max_concurrent, stagger=${stagger_seconds}s"
    log_info "Stories: $remaining_stories remaining of $total_stories total"

    # Set parallel context flag so _run_sequential suppresses its chrome
    _RALPH_PARALLEL_CONTEXT=true

    RALPH_START_TIME=$(date '+%s')

    # Dashboard: set worker max and initial story count
    if type display_update_workers &>/dev/null; then
        display_update_workers 0 "$max_concurrent"
        local done_count
        done_count=$(stories_count_completed)
        display_update_stories "$total_stories" "$done_count"
        display_update_retry 0 "$(config_get '.loop.max_retries' '3')"
    fi

    # Run any unbatched stories (no [batch:N] annotation) sequentially first
    local _unbatched=()
    while IFS= read -r sid; do
        [[ -z "$sid" ]] && continue
        state_is_completed "$sid" || _unbatched+=("$sid")
    done < <(stories_get_unbatched)

    if [[ ${#_unbatched[@]} -gt 0 ]]; then
        phase_header "Unbatched Stories (sequential)"
        log_info "Running ${#_unbatched[@]} unbatched foundation stories sequentially"
        for story in "${_unbatched[@]}"; do
            local title
            title=$(stories_get_title "$story" 2>/dev/null || echo "")
            log_info "  $story | $title"
        done
        for story in "${_unbatched[@]}"; do
            if [[ "$dry_run" == true ]]; then
                echo "[DRY RUN] Unbatched story: $story"
            else
                _run_sequential "1" "$timeout_secs" "$verbose" false "$story" ""
            fi
        done
    fi

    # Discover all batch numbers from stories.txt
    local all_batches=()
    while IFS= read -r b; do
        [[ -n "$b" ]] && all_batches+=("$b")
    done < <(stories_get_all_batches)

    for current_batch in "${all_batches[@]}"; do
        local batch_stories=()
        while IFS= read -r story_id; do
            [[ -z "$story_id" ]] && continue
            state_is_completed "$story_id" || batch_stories+=("$story_id")
        done < <(stories_get_batch_members "$current_batch")

        # All stories in this batch completed — skip
        [[ ${#batch_stories[@]} -eq 0 ]] && continue

        # Batch 0 = sequential foundation — always run one at a time
        if [[ "$current_batch" == "0" ]]; then
            phase_header "Batch 0: Foundation (sequential)"
            log_info "Batch 0: running ${#batch_stories[@]} stories sequentially (foundation)"
            for story in "${batch_stories[@]}"; do
                local title
                title=$(stories_get_title "$story" 2>/dev/null || echo "")
                log_info "  $story | $title"
            done
            for story in "${batch_stories[@]}"; do
                if [[ "$dry_run" == true ]]; then
                    echo "[DRY RUN] Batch 0 story: $story"
                else
                    _run_sequential "1" "$timeout_secs" "$verbose" false "$story" ""
                fi
            done
            continue
        fi

        phase_header "Batch $current_batch: Parallel Execution"
        log_info "Batch $current_batch: ${#batch_stories[@]} stories"
        for story in "${batch_stories[@]}"; do
            local title
            title=$(stories_get_title "$story" 2>/dev/null || echo "")
            log_info "  $story | $title"
        done

        if [[ "$dry_run" == true ]]; then
            echo "[DRY RUN] Batch $current_batch would execute:"
            for story in "${batch_stories[@]}"; do
                echo "  - Story $story"
            done
            continue
        fi

        # Single story in batch — run in-place (no worktree needed)
        if [[ ${#batch_stories[@]} -eq 1 ]]; then
            local title
            title=$(stories_get_title "${batch_stories[0]}" 2>/dev/null || echo "")
            log_info "Single story in batch, running in-place: ${batch_stories[0]} | $title"
            _run_sequential "1" "$timeout_secs" "$verbose" false "${batch_stories[0]}" ""
            continue
        fi

        # Multiple stories — use worktrees
        _parallel_execute_batch "${batch_stories[@]}" \
            "$timeout_secs" "$verbose" "$max_concurrent" "$stagger_seconds"

        # Retry failed stories sequentially (up to max_retries)
        local max_retries
        max_retries=$(config_get '.loop.max_retries' '3')
        if [[ ${#_PARALLEL_FAILED[@]} -gt 0 && "$max_retries" -gt 0 ]]; then
            _parallel_retry_failed "$timeout_secs" "$verbose" "$max_retries"
        fi

        # Merge results
        if [[ "$auto_merge" == "true" ]]; then
            _parallel_merge_batch "${batch_stories[@]}"

            # Dashboard: refresh story count after merge
            if type display_update_stories &>/dev/null; then
                local done_count
                done_count=$(stories_count_completed)
                display_update_stories "$total_stories" "$done_count"
            fi
        else
            log_info "Auto-merge disabled. Worktrees left intact for manual review."
            # Mark successful stories as done — no merge phase, so persist state now
            for story in "${_PARALLEL_SUCCESSFUL[@]}"; do
                state_mark_done "$story"
                local spec_path
                spec_path=$(spec_find "$story") 2>/dev/null && spec_update_status "$spec_path" "done"
            done
            echo "Worktrees at: $RALPH_WORKTREE_DIR/"
            for story in "${batch_stories[@]}"; do
                echo "  - story-${story}/"
            done
            return 0
        fi
    done

    _run_summary "parallel"
}

# Execute a batch of stories in parallel via git worktrees
_parallel_execute_batch() {
    local stories=()
    local timeout_secs verbose max_concurrent stagger_seconds

    # Collect story IDs until we hit the first non-story argument
    while [[ $# -gt 4 ]]; do
        stories+=("$1")
        shift
    done
    timeout_secs="$1"
    verbose="$2"
    max_concurrent="$3"
    stagger_seconds="$4"

    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    mkdir -p "$RALPH_WORKTREE_DIR"
    # Resolve to absolute path — subshells cd into worktrees and need
    # absolute paths for output files and pid tracking
    RALPH_WORKTREE_DIR="$(cd "$RALPH_WORKTREE_DIR" && pwd)"

    # Remove stale git locks from previous crashes — a crashed Ralph can
    # leave index.lock or worktree locks that cause ALL subsequent git
    # worktree operations to hang until timeout
    rm -f .git/index.lock .git/HEAD.lock 2>/dev/null || true
    for lockfile in .git/worktrees/*/locked; do
        rm -f "$lockfile" 2>/dev/null || true
    done

    # Prune stale worktree records from previous failed runs
    git worktree prune 2>/dev/null || true

    # PID files in project-local directory (not /tmp) to avoid conflicts
    # between multiple Ralph instances
    _PARALLEL_PID_DIR="${RALPH_WORKTREE_DIR}/.pids-$$"
    local pid_dir="$_PARALLEL_PID_DIR"
    mkdir -p "$pid_dir"
    # Register cleanup via centralized trap registry
    ralph_on_exit _parallel_cleanup_pid_dir

    local pids=()
    local running=0

    for story in "${stories[@]}"; do
        # Respect max_concurrent — polling loop (Bash 3.2+ compatible, no wait -n)
        while [[ $(jobs -r | wc -l) -ge $max_concurrent ]]; do
            sleep 1
        done

        local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"
        local branch_name="ralph/story-${story}"

        log_info "Creating worktree: story-${story} (branch: $branch_name)"

        # Create worktree on a new branch from current HEAD
        local wt_timeout_cmd
        wt_timeout_cmd=$(prereqs_timeout_cmd)
        if ! $wt_timeout_cmd 30 git worktree add "$worktree_dir" -b "$branch_name" &>/dev/null; then
            # Stale worktree/branch from previous run — clean everything and retry
            log_debug "Cleaning stale worktree/branch for story $story"
            git worktree unlock "$worktree_dir" 2>/dev/null || true
            git worktree remove "$worktree_dir" --force 2>/dev/null || true
            rm -rf "$worktree_dir" 2>/dev/null || true
            git worktree prune 2>/dev/null || true
            git branch -D "$branch_name" 2>/dev/null || true
            if ! $wt_timeout_cmd 30 git worktree add "$worktree_dir" -b "$branch_name" &>/dev/null; then
                log_error "Failed to create worktree for story $story"
                _PARALLEL_FAILED+=("$story")
                continue
            fi
        fi

        # Run pre_worktree hook (setup: symlinks, deps, etc.)
        if ! _parallel_setup_worktree "$story" "$worktree_dir" "$branch_name"; then
            _PARALLEL_FAILED+=("$story")
            continue
        fi

        # Find spec and build prompt
        local spec_path
        spec_path=$(spec_find "$story") || {
            log_error "No spec found for story $story"
            _PARALLEL_FAILED+=("$story")
            continue
        }

        local prompt
        prompt=$(prompt_build "$story" "$spec_path") || {
            _PARALLEL_FAILED+=("$story")
            continue
        }

        # Build claude command
        local claude_flags=()
        while IFS= read -r flag; do
            [[ -n "$flag" ]] && claude_flags+=("$flag")
        done < <(config_get_claude_flags)

        local timeout_cmd
        timeout_cmd=$(prereqs_timeout_cmd)

        # Spawn Claude in the worktree directory (output_file must be absolute
        # because the subshell cd's into the worktree)
        local output_file="${RALPH_WORKTREE_DIR}/output-${story}.txt"

        # Compute effective timeout (reserves time for postmortem if enabled)
        local effective_timeout
        effective_timeout=$(_compute_effective_timeout "$timeout_secs")

        # Record start time for duration calculation
        _PARALLEL_STORY_START["$story"]=$(date '+%s')

        (
            cd "$worktree_dir"
            $timeout_cmd "$effective_timeout" claude "${claude_flags[@]}" "$prompt" \
                < /dev/null 2>&1 | cat > "$output_file"
        ) &

        local pid=$!
        pids+=("$pid")
        # Store pid-to-story mapping in project-local directory
        echo "$story" > "${pid_dir}/pid_${pid}"

        running=$((running + 1))

        # Dashboard: update active worker count
        if type display_update_workers &>/dev/null; then
            display_update_workers "$running" "$max_concurrent"
        fi

        log_info "Spawned Claude for story $story (PID $pid)"

        # Stagger to avoid API burst
        if [[ $stagger_seconds -gt 0 && $running -lt ${#stories[@]} ]]; then
            sleep "$stagger_seconds"
        fi
    done

    # Wait for all to complete, collecting exit codes
    log_info "Waiting for ${#pids[@]} parallel Claude instances..."

    declare -A _pid_exit_codes
    for pid in "${pids[@]}"; do
        local ec=0
        wait "$pid" || ec=$?
        _pid_exit_codes["$pid"]=$ec
    done

    local successful=()
    local failed=()

    for pid in "${pids[@]}"; do
        local exit_code="${_pid_exit_codes[$pid]:-0}"

        local story
        story=$(cat "${pid_dir}/pid_${pid}" 2>/dev/null)
        rm -f "${pid_dir}/pid_${pid}"

        # Record per-story duration
        local story_end
        story_end=$(date '+%s')
        if [[ -n "${_PARALLEL_STORY_START[$story]:-}" ]]; then
            _STORY_TIMINGS["$story"]=$(( story_end - _PARALLEL_STORY_START[$story] ))
        fi

        local output_file="${RALPH_WORKTREE_DIR}/output-${story}.txt"
        local raw_output=""
        [[ -f "$output_file" ]] && raw_output=$(cat "$output_file")
        local result
        result=$(_extract_metrics "$raw_output" "$story")

        # Classify result
        local classified=false

        if [[ $exit_code -eq 0 ]]; then
            # Check for DONE signal
            local done_id
            if done_id=$(signals_parse_done "$result") && [[ "$done_id" == "$story" ]]; then
                log_success "Story $story: completed"
                successful+=("$story")
                _STORY_OUTCOMES["$story"]="done"
                classified=true

                # Progress.txt parity with sequential runner
                local title timestamp
                title=$(stories_get_title "$story" 2>/dev/null || echo "unknown")
                timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
                echo "[DONE] Story $story - $title - $timestamp" >> progress.txt 2>/dev/null || true
            fi
        fi

        if [[ "$classified" == false ]]; then
            # No DONE signal (timeout, error, or missing signal)
            # Commit-based fallback: if the branch has new commits, validate before accepting
            if _parallel_has_new_commits "$story" "$current_branch"; then
                local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"

                # Run required validation commands in the worktree to catch
                # incomplete/broken code before merging into main
                if _parallel_validate_worktree "$story" "$worktree_dir"; then
                    log_warn "Story $story: no DONE signal but branch has commits and passes validation — tentative success"
                    successful+=("$story")
                    _STORY_OUTCOMES["$story"]="tentative"

                    local title timestamp
                    title=$(stories_get_title "$story" 2>/dev/null || echo "unknown")
                    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
                    echo "[DONE] Story $story - $title - $timestamp (tentative: commits detected, validated)" >> progress.txt 2>/dev/null || true
                else
                    log_warn "Story $story: has commits but failed validation — treating as failed"
                    failed+=("$story")
                    _STORY_OUTCOMES["$story"]="failed"

                    local title timestamp
                    title=$(stories_get_title "$story" 2>/dev/null || echo "unknown")
                    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
                    echo "[FAIL] Story $story - $title - validation_failed - $timestamp" >> progress.txt 2>/dev/null || true
                fi
            else
                if [[ $exit_code -eq 124 ]]; then
                    log_warn "Story $story: timed out (no commits)"
                    # Run postmortem for timed-out stories
                    local spec_path_pm
                    spec_path_pm=$(spec_find "$story" 2>/dev/null) || true
                    if [[ -n "$spec_path_pm" ]]; then
                        _run_timeout_postmortem "$story" "$spec_path_pm" "$result" "$timeout_secs" || true
                    fi
                elif [[ $exit_code -ne 0 ]]; then
                    log_warn "Story $story: failed exit code $exit_code (no commits)"
                else
                    log_warn "Story $story: no DONE signal (no commits)"
                fi
                failed+=("$story")
                _STORY_OUTCOMES["$story"]="failed"

                local title timestamp
                title=$(stories_get_title "$story" 2>/dev/null || echo "unknown")
                timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
                local reason="exit_code=$exit_code"
                [[ $exit_code -eq 124 ]] && reason="timeout"
                echo "[FAIL] Story $story - $title - $reason - $timestamp" >> progress.txt 2>/dev/null || true
            fi
        fi

        # Extract learnings regardless of completion status.
        # Include raw JSON output because LEARN tags may be emitted in
        # streamed events outside the final result field.
        local learnings_input="$result"
        if [[ -n "$raw_output" && "$raw_output" != "$result" ]]; then
            learnings_input="${raw_output}"$'\n'"${result}"
        fi
        if type learnings_extract &>/dev/null && [[ -n "$learnings_input" ]]; then
            learnings_extract "$learnings_input" "$story"
        fi

        # Dashboard: update last-done story and learnings count
        if type display_update_last_done &>/dev/null; then
            display_update_last_done "$story"
            display_update_learnings "$(_display_count_learnings 2>/dev/null || echo 0)"
        fi
    done

    echo ""
    if type display_batch_results &>/dev/null; then
        display_batch_results "${#successful[@]}" "${#failed[@]}"
    else
        log_info "Batch results: ${#successful[@]} succeeded, ${#failed[@]} failed"
    fi
    [[ ${#failed[@]} -gt 0 ]] && log_warn "Failed stories: ${failed[*]}"

    # Store results in module-scope arrays for merge step
    _PARALLEL_SUCCESSFUL=("${successful[@]}")
    _PARALLEL_FAILED+=("${failed[@]}")
}

# Retry failed stories from a batch sequentially.
# Re-uses worktree infrastructure: cleans up the failed worktree, creates a
# fresh one, runs Claude again. On success, moves the story from
# _PARALLEL_FAILED to _PARALLEL_SUCCESSFUL so the merge phase picks it up.
_parallel_retry_failed() {
    local timeout_secs="$1"
    local verbose="$2"
    local max_retries="$3"

    local to_retry=("${_PARALLEL_FAILED[@]}")
    [[ ${#to_retry[@]} -eq 0 ]] && return 0

    phase_header "Retry Phase"
    log_info "Retrying ${#to_retry[@]} failed stories sequentially (up to $max_retries attempts each)"

    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    local timeout_cmd wt_timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)
    wt_timeout_cmd=$(prereqs_timeout_cmd)

    for story in "${to_retry[@]}"; do
        local attempt=1
        local recovered=false

        while [[ $attempt -le $max_retries ]]; do
            log_info "Retry $attempt/$max_retries for story $story"

            # Clean up previous worktree/branch
            local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"
            local branch_name="ralph/story-${story}"
            git worktree unlock "$worktree_dir" 2>/dev/null || true
            git worktree remove "$worktree_dir" --force 2>/dev/null || true
            rm -rf "$worktree_dir" 2>/dev/null || true
            git worktree prune 2>/dev/null || true
            git branch -D "$branch_name" 2>/dev/null || true

            # Create fresh worktree
            log_info "Creating worktree: story-${story} (branch: $branch_name)"
            if ! $wt_timeout_cmd 30 git worktree add "$worktree_dir" -b "$branch_name" &>/dev/null; then
                log_error "Could not create worktree for retry of story $story"
                attempt=$((attempt + 1))
                continue
            fi

            # Run pre_worktree hook for retry worktree
            if ! _parallel_setup_worktree "$story" "$worktree_dir" "$branch_name"; then
                attempt=$((attempt + 1))
                continue
            fi

            # Build prompt
            local spec_path
            spec_path=$(spec_find "$story") || {
                log_error "No spec found for story $story on retry"
                break
            }
            local prompt
            prompt=$(prompt_build "$story" "$spec_path") || {
                log_error "Could not build prompt for story $story on retry"
                break
            }

            local claude_flags=()
            while IFS= read -r flag; do
                [[ -n "$flag" ]] && claude_flags+=("$flag")
            done < <(config_get_claude_flags)

            local output_file="${RALPH_WORKTREE_DIR}/output-${story}.txt"
            _PARALLEL_STORY_START["$story"]=$(date '+%s')

            # Compute effective timeout for retry
            local effective_timeout
            effective_timeout=$(_compute_effective_timeout "$timeout_secs")

            # Run synchronously (sequential retry)
            local exit_code=0
            (
                cd "$worktree_dir"
                $timeout_cmd "$effective_timeout" claude "${claude_flags[@]}" "$prompt" \
                    < /dev/null 2>&1 | cat > "$output_file"
            ) || exit_code=$?

            # Record duration
            local story_end
            story_end=$(date '+%s')
            if [[ -n "${_PARALLEL_STORY_START[$story]:-}" ]]; then
                _STORY_TIMINGS["$story"]=$(( story_end - _PARALLEL_STORY_START[$story] ))
            fi

            local raw_output=""
            [[ -f "$output_file" ]] && raw_output=$(cat "$output_file")
            local result
            result=$(_extract_metrics "$raw_output" "$story")

            # Extract learnings from this attempt before checking outcome.
            # Each retry overwrites the output file, so extract per-iteration.
            local learnings_input="$result"
            if [[ -n "$raw_output" && "$raw_output" != "$result" ]]; then
                learnings_input="${raw_output}"$'\n'"${result}"
            fi
            if type learnings_extract &>/dev/null && [[ -n "$learnings_input" ]]; then
                learnings_extract "$learnings_input" "$story" || true
            fi

            # Check for DONE signal
            local done_id
            if [[ $exit_code -eq 0 ]] && done_id=$(signals_parse_done "$result") && [[ "$done_id" == "$story" ]]; then
                log_success "Story $story: completed on retry $attempt"
                _STORY_OUTCOMES["$story"]="done"
                recovered=true

                local title timestamp
                title=$(stories_get_title "$story" 2>/dev/null || echo "unknown")
                timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
                echo "[DONE] Story $story - $title - $timestamp (retry $attempt)" >> progress.txt 2>/dev/null || true
                break
            fi

            # Commit fallback
            if _parallel_has_new_commits "$story" "$current_branch"; then
                log_warn "Story $story: tentative success on retry $attempt (commits but no DONE)"
                _STORY_OUTCOMES["$story"]="tentative"
                recovered=true
                break
            fi

            log_warn "Story $story: retry $attempt failed"
            attempt=$((attempt + 1))
        done

        if [[ "$recovered" == true ]]; then
            # Move from failed to successful
            local new_failed=()
            for s in "${_PARALLEL_FAILED[@]}"; do
                [[ "$s" != "$story" ]] && new_failed+=("$s")
            done
            _PARALLEL_FAILED=("${new_failed[@]}")
            _PARALLEL_SUCCESSFUL+=("$story")
        else
            log_error "Story $story: exhausted $max_retries retries"

            # Attempt automatic decomposition before giving up
            if type decompose_story &>/dev/null; then
                local decomp_enabled
                decomp_enabled=$(config_get '.decomposition.enabled' 'true')
                if [[ "$decomp_enabled" == "true" ]]; then
                    local spec_path_decomp
                    spec_path_decomp=$(spec_find "$story" 2>/dev/null) || true
                    if [[ -n "$spec_path_decomp" ]]; then
                        log_info "Attempting decomposition of exhausted story $story"
                        if decompose_story "$story" "$spec_path_decomp" "exhausted retries"; then
                            log_success "Story $story decomposed — sub-stories queued for next batch"
                            # Remove from failed list (parent is now "completed" via decomposition)
                            local new_failed=()
                            for s in "${_PARALLEL_FAILED[@]}"; do
                                [[ "$s" != "$story" ]] && new_failed+=("$s")
                            done
                            _PARALLEL_FAILED=("${new_failed[@]}")
                        fi
                    fi
                fi
            fi

            # Clean up worktree so it doesn't block next batch
            local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"
            local branch_name="ralph/story-${story}"
            git worktree unlock "$worktree_dir" 2>/dev/null || true
            git worktree remove "$worktree_dir" --force 2>/dev/null || true
            rm -rf "$worktree_dir" 2>/dev/null || true
            git branch -D "$branch_name" 2>/dev/null || true
        fi

    done

    git worktree prune 2>/dev/null || true
}

# Merge successful worktree branches back to main
_parallel_merge_batch() {
    local stories=("$@")
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    local merge_failures=()

    if [[ ${#_PARALLEL_SUCCESSFUL[@]} -gt 0 ]]; then
        phase_header "Merge Phase"

        # Sort by story ID for deterministic merge order. Without this,
        # merge order depends on worker completion order, which means
        # different runs of the same batch can produce different conflict
        # patterns. Sorting by ID matches the stories.txt queue order.
        local sorted_successful=()
        while IFS= read -r sid; do
            sorted_successful+=("$sid")
        done < <(printf '%s\n' "${_PARALLEL_SUCCESSFUL[@]}" | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n)

        log_info "Merging ${#sorted_successful[@]} branches (sorted by story ID)..."

        for story in "${sorted_successful[@]}"; do
            local branch_name="ralph/story-${story}"

            log_debug "Merging $branch_name into $current_branch"

            if git merge --no-ff "$branch_name" -m "merge: story ${story}" 2>/dev/null; then
                log_success "Merged story $story"
                state_mark_done "$story"
                local spec_path
                spec_path=$(spec_find "$story") 2>/dev/null && spec_update_status "$spec_path" "done"
            else
                log_warn "Merge conflict on story $story"

                # Attempt conflict resolution via Claude agent
                if _parallel_resolve_conflict "$story" "$branch_name"; then
                    # Resolution succeeded — story is merged
                    state_mark_done "$story"
                    local spec_path
                    spec_path=$(spec_find "$story") 2>/dev/null && spec_update_status "$spec_path" "done"
                else
                    log_error "Could not resolve merge conflict for story $story"
                    merge_failures+=("$story")
                    _STORY_OUTCOMES["$story"]="failed"
                fi
            fi
        done
    else
        log_warn "No successful stories to merge"
    fi

    # Cleanup ALWAYS runs — even when all stories failed, worktrees must be
    # removed so the next batch can create fresh ones without conflicts.

    # Cleanup successful worktrees and branches
    for story in "${_PARALLEL_SUCCESSFUL[@]}"; do
        local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"
        local branch_name="ralph/story-${story}"

        # Always remove worktree (frees disk space)
        git worktree unlock "$worktree_dir" 2>/dev/null || true
        if [[ -d "$worktree_dir" ]]; then
            git worktree remove "$worktree_dir" --force 2>/dev/null || rm -rf "$worktree_dir"
        fi

        # Preserve branch if merge failed — user needs it to recover code
        local is_merge_failure=false
        for mf in "${merge_failures[@]+"${merge_failures[@]}"}"; do
            [[ "$mf" == "$story" ]] && is_merge_failure=true && break
        done
        if [[ "$is_merge_failure" == true ]]; then
            log_warn "Branch $branch_name preserved (merge failed — code lives there)"
        else
            git branch -d "$branch_name" 2>/dev/null || true
        fi
    done

    # Cleanup failed worktrees and branches so retries aren't blocked
    for story in "${_PARALLEL_FAILED[@]}"; do
        local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"
        local branch_name="ralph/story-${story}"
        git worktree unlock "$worktree_dir" 2>/dev/null || true
        if [[ -d "$worktree_dir" ]]; then
            git worktree remove "$worktree_dir" --force 2>/dev/null || rm -rf "$worktree_dir"
        fi
        git branch -D "$branch_name" 2>/dev/null || true
    done
    git worktree prune 2>/dev/null || true

    # Remove worktree dir if empty
    rmdir "$RALPH_WORKTREE_DIR" 2>/dev/null || true
}

# Save diagnostics when a merge conflict resolution fails
_parallel_save_merge_diagnostics() {
    local story="$1" branch_name="$2" exit_code="$3" conflict_files="$4" agent_output="$5"
    mkdir -p ".ralph/logs"
    {
        echo "=== Merge Conflict Resolution Failed ==="
        echo "Story: $story"
        echo "Branch: $branch_name"
        echo "Exit code: $exit_code"
        echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        echo "Conflict files: $conflict_files"
        echo ""
        echo "=== Agent Output ==="
        echo "$agent_output"
    } > ".ralph/logs/merge-conflict-${story}.log"
    log_warn "Merge conflict details saved to .ralph/logs/merge-conflict-${story}.log"
}

# Resolve merge conflicts using a dedicated Claude invocation
_parallel_resolve_conflict() {
    local story="$1"
    local branch_name="$2"

    local merge_timeout
    merge_timeout=$(config_get '.parallel.merge_review_timeout' '900')

    log_info "Spawning conflict resolution agent for story $story"

    # Get conflict details
    local conflict_files
    conflict_files=$(git diff --name-only --diff-filter=U 2>/dev/null)

    if [[ -z "$conflict_files" ]]; then
        log_debug "No conflict markers found (merge may have auto-resolved)"
        return 0
    fi

    # Build merge resolution prompt
    local template
    template=$(prompt_load_template "merge-review") || {
        log_warn "No merge-review template found. Aborting merge."
        git merge --abort 2>/dev/null || true
        return 1
    }

    # Truncate diff to 500 lines and 30000 chars to stay within prompt limits
    local conflict_diff
    conflict_diff=$(git diff 2>/dev/null | head -500 | head -c 30000)

    template=$(prompt_substitute "$template" \
        "STORY_ID=$story" \
        "BRANCH_NAME=$branch_name" \
        "CONFLICT_FILES=$conflict_files" \
        "CONFLICT_DIFF=$conflict_diff"
    )

    # Build claude command
    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local result exit_code=0
    result=$($timeout_cmd "$merge_timeout" claude "${claude_flags[@]}" "$template" 2>&1) || exit_code=$?

    # Extract learnings from merge resolution output
    if type learnings_extract &>/dev/null && [[ -n "$result" ]]; then
        learnings_extract "$result" "$story" || true
    fi

    if [[ $exit_code -ne 0 ]]; then
        log_error "Conflict resolution agent failed for story $story (exit $exit_code)"
        _parallel_save_merge_diagnostics "$story" "$branch_name" "$exit_code" "$conflict_files" "$result"
        git merge --abort 2>/dev/null || true
        return 1
    fi

    # Check for success signal
    local merge_result
    if merge_result=$(signals_parse_merge_done "$result"); then
        log_success "Merge resolved: $merge_result"
        return 0
    elif merge_result=$(signals_parse_merge_fail "$result"); then
        log_error "Merge resolution failed: $merge_result"
        _parallel_save_merge_diagnostics "$story" "$branch_name" "0" "$conflict_files" "$result"
        git merge --abort 2>/dev/null || true
        return 1
    else
        log_warn "No merge signal from resolution agent"
        _parallel_save_merge_diagnostics "$story" "$branch_name" "0" "$conflict_files" "$result"
        git merge --abort 2>/dev/null || true
        return 1
    fi
}
