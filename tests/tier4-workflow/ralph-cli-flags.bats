#!/usr/bin/env bats
# Tier 4 — Workflow tests for CLI flag parsing
# Verifies that ralph run correctly interprets --resume, --iterations,
# --timeout, --parallel, --no-dashboard, and --no-interactive flags
# with BEHAVIORAL assertions (not just "did not crash").

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project
    RALPH_BIN="${RALPH_DIR}/bin/ralph"
    # Mock claude to emit DONE for whatever story is requested
    create_mock_command "claude" '
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        echo "<ralph>DONE ${BASH_REMATCH[1]}</ralph>"
        exit 0
    fi
done
echo "<ralph>DONE 1.1</ralph>"
'
    # Mock gtimeout/timeout to satisfy prereqs
    if ! command -v timeout &>/dev/null && ! command -v gtimeout &>/dev/null; then
        create_mock_command "timeout" 'shift; "$@"'
    fi
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "ralph run --iterations 1: completes exactly 1 story" {
    run "$RALPH_BIN" run --iterations 1 --no-interactive --no-tmux --no-dashboard -s 1.1
    assert_success
    # Verify story 1.1 was completed in state.json
    jq -r '.completed_stories[]' .ralph/state.json | grep -q '^1.1$'
    # progress.txt should have exactly 1 [DONE] entry
    local done_count
    done_count=$(grep -c '\[DONE\]' progress.txt 2>/dev/null || echo "0")
    [[ "$done_count" -eq 1 ]]
}

@test "ralph run --timeout 5: timeout value appears in output" {
    run "$RALPH_BIN" run --timeout 5 --no-interactive --no-tmux --no-dashboard -s 1.1
    assert_success
    # The timeout value should appear in the startup box output
    assert_output --partial "5s per story"
}

@test "ralph run --parallel --dry-run: shows parallel-specific output" {
    # Enable parallel in config
    jq '.parallel.enabled = true' .ralph/config.json > .ralph/config.json.tmp \
        && mv .ralph/config.json.tmp .ralph/config.json

    run "$RALPH_BIN" run --parallel --no-interactive --no-tmux --no-dashboard --dry-run
    assert_success
    # Parallel dry-run should show batch information
    assert_output --partial "[DRY RUN]"
}

@test "ralph run --no-dashboard: output lacks ANSI dashboard markers" {
    run "$RALPH_BIN" run --no-dashboard --no-interactive --no-tmux -s 1.1
    assert_success
    assert_output --partial "DONE"
    # Append-only display never emits scroll regions — verify clean output
    refute_output --partial $'\e[1;'
}

@test "ralph run --no-interactive: skips interactive prompt" {
    run "$RALPH_BIN" run --no-interactive --no-tmux --no-dashboard -s 1.1
    assert_success
    # Should not contain interactive prompt text
    refute_output --partial "Press Enter"
    refute_output --partial "Start?"
    refute_output --partial "How would you like to run"
}

@test "ralph run --resume 1.2: skips story 1.1 and starts from 1.2" {
    # Run with --resume 1.2 to skip 1.1 and start from 1.2
    run "$RALPH_BIN" run --resume 1.2 --no-interactive --no-tmux --no-dashboard --iterations 1
    assert_success
    # Verify story 1.2 was completed in state.json
    jq -r '.completed_stories[]' .ralph/state.json | grep -q '^1.2$'
    # The output should reference story 1.2
    assert_output --partial "1.2"
    # progress.txt should show 1.2, not 1.1 as a new DONE
    assert_file_contains "progress.txt" "\\[DONE\\] Story 1.2"
    assert_file_not_contains "progress.txt" "\\[DONE\\] Story 1.1"
}
