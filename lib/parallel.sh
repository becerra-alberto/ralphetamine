#!/usr/bin/env bash
# Ralph v2 — Git worktree parallelization and merge orchestration
# Requires Bash 4.0+ (gated at entry via prereqs_require_bash4)

RALPH_WORKTREE_DIR=".ralph/worktrees"

# Module-scope arrays for batch results (not declared inside functions)
_PARALLEL_SUCCESSFUL=()
_PARALLEL_FAILED=()

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

    local max_concurrent
    max_concurrent=$(config_get '.parallel.max_concurrent' '8')
    local stagger_seconds
    stagger_seconds=$(config_get '.parallel.stagger_seconds' '3')
    local auto_merge
    auto_merge=$(config_get '.parallel.auto_merge' 'true')

    log_info "Parallel mode: max_concurrent=$max_concurrent, stagger=${stagger_seconds}s"

    # Dashboard: set worker max for parallel mode
    if type display_update_workers &>/dev/null; then
        display_update_workers 0 "$max_concurrent"
    fi

    # Run any unbatched stories (no [batch:N] annotation) sequentially first
    local _unbatched=()
    while IFS= read -r sid; do
        [[ -z "$sid" ]] && continue
        state_is_completed "$sid" || _unbatched+=("$sid")
    done < <(stories_get_unbatched)

    if [[ ${#_unbatched[@]} -gt 0 ]]; then
        log_info "Running ${#_unbatched[@]} unbatched foundation stories sequentially"
        for story in "${_unbatched[@]}"; do
            if [[ "$dry_run" == true ]]; then
                echo "[DRY RUN] Unbatched story: $story"
            else
                _run_sequential "1" "$timeout_secs" "$verbose" false "$story" ""
            fi
        done
    fi

    # Find which batches exist and need execution
    local current_batch=0
    while true; do
        local batch_stories=()
        while IFS= read -r story_id; do
            [[ -z "$story_id" ]] && continue
            state_is_completed "$story_id" || batch_stories+=("$story_id")
        done < <(stories_get_batch_members "$current_batch")

        # No stories in this batch — try next, or we're done
        if [[ ${#batch_stories[@]} -eq 0 ]]; then
            local next_batch=$((current_batch + 1))
            local next_members
            next_members=$(stories_get_batch_members "$next_batch" | head -1) || true
            if [[ -z "$next_members" ]]; then
                break
            fi
            current_batch=$next_batch
            continue
        fi

        # Batch 0 = sequential foundation — always run one at a time
        if [[ "$current_batch" -eq 0 ]]; then
            log_info "Batch 0: running ${#batch_stories[@]} stories sequentially (foundation)"
            for story in "${batch_stories[@]}"; do
                if [[ "$dry_run" == true ]]; then
                    echo "[DRY RUN] Batch 0 story: $story"
                else
                    _run_sequential "1" "$timeout_secs" "$verbose" false "$story" ""
                fi
            done
            current_batch=$((current_batch + 1))
            continue
        fi

        log_info "Batch $current_batch: ${#batch_stories[@]} stories"

        if [[ "$dry_run" == true ]]; then
            echo "[DRY RUN] Batch $current_batch would execute:"
            for story in "${batch_stories[@]}"; do
                echo "  - Story $story"
            done
            current_batch=$((current_batch + 1))
            continue
        fi

        # Single story in batch — run in-place (no worktree needed)
        if [[ ${#batch_stories[@]} -eq 1 ]]; then
            log_info "Single story in batch, running in-place"
            _run_sequential "1" "$timeout_secs" "$verbose" false "${batch_stories[0]}" ""
            current_batch=$((current_batch + 1))
            continue
        fi

        # Multiple stories — use worktrees
        _parallel_execute_batch "${batch_stories[@]}" \
            "$timeout_secs" "$verbose" "$max_concurrent" "$stagger_seconds"

        # Merge results
        if [[ "$auto_merge" == "true" ]]; then
            _parallel_merge_batch "${batch_stories[@]}"
        else
            log_info "Auto-merge disabled. Worktrees left intact for manual review."
            echo "Worktrees at: $RALPH_WORKTREE_DIR/"
            for story in "${batch_stories[@]}"; do
                echo "  - story-${story}/"
            done
            return 0
        fi

        current_batch=$((current_batch + 1))
    done

    box_header "PARALLEL EXECUTION COMPLETE"
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
    local pid_dir="${RALPH_WORKTREE_DIR}/.pids-$$"
    mkdir -p "$pid_dir"
    # Register cleanup via centralized trap registry
    ralph_on_exit "rm -rf '$pid_dir'"

    local pids=()
    local running=0

    for story in "${stories[@]}"; do
        # Respect max_concurrent — polling loop (Bash 3.2+ compatible, no wait -n)
        while [[ $(jobs -r | wc -l) -ge $max_concurrent ]]; do
            sleep 1
        done

        local worktree_dir="${RALPH_WORKTREE_DIR}/story-${story}"
        local branch_name="ralph/story-${story}"

        log_info "Creating worktree: $worktree_dir (branch: $branch_name)"

        # Create worktree on a new branch from current HEAD
        local wt_timeout_cmd
        wt_timeout_cmd=$(prereqs_timeout_cmd)
        if ! $wt_timeout_cmd 30 git worktree add "$worktree_dir" -b "$branch_name" 2>/dev/null; then
            # Stale worktree/branch from previous run — clean everything and retry
            log_debug "Cleaning stale worktree/branch for story $story"
            git worktree unlock "$worktree_dir" 2>/dev/null || true
            git worktree remove "$worktree_dir" --force 2>/dev/null || true
            rm -rf "$worktree_dir" 2>/dev/null || true
            git worktree prune 2>/dev/null || true
            git branch -D "$branch_name" 2>/dev/null || true
            if ! $wt_timeout_cmd 30 git worktree add "$worktree_dir" -b "$branch_name" 2>/dev/null; then
                log_error "Failed to create worktree for story $story"
                _PARALLEL_FAILED+=("$story")
                continue
            fi
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
        (
            cd "$worktree_dir"
            $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
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
            display_refresh
        fi

        log_info "Spawned Claude for story $story (PID $pid)"

        # Stagger to avoid API burst
        if [[ $stagger_seconds -gt 0 && $running -lt ${#stories[@]} ]]; then
            sleep "$stagger_seconds"
        fi
    done

    # Start live dashboard timer so elapsed clock ticks while waiting
    if type display_start_live_timer &>/dev/null; then
        display_start_live_timer
    fi

    # Wait for all to complete
    log_info "Waiting for ${#pids[@]} parallel Claude instances..."

    local successful=()
    local failed=()

    for pid in "${pids[@]}"; do
        local exit_code=0
        wait "$pid" || exit_code=$?

        running=$((running - 1))
        # Dashboard: update active worker count
        if type display_update_workers &>/dev/null; then
            display_update_workers "$running" "$max_concurrent"
            display_refresh
        fi

        local story
        story=$(cat "${pid_dir}/pid_${pid}" 2>/dev/null)
        rm -f "${pid_dir}/pid_${pid}"

        local output_file="${RALPH_WORKTREE_DIR}/output-${story}.txt"
        local result=""
        [[ -f "$output_file" ]] && result=$(cat "$output_file")

        if [[ $exit_code -eq 124 ]]; then
            log_warn "Story $story: timed out"
            failed+=("$story")
        elif [[ $exit_code -ne 0 ]]; then
            log_warn "Story $story: failed (exit code $exit_code)"
            failed+=("$story")
        else
            # Check for DONE signal
            local done_id
            if done_id=$(signals_parse_done "$result") && [[ "$done_id" == "$story" ]]; then
                log_success "Story $story: completed"
                successful+=("$story")
                state_mark_done "$story"
            else
                log_warn "Story $story: no DONE signal"
                failed+=("$story")
            fi
        fi

        # Extract learnings regardless
        if type learnings_extract &>/dev/null && [[ -n "$result" ]]; then
            learnings_extract "$result" "$story"
        fi
    done

    echo ""
    log_info "Batch results: ${#successful[@]} succeeded, ${#failed[@]} failed"
    [[ ${#failed[@]} -gt 0 ]] && log_warn "Failed stories: ${failed[*]}"

    # Stop live dashboard timer
    if type display_stop_live_timer &>/dev/null; then
        display_stop_live_timer
    fi

    # Store results in module-scope arrays for merge step
    _PARALLEL_SUCCESSFUL=("${successful[@]}")
    _PARALLEL_FAILED+=("${failed[@]}")
}

# Merge successful worktree branches back to main
_parallel_merge_batch() {
    local stories=("$@")
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    if [[ ${#_PARALLEL_SUCCESSFUL[@]} -gt 0 ]]; then
        log_info "Merging ${#_PARALLEL_SUCCESSFUL[@]} branches..."

        local merge_failures=()

        for story in "${_PARALLEL_SUCCESSFUL[@]}"; do
            local branch_name="ralph/story-${story}"

            log_debug "Merging $branch_name into $current_branch"

            if git merge --no-ff "$branch_name" -m "merge: story ${story}" 2>/dev/null; then
                log_success "Merged story $story"
            else
                log_warn "Merge conflict on story $story"
                merge_failures+=("$story")

                # Attempt conflict resolution via Claude agent
                if ! _parallel_resolve_conflict "$story" "$branch_name"; then
                    log_error "Could not resolve merge conflict for story $story"
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

        git worktree unlock "$worktree_dir" 2>/dev/null || true
        if [[ -d "$worktree_dir" ]]; then
            git worktree remove "$worktree_dir" --force 2>/dev/null || rm -rf "$worktree_dir"
        fi
        git branch -d "$branch_name" 2>/dev/null || true
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

    if [[ $exit_code -ne 0 ]]; then
        log_error "Conflict resolution agent failed for story $story"
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
        git merge --abort 2>/dev/null || true
        return 1
    else
        log_warn "No merge signal from resolution agent"
        git merge --abort 2>/dev/null || true
        return 1
    fi
}
