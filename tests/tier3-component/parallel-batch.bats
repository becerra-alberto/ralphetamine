#!/usr/bin/env bats
# Tier 3 — Component tests for parallel batch logic
# Tests batch discovery, dry-run listing, single-story fallback,
# stories_get_batch_members integration, and depends_on validation.
# Does NOT spawn real git worktrees — focuses on the logic layer.

# Shell function mock for timeout — inherits PATH so 'claude' mock is found
_mock_timeout() {
    shift
    "$@"
}

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

    # Override prereqs_timeout_cmd to use our shell function
    prereqs_timeout_cmd() { echo "_mock_timeout"; }

    # Ensure prereqs_require_bash4 passes
    prereqs_require_bash4() { return 0; }

    # Mock claude for any fallback sequential runs
    create_mock_command "claude" 'echo "mock output"'

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "Batch discovery: stories_get_batch_members returns stories in batch 1" {
    run stories_get_batch_members "1"
    assert_success
    assert_output --partial "2.1"
    assert_output --partial "2.2"
}

@test "Batch 0 (unbatched) returns empty for stories_get_batch_members" {
    run stories_get_batch_members "0"
    assert_success
    assert_output ""
}

@test "Parallel dry-run lists batch contents" {
    run parallel_run 1800 false true
    assert_success
    assert_output --partial "[DRY RUN]"
    assert_output --partial "Batch 1"
}

@test "Single story in batch triggers in-place detection" {
    # Mark stories so only 2.2 remains uncompleted in batch 1
    # Note: 3.1 is also in batch 1 (no [batch:2] annotation after it)
    state_mark_done "2.1"
    state_mark_done "1.1"
    state_mark_done "1.2"
    state_mark_done "3.1"
    # Now batch 1 has: 2.1 (done), 2.2 (uncompleted), 3.1 (done) = 1 uncompleted
    local batch_members
    batch_members=$(stories_get_batch_members "1")
    local uncompleted=0
    while IFS= read -r sid; do
        [[ -z "$sid" ]] && continue
        state_is_completed "$sid" || uncompleted=$((uncompleted + 1))
    done <<< "$batch_members"
    [[ $uncompleted -eq 1 ]]
}

@test "Parallel dry-run processes high batch numbers (no batch 0 or 1)" {
    # Replace stories.txt with high batch numbers only
    cat > .ralph/stories.txt <<'EOF'
# [batch:29]
29.1 | Story Alpha
29.2 | Story Beta
# [batch:35]
35.1 | Story Gamma
EOF

    # Create minimal spec files for these stories
    mkdir -p specs/epic-29 specs/epic-35
    cat > specs/epic-29/story-29.1-story-alpha.md <<'SPEC'
# Story 29.1 — Story Alpha
## Task
Do something
SPEC
    cat > specs/epic-29/story-29.2-story-beta.md <<'SPEC'
# Story 29.2 — Story Beta
## Task
Do something else
SPEC
    cat > specs/epic-35/story-35.1-story-gamma.md <<'SPEC'
# Story 35.1 — Story Gamma
## Task
Do another thing
SPEC

    run parallel_run 1800 false true
    assert_success
    assert_output --partial "Batch 29"
    assert_output --partial "Batch 35"
    assert_output --partial "29.1"
    assert_output --partial "35.1"
}

@test "Parallel dry-run processes decimal batch numbers" {
    cat > .ralph/stories.txt <<'EOF'
# [batch:31]
31.1 | Integer Batch Story
# [batch:31.5]
31.2 | Decimal Batch Story
EOF

    mkdir -p specs/epic-31
    cat > specs/epic-31/story-31.1-integer-batch.md <<'SPEC'
# Story 31.1 — Integer Batch Story
## Task
Do something
SPEC
    cat > specs/epic-31/story-31.2-decimal-batch.md <<'SPEC'
# Story 31.2 — Decimal Batch Story
## Task
Do something
SPEC

    run parallel_run 1800 false true
    assert_success
    assert_output --partial "Batch 31"
    assert_output --partial "Batch 31.5"
    assert_output --partial "31.1"
    assert_output --partial "31.2"
}

@test "depends_on: spec_get_depends_on returns dependency IDs" {
    run spec_get_depends_on "specs/epic-2/story-2.3-with-depends.md"
    assert_success
    assert_output --partial "2.1"
    assert_output --partial "2.2"
}
