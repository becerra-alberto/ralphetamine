#!/usr/bin/env bats
# Tier 3 — Component tests: parallel batch discovery and execution logic
# (reclassified from tier5 — calls internal functions directly, not bin/ralph)
# Tests batch member discovery, dry-run output, testing specialist trigger,
# single-story fallback, and max_workers chunking.

# Shell function mock for timeout
_mock_timeout() {
    shift
    "$@"
}

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    load "../helpers/pipeline.bash"
    setup_test_environment
    scaffold_pipeline_project

    source_pipeline_libs
    config_load

    prereqs_timeout_cmd() { echo "_mock_timeout"; }
    prereqs_require_bash4() { return 0; }

    setup_pipeline_claude_mock

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

# ── Test 1: Batch 1 discovery ────────────────────────────────────────────────

@test "Batch 1 discovers stories 2.1, 2.2, 2.3" {
    run stories_get_batch_members "1"
    assert_success
    assert_output --partial "2.1"
    assert_output --partial "2.2"
    assert_output --partial "2.3"
}

# ── Test 2: Batch 2 discovery ────────────────────────────────────────────────

@test "Batch 2 discovers stories 4.1, 4.2" {
    run stories_get_batch_members "2"
    assert_success
    assert_output --partial "4.1"
    assert_output --partial "4.2"
}

# ── Test 3: Parallel dry-run ─────────────────────────────────────────────────

@test "Pipeline parallel dry-run lists batch contents" {
    run parallel_run 300 false true
    assert_success
    assert_output --partial "[DRY RUN]"
    assert_output --partial "Batch 1"
    assert_output --partial "2.1"
    assert_output --partial "2.2"
    assert_output --partial "2.3"
}

# ── Test 4: Testing specialist triggers for story with validation_commands ───

@test "Testing specialist: config enables testing_phase for review after DONE" {
    # Verify config has testing_phase.enabled = true
    local enabled
    enabled=$(config_get '.testing_phase.enabled' 'false')
    [[ "$enabled" == "true" ]]

    # Verify spec 2.3 has validation_commands in frontmatter
    local spec_path="specs/epic-2/story-2.3-search-filters.md"
    run spec_get_field "$spec_path" "validation_commands"
    assert_success
    assert_output --partial "npm test"
}

# ── Test 5: Single uncompleted story in batch ────────────────────────────────

@test "Single uncompleted story in batch detected correctly" {
    # Mark 2.1 and 2.2 done, leaving only 2.3 in batch 1
    state_mark_done "2.1"
    state_mark_done "2.2"

    local batch_members
    batch_members=$(stories_get_batch_members "1")
    local uncompleted=0
    while IFS= read -r sid; do
        [[ -z "$sid" ]] && continue
        state_is_completed "$sid" || uncompleted=$((uncompleted + 1))
    done <<< "$batch_members"

    [[ $uncompleted -eq 1 ]]
}

# ── Test 6: max_concurrent config ────────────────────────────────────────────

@test "max_concurrent config limits parallel workers" {
    local max_concurrent
    max_concurrent=$(config_get '.parallel.max_concurrent' '8')
    # Pipeline config sets max_concurrent to 2
    [[ "$max_concurrent" == "2" ]]

    # Verify batch 1 has more stories (3) than max_concurrent (2)
    local count=0
    while IFS= read -r sid; do
        [[ -z "$sid" ]] && continue
        count=$((count + 1))
    done < <(stories_get_batch_members "1")
    [[ $count -eq 3 ]]
    [[ $count -gt $max_concurrent ]]
}
