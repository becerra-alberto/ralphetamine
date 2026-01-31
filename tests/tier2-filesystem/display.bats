#!/usr/bin/env bats
# Tier 2 — Filesystem integration tests for display.sh state-reading logic

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "display"
}

teardown() {
    teardown_test_environment
}

# ── _display_count_learnings ─────────────────────────────────────────

@test "_display_count_learnings: returns 0 when no learnings dir" {
    run _display_count_learnings
    assert_success
    assert_output "0"
}

@test "_display_count_learnings: returns 0 when learnings dir is empty" {
    mkdir -p .ralph/learnings
    run _display_count_learnings
    assert_success
    assert_output "0"
}

@test "_display_count_learnings: counts entries across category files" {
    mkdir -p .ralph/learnings
    printf '# Learnings: testing\n\n- [Story 1.1] Use vitest\n- [Story 1.2] Mock external APIs\n' \
        > .ralph/learnings/testing.md
    printf '# Learnings: gotchas\n\n- [Story 2.1] Watch for race conditions\n' \
        > .ralph/learnings/gotchas.md
    echo '{}' > .ralph/learnings/_index.json

    run _display_count_learnings
    assert_success
    assert_output "3"
}

@test "_display_count_learnings: ignores _index.json" {
    mkdir -p .ralph/learnings
    echo '{"testing": "testing.md"}' > .ralph/learnings/_index.json
    printf '# Learnings: testing\n\n- [Story 1.1] One learning\n' \
        > .ralph/learnings/testing.md

    run _display_count_learnings
    assert_success
    assert_output "1"
}

# ── _display_count_active_workers ────────────────────────────────────

@test "_display_count_active_workers: returns 0 when no worktree dir" {
    run _display_count_active_workers
    assert_success
    assert_output "0"
}

@test "_display_count_active_workers: returns 0 when no pid files" {
    mkdir -p .ralph/worktrees/.pids-$$
    run _display_count_active_workers
    assert_success
    assert_output "0"
}

@test "_display_count_active_workers: counts running pids" {
    mkdir -p .ralph/worktrees/.pids-$$

    # Create a background process to have a valid PID
    sleep 60 &
    local bg_pid=$!
    echo "1.1" > ".ralph/worktrees/.pids-$$/pid_${bg_pid}"

    run _display_count_active_workers
    assert_output "1"

    # Clean up background process
    kill "$bg_pid" 2>/dev/null || true
    wait "$bg_pid" 2>/dev/null || true
}

@test "_display_count_active_workers: ignores dead pids" {
    mkdir -p .ralph/worktrees/.pids-$$
    # Use a PID that definitely doesn't exist
    echo "1.1" > ".ralph/worktrees/.pids-$$/pid_99999999"

    run _display_count_active_workers
    assert_success
    assert_output "0"
}

# ── display_refresh_from_state ───────────────────────────────────────

@test "display_refresh_from_state: reads stories and state" {
    copy_fixture config.json .ralph/config.json
    copy_fixture stories.txt .ralph/stories.txt
    copy_fixture state-partial.json .ralph/state.json
    mkdir -p .ralph/learnings
    echo '{}' > .ralph/learnings/_index.json
    config_load

    # Since display_refresh_from_state calls display_refresh which
    # tries to render, we just verify it doesn't error out
    RALPH_DASHBOARD="true"
    _DISPLAY_INITIALIZED=false  # Force Level 1 fallback
    run display_refresh_from_state
    assert_success
}

@test "display_refresh_from_state: no-op when dashboard disabled" {
    RALPH_DASHBOARD="false"
    run display_refresh_from_state
    assert_success
    assert_output ""
}

# ── display_init ─────────────────────────────────────────────────────

@test "display_init: sets RALPH_START_TIME" {
    RALPH_START_TIME=""
    RALPH_DASHBOARD="true"
    display_init
    [[ -n "$RALPH_START_TIME" ]]
    # Should be a valid epoch timestamp
    [[ "$RALPH_START_TIME" =~ ^[0-9]+$ ]]
}
