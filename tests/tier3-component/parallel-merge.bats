#!/usr/bin/env bats
# Tier 3 — Component tests for _parallel_merge_batch
# Tests merge state consistency: state_mark_done only after merge,
# branch preservation on failure, and conflict diagnostics.

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
    source_ralph_lib "prompt"
    source_ralph_lib "signals"
    source_ralph_lib "hooks"
    source_ralph_lib "learnings"
    source_ralph_lib "testing"
    source_ralph_lib "runner"
    source_ralph_lib "parallel"

    config_load

    # Override prereqs_timeout_cmd for conflict resolution agent mock
    prereqs_timeout_cmd() { echo "_mock_timeout"; }
    _mock_timeout() { shift; "$@"; }
    prereqs_require_bash4() { return 0; }

    # Mock claude for conflict resolution (always fails — no merge signal)
    create_mock_command "claude" 'echo "no merge signal"'

    # Re-declare associative arrays at global scope (declare -A in sourced
    # files creates function-local scope inside setup)
    declare -gA _STORY_OUTCOMES=()
    declare -gA _STORY_TIMINGS=()

    # Set up RALPH_WORKTREE_DIR
    RALPH_WORKTREE_DIR="${TEST_WORK_DIR}/.ralph/worktrees"
    mkdir -p "$RALPH_WORKTREE_DIR"

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

# Helper: create a story branch with a commit that merges cleanly
_create_clean_branch() {
    local story="$1"
    local branch_name="ralph/story-${story}"
    git checkout -b "$branch_name" 2>/dev/null
    echo "story $story content" > "story-${story}.txt"
    git add "story-${story}.txt"
    git commit -q -m "feat: story $story"
    git checkout - 2>/dev/null
}

# Helper: set up a base file that both branches will modify (call once before conflicts)
# Sets _CONFLICT_BASE_COMMIT so _create_conflicting_branch can fork from here.
_setup_conflict_base() {
    echo "original line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "base: add shared-file.txt"
    _CONFLICT_BASE_COMMIT=$(git rev-parse HEAD)
}

# Helper: create a story branch that modifies shared-file.txt to conflict with main.
# Must call _setup_conflict_base first, then modify main, then call this.
# Branches from _CONFLICT_BASE_COMMIT (set by _setup_conflict_base).
_create_conflicting_branch() {
    local story="$1"
    local branch_name="ralph/story-${story}"
    git checkout -b "$branch_name" "$_CONFLICT_BASE_COMMIT" 2>/dev/null
    echo "conflict line from story $story" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "feat: story $story (conflicts)"
    git checkout - 2>/dev/null
}

@test "Merge success: state_mark_done called after merge" {
    _create_clean_branch "1.1"
    _PARALLEL_SUCCESSFUL=("1.1")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["1.1"]="done"

    _parallel_merge_batch "1.1"

    # Story should be marked done in state.json
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" == *"1.1"* ]]
}

@test "Merge failure: story NOT marked done in state.json" {
    # Set up base file, then diverge main and branch
    _setup_conflict_base
    echo "main modified line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "main: modify shared file"

    # Create conflicting branch from before main's modification
    _create_conflicting_branch "2.1"

    _PARALLEL_SUCCESSFUL=("2.1")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["2.1"]="done"

    _parallel_merge_batch "2.1"

    # Story should NOT be in completed_stories
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" != *"2.1"* ]]
}

@test "Merge failure: _STORY_OUTCOMES updated to failed" {
    _setup_conflict_base
    echo "main modified line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "main: modify shared file"

    _create_conflicting_branch "2.1"

    _PARALLEL_SUCCESSFUL=("2.1")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["2.1"]="done"

    _parallel_merge_batch "2.1"

    [[ "${_STORY_OUTCOMES["2.1"]}" == "failed" ]]
}

@test "Merge failure: branch preserved (not deleted)" {
    _setup_conflict_base
    echo "main modified line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "main: modify shared file"

    _create_conflicting_branch "2.1"

    _PARALLEL_SUCCESSFUL=("2.1")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["2.1"]="done"

    _parallel_merge_batch "2.1"

    # Branch should still exist
    git rev-parse --verify "ralph/story-2.1" &>/dev/null
}

@test "Merge failure: conflict diagnostics saved to .ralph/logs/" {
    _setup_conflict_base
    echo "main modified line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "main: modify shared file"

    _create_conflicting_branch "2.1"

    _PARALLEL_SUCCESSFUL=("2.1")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["2.1"]="done"

    _parallel_merge_batch "2.1"

    # Diagnostics log should exist
    [[ -f ".ralph/logs/merge-conflict-2.1.log" ]]
    assert_file_contains ".ralph/logs/merge-conflict-2.1.log" "Merge Conflict Resolution Failed"
    assert_file_contains ".ralph/logs/merge-conflict-2.1.log" "Story: 2.1"
}

@test "Mixed merge: clean story done, conflicting story preserved" {
    # Create a clean branch first
    _create_clean_branch "1.1"

    # Set up base file, then diverge main and 2.1
    _setup_conflict_base
    echo "main modified line" > shared-file.txt
    git add shared-file.txt
    git commit -q -m "main: modify shared file"

    # Create conflicting branch
    _create_conflicting_branch "2.1"

    _PARALLEL_SUCCESSFUL=("1.1" "2.1")
    _PARALLEL_FAILED=()
    _STORY_OUTCOMES["1.1"]="done"
    _STORY_OUTCOMES["2.1"]="done"

    _parallel_merge_batch "1.1" "2.1"

    # 1.1 should be done, branch deleted
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    [[ "$completed" == *"1.1"* ]]
    ! git rev-parse --verify "ralph/story-1.1" &>/dev/null || true

    # 2.1 should NOT be done, branch preserved
    [[ "$completed" != *"2.1"* ]]
    git rev-parse --verify "ralph/story-2.1" &>/dev/null
}

@test "Merge with empty _PARALLEL_SUCCESSFUL: no crash" {
    _PARALLEL_SUCCESSFUL=()
    _PARALLEL_FAILED=("1.1")

    run _parallel_merge_batch "1.1"
    assert_success
}
