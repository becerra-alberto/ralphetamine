#!/usr/bin/env bats
# Tier 3 — Component tests for reconcile.sh (ralph_reconcile)
# Requires real git operations for branch detection and merging.

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project

    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "reconcile"

    config_load
    state_init

    touch progress.txt
}

# Helper: set up a base file that both branches will modify
_setup_conflict_base_reconcile() {
    echo "original line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "base: add shared-file.txt"
    _CONFLICT_BASE_COMMIT_R=$(git rev-parse HEAD)
}

# Helper: create a story branch from base that modifies shared-file.txt
_create_conflicting_branch_reconcile() {
    local story="$1"
    local branch_name="ralph/story-${story}"
    git checkout -b "$branch_name" "$_CONFLICT_BASE_COMMIT_R" 2>/dev/null
    echo "conflict line from story $story" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "feat: story $story (conflicts)"
    git checkout - 2>/dev/null
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

# Helper: create a story branch with unmerged commits
_create_story_branch() {
    local story="$1"
    local branch="ralph/story-${story}"
    git checkout -b "$branch" 2>/dev/null
    echo "work for story $story" > "story-${story}-work.txt"
    git add "story-${story}-work.txt"
    git commit -q -m "feat: story $story implementation"
    git checkout - 2>/dev/null
}

@test "Discovers orphaned ralph/story-* branches with unmerged commits" {
    _create_story_branch "2.1"
    _create_story_branch "2.2"

    run ralph_reconcile
    assert_success
    assert_output --partial "ralph/story-2.1"
    assert_output --partial "ralph/story-2.2"
    assert_output --partial "unmerged"
}

@test "Skips branches for already-completed stories" {
    # Mark 2.1 as completed in state
    state_mark_done "2.1"

    _create_story_branch "2.1"
    _create_story_branch "2.2"

    run ralph_reconcile
    assert_success
    # 2.1 should be skipped (already completed)
    refute_output --partial "Branch:  ralph/story-2.1"
    # 2.2 should be found
    assert_output --partial "Branch:  ralph/story-2.2"
}

@test "Skips branches with zero unmerged commits" {
    # Create and merge a branch so it has zero unmerged commits
    git checkout -b "ralph/story-2.1" 2>/dev/null
    echo "work" > "story-2.1-work.txt"
    git add "story-2.1-work.txt"
    git commit -q -m "feat: story 2.1"
    git checkout - 2>/dev/null
    git merge --no-ff "ralph/story-2.1" -m "merge 2.1" 2>/dev/null

    run ralph_reconcile
    assert_success
    # Should not find 2.1 as orphaned (it has zero unmerged commits)
    refute_output --partial "Branch:  ralph/story-2.1"
}

@test "Dry-run lists but does not merge or change state" {
    _create_story_branch "2.1"

    run ralph_reconcile
    assert_success
    assert_output --partial "Dry run"

    # State should not be updated
    run state_is_completed "2.1"
    assert_failure

    # No merge commits in git log
    local merge_count
    merge_count=$(git log --oneline --merges | grep -c "reconcile" || true)
    [ "$merge_count" -eq 0 ]
}

@test "--apply merges, updates state and spec, deletes branch" {
    _create_story_branch "2.1"

    ralph_reconcile --apply

    # Story should be completed and merged in state
    state_is_completed "2.1"
    local merged
    merged=$(state_get_merged)
    echo "$merged" | grep -q "^2.1$"

    # Branch should be deleted
    ! git rev-parse --verify "ralph/story-2.1" &>/dev/null || {
        echo "Branch ralph/story-2.1 should have been deleted" >&2
        return 1
    }

    # Progress.txt should have reconcile entry
    assert_file_contains "progress.txt" "[RECONCILED]"
    assert_file_contains "progress.txt" "2.1"
}

@test "--apply with conflict aborts gracefully" {
    # Use the same pattern as parallel-merge.bats for conflict setup
    _setup_conflict_base_reconcile
    echo "main modified line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "main: modify shared file"
    _create_conflicting_branch_reconcile "2.1"

    run ralph_reconcile --apply
    assert_success

    # Story should NOT be completed (merge failed)
    run state_is_completed "2.1"
    assert_failure

    # Branch should still exist (preserved)
    run git rev-parse --verify "ralph/story-2.1"
    assert_success
}
