#!/usr/bin/env bash
# Ralphetamine — Reconcile orphaned story branches
# Scans for ralph/story-* branches with unmerged commits not tracked in state.

# Main reconcile entry point.
# Dry-run by default; pass --apply to merge.
ralph_reconcile() {
    local apply=false
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --apply) apply=true; shift ;;
            *) log_error "Unknown reconcile option: $1"; return 1 ;;
        esac
    done

    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    local branches=()
    while IFS= read -r ref; do
        [[ -z "$ref" ]] && continue
        local branch="${ref#refs/heads/}"
        branches+=("$branch")
    done < <(git for-each-ref --format='%(refname)' refs/heads/ralph/story-*)

    if [[ ${#branches[@]} -eq 0 ]]; then
        log_info "No orphaned ralph/story-* branches found"
        return 0
    fi

    local orphaned=()

    box_header "RECONCILE: Scanning branches"

    for branch in "${branches[@]}"; do
        # Extract story ID from branch name: ralph/story-X.X -> X.X
        local story="${branch#ralph/story-}"

        # Skip if already tracked as completed
        if state_is_completed "$story"; then
            log_debug "Story $story already completed, skipping branch $branch"
            continue
        fi

        # Check for unmerged commits
        local commit_count
        commit_count=$(git rev-list --count "${current_branch}..${branch}" 2>/dev/null) || continue
        if [[ "$commit_count" -eq 0 ]]; then
            log_debug "Branch $branch has no unmerged commits"
            continue
        fi

        local last_commit
        last_commit=$(git log -1 --format='%h %s' "$branch" 2>/dev/null)

        orphaned+=("$story")

        echo "  Branch:  $branch"
        echo "  Story:   $story"
        echo "  Commits: $commit_count unmerged"
        echo "  Last:    $last_commit"

        # Check for merge conflicts
        if git merge --no-commit --no-ff "$branch" &>/dev/null; then
            echo "  Merge:   clean (no conflicts)"
            git merge --abort &>/dev/null || git reset --hard HEAD &>/dev/null || true
        else
            echo "  Merge:   CONFLICTS detected"
            git merge --abort &>/dev/null || git reset --hard HEAD &>/dev/null || true
        fi
        echo ""
    done

    if [[ ${#orphaned[@]} -eq 0 ]]; then
        log_info "No orphaned branches with unmerged work found"
        return 0
    fi

    log_info "Found ${#orphaned[@]} orphaned branches with unmerged work"

    if [[ "$apply" == false ]]; then
        echo ""
        echo "  Dry run — no changes made."
        echo "  Run 'ralph reconcile --apply' to merge these branches."
        return 0
    fi

    # Apply: merge each orphaned branch
    box_header "RECONCILE: Merging orphaned branches"

    local merged_count=0
    local conflict_count=0

    for story in "${orphaned[@]}"; do
        local branch="ralph/story-${story}"

        log_info "Merging $branch..."

        if git merge --no-ff "$branch" -m "reconcile: story ${story} (orphaned branch)" 2>/dev/null; then
            log_success "Merged story $story"

            # Update state
            state_mark_done "$story"
            state_mark_merged "$story"

            # Update spec frontmatter
            local spec_path
            if spec_path=$(spec_find "$story") 2>/dev/null; then
                spec_update_status "$spec_path" "done"
            fi

            # Progress.txt
            local title timestamp
            title=$(stories_get_title "$story" 2>/dev/null || echo "unknown")
            timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
            echo "[RECONCILED] Story $story - $title - $timestamp" >> progress.txt 2>/dev/null || true

            # Clean up the branch
            git branch -d "$branch" 2>/dev/null || true

            merged_count=$((merged_count + 1))
        else
            log_warn "Merge conflict on story $story — aborting this branch"
            git merge --abort 2>/dev/null || true
            conflict_count=$((conflict_count + 1))
        fi
    done

    echo ""
    log_info "Reconcile complete: $merged_count merged, $conflict_count conflicts (skipped)"
}
