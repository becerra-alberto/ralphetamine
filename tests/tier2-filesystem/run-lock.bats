#!/usr/bin/env bats
# Tier 2 — Filesystem tests for run lock (acquire/release)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "runner"
    mkdir -p .ralph
}

teardown() {
    teardown_test_environment
}

@test "_acquire_run_lock: creates lock file with current PID" {
    _acquire_run_lock
    [ -f ".ralph/.lock" ]
    local lock_pid
    lock_pid=$(cat .ralph/.lock)
    [ "$lock_pid" = "$$" ]
}

@test "_acquire_run_lock: fails when lock held by live PID" {
    # Spawn a background process to hold the lock
    sleep 60 &
    local bg_pid=$!
    echo "$bg_pid" > .ralph/.lock

    run _acquire_run_lock
    assert_failure
    assert_output --partial "Another Ralph instance is running"

    kill "$bg_pid" 2>/dev/null || true
    wait "$bg_pid" 2>/dev/null || true
}

@test "_acquire_run_lock: removes stale lock and succeeds" {
    # Write a PID that definitely isn't running
    echo "99999" > .ralph/.lock

    run _acquire_run_lock
    assert_success

    # Lock should now contain our PID
    local lock_pid
    lock_pid=$(cat .ralph/.lock)
    [ "$lock_pid" = "$$" ]
}

@test "_release_run_lock: removes lock if current process owns it" {
    echo "$$" > .ralph/.lock
    _release_run_lock
    [ ! -f ".ralph/.lock" ]
}

@test "_release_run_lock: is no-op if different PID owns lock" {
    echo "12345" > .ralph/.lock
    _release_run_lock
    # Lock file should still exist with original PID
    [ -f ".ralph/.lock" ]
    local lock_pid
    lock_pid=$(cat .ralph/.lock)
    [ "$lock_pid" = "12345" ]
}
