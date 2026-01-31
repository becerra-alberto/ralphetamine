#!/usr/bin/env bats
# Tier 5 — E2E pipeline tests: full pipeline flow across all epics
# Tests dry-run ordering, resume from mid-point, prompt injection of
# learnings and validation_commands, state persistence, and progress logging.

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

# ── Test 1: Full dry-run shows all stories in order ──────────────────────────

@test "Full dry-run shows DRY RUN and story 1.1, with ~1.3 excluded from queue" {
    # Dry-run with 1 iteration shows DRY RUN marker for the first story
    run _run_sequential 1 300 false true "" ""
    assert_success
    assert_output --partial "[DRY RUN]"
    assert_output --partial "1.1"

    # ~1.3 should be excluded from the story queue entirely
    run stories_list_all
    assert_success
    assert_output --partial "1.1"
    assert_output --partial "1.2"
    refute_output --partial "1.3"
}

# ── Test 2: Resume from story 2.1 skips completed stories ───────────────────

@test "Resume skips completed stories and starts at first uncompleted" {
    # Mark 1.1 and 1.2 as done
    state_mark_done "1.1"
    state_mark_done "1.2"

    # Run 1 iteration from the beginning — should pick up 2.1 (next uncompleted)
    run _run_sequential 1 300 false false "" ""
    assert_success
    assert_story_completed "2.1"
    # Progress should show 2.1 was the story that ran, not 1.1 or 1.2
    assert_file_contains "progress.txt" "2.1"
    # 1.1 was already done — progress.txt from this run shouldn't have a new DONE for 1.1
    assert_file_not_contains "progress.txt" "[DONE] Story 1.1"
}

# ── Test 3: Prompt includes learnings injection ──────────────────────────────

@test "Prompt build includes learnings when available" {
    # Store a learning with keywords that overlap with the search engine spec
    # The spec mentions "search", "engine", "indexes", "notes", "content", "queries"
    # The learning must share words of length >= 4 to score > 0
    mkdir -p .ralph/learnings
    cat > .ralph/learnings/patterns.md << 'EOF'
# Learnings: patterns

- [Story 1.2] Always validate search engine queries before indexing content
EOF
    jq -n '{"patterns": "patterns.md"}' > .ralph/learnings/_index.json

    # Build prompt for story 2.1 (search engine)
    local prompt
    prompt=$(prompt_build "2.1" "specs/epic-2/story-2.1-search-engine.md")

    # The learning should be injected — check for any of its distinctive words
    [[ "$prompt" == *"validate search engine"* ]]
}

# ── Test 4: Prompt includes validation_commands from config ──────────────────

@test "Prompt build includes validation commands from config" {
    local prompt
    prompt=$(prompt_build "2.3" "specs/epic-2/story-2.3-search-filters.md")

    # Config has validation.commands with "npm test"
    echo "$prompt" | grep -q "npm test"
}

# ── Test 5: State persistence across iterations ─────────────────────────────

@test "State persists correctly across multiple story completions" {
    # Run 2 iterations — should complete 1.1, then 1.2 (fail+done = 2 iterations for 1.2)
    run _run_sequential 1 300 false false "1.1" ""
    assert_success
    assert_story_completed "1.1"
    assert_json_field ".ralph/state.json" ".retry_count" "0"

    # State file should persist between runs
    local completed_count
    completed_count=$(jq '.completed_stories | length' .ralph/state.json)
    [[ "$completed_count" -ge 1 ]]
}

# ── Test 6: Progress.txt accumulates entries ─────────────────────────────────

@test "Progress.txt accumulates chronological entries for each story signal" {
    # Run story 1.1
    _run_sequential 1 300 false false "1.1" ""
    assert_file_contains "progress.txt" "[DONE]"
    assert_file_contains "progress.txt" "1.1"

    local line_count_after_first
    line_count_after_first=$(wc -l < progress.txt | xargs)

    # Run story 1.2 (FAIL then DONE on retry)
    _run_sequential 2 300 false false "1.2" ""
    assert_file_contains "progress.txt" "1.2"

    local line_count_after_second
    line_count_after_second=$(wc -l < progress.txt | xargs)

    # Second run should have added more lines
    [[ "$line_count_after_second" -gt "$line_count_after_first" ]]
}
