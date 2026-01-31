#!/usr/bin/env bats
# Tier 4 — Workflow test: ralph run --dry-run

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project
    RALPH_BIN="${RALPH_DIR}/bin/ralph"
    # Mock prereqs so claude isn't required
    create_mock_command "claude" 'echo "mock"'
    # Mock gtimeout/timeout to satisfy prereqs
    if ! command -v timeout &>/dev/null && ! command -v gtimeout &>/dev/null; then
        create_mock_command "timeout" 'shift; "$@"'
    fi
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "ralph run --dry-run: shows DRY RUN marker" {
    run "$RALPH_BIN" run --dry-run --no-interactive --no-tmux -s 1.1
    assert_success
    assert_output --partial "[DRY RUN]"
}

@test "ralph run --dry-run: output contains story title from spec" {
    run "$RALPH_BIN" run --dry-run --no-interactive --no-tmux -s 1.1
    assert_success
    assert_output --partial "Initialize Project"
}

@test "ralph run --dry-run: verbose flag does not crash" {
    run "$RALPH_BIN" run --dry-run --no-interactive --no-tmux -v -s 1.1
    assert_success
    assert_output --partial "[DRY RUN]"
}
