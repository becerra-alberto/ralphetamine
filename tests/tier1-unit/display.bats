#!/usr/bin/env bats
# Tier 1 — Pure unit tests for display.sh formatting and data update functions

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    export RALPH_DASHBOARD="true"
    source_ralph_lib "ui"
    source_ralph_lib "display"
}

# ── ui_progress_bar tests ────────────────────────────────────────────

@test "ui_progress_bar: 0/10 shows all empty" {
    run ui_progress_bar 0 10 10
    assert_success
    assert_output "[░░░░░░░░░░] 0/10"
}

@test "ui_progress_bar: 10/10 shows all filled" {
    run ui_progress_bar 10 10 10
    assert_success
    assert_output "[██████████] 10/10"
}

@test "ui_progress_bar: 5/10 shows half filled" {
    run ui_progress_bar 5 10 10
    assert_success
    assert_output "[█████░░░░░] 5/10"
}

@test "ui_progress_bar: 0/0 total shows all empty" {
    run ui_progress_bar 0 0 10
    assert_success
    assert_output "[░░░░░░░░░░] 0/0"
}

@test "ui_progress_bar: default width is 20" {
    run ui_progress_bar 5 10
    assert_success
    # 5/10 = 50% of 20 = 10 filled, 10 empty
    assert_output "[██████████░░░░░░░░░░] 5/10"
}

@test "ui_progress_bar: completed > total clamps to full" {
    run ui_progress_bar 15 10 10
    assert_success
    assert_output "[██████████] 15/10"
}

# ── display_update_* tests ───────────────────────────────────────────

@test "display_update_stories: sets cached values" {
    display_update_stories 12 5
    [[ "$_DISPLAY_TOTAL_STORIES" -eq 12 ]]
    [[ "$_DISPLAY_DONE_STORIES" -eq 5 ]]
}

@test "display_update_current: sets story and title" {
    display_update_current "3.2" "auth-middleware"
    [[ "$_DISPLAY_CURRENT_STORY" == "3.2" ]]
    [[ "$_DISPLAY_CURRENT_TITLE" == "auth-middleware" ]]
}

@test "display_update_current: title is optional" {
    display_update_current "3.2"
    [[ "$_DISPLAY_CURRENT_STORY" == "3.2" ]]
    [[ "$_DISPLAY_CURRENT_TITLE" == "" ]]
}

@test "display_update_retry: sets retry count and max" {
    display_update_retry 2 5
    [[ "$_DISPLAY_RETRY_COUNT" -eq 2 ]]
    [[ "$_DISPLAY_MAX_RETRIES" -eq 5 ]]
}

@test "display_update_retry: max defaults to 3" {
    display_update_retry 1
    [[ "$_DISPLAY_RETRY_COUNT" -eq 1 ]]
    [[ "$_DISPLAY_MAX_RETRIES" -eq 3 ]]
}

@test "display_update_iteration: sets iteration number" {
    display_update_iteration 7
    [[ "$_DISPLAY_ITERATION" -eq 7 ]]
}

@test "display_update_learnings: sets count" {
    display_update_learnings 14
    [[ "$_DISPLAY_LEARNINGS_COUNT" -eq 14 ]]
}

@test "display_update_workers: sets active and max" {
    display_update_workers 3 8
    [[ "$_DISPLAY_WORKERS_ACTIVE" -eq 3 ]]
    [[ "$_DISPLAY_WORKERS_MAX" -eq 8 ]]
}

@test "display_update_last_done: sets story and timestamp" {
    display_update_last_done "2.1"
    [[ "$_DISPLAY_LAST_DONE" == "2.1" ]]
    [[ -n "$_DISPLAY_LAST_DONE_AGO" ]]
}

# ── _display_format_elapsed tests ────────────────────────────────────

@test "_display_format_elapsed: zero difference shows 00:00:00" {
    local now
    now=$(date '+%s')
    run _display_format_elapsed "$now"
    assert_success
    assert_output "00:00:00"
}

@test "_display_format_elapsed: 90 seconds shows 00:01:30" {
    local now
    now=$(date '+%s')
    local start=$(( now - 90 ))
    run _display_format_elapsed "$start"
    assert_success
    assert_output "00:01:30"
}

@test "_display_format_elapsed: 3661 seconds shows 01:01:01" {
    local now
    now=$(date '+%s')
    local start=$(( now - 3661 ))
    run _display_format_elapsed "$start"
    assert_success
    assert_output "01:01:01"
}

# ── _display_format_duration tests ───────────────────────────────────

@test "_display_format_duration: 45 seconds shows 45s" {
    run _display_format_duration 45
    assert_success
    assert_output "45s"
}

@test "_display_format_duration: 90 seconds shows 1m 30s" {
    run _display_format_duration 90
    assert_success
    assert_output "1m 30s"
}

@test "_display_format_duration: 0 seconds shows 0s" {
    run _display_format_duration 0
    assert_success
    assert_output "0s"
}

# ── _display_is_plain tests ─────────────────────────────────────────

@test "_display_is_plain: returns 0 when NO_COLOR is set" {
    NO_COLOR=1 run _display_is_plain
    assert_success
}

@test "_display_is_plain: returns 0 when CI=true" {
    CI=true run _display_is_plain
    assert_success
}

@test "_display_is_plain: returns 0 when TERM=dumb" {
    TERM=dumb run _display_is_plain
    assert_success
}

# ── display_story_completed tests ────────────────────────────────────

@test "display_story_completed: basic output" {
    NO_COLOR=1 run display_story_completed "3.1"
    assert_success
    assert_output "[OK] Story 3.1 completed!"
}

@test "display_story_completed: with duration and tokens" {
    NO_COLOR=1 run display_story_completed "3.1" "10m 35s" "42000" "0.38"
    assert_success
    assert_output --partial "3.1 completed!"
    assert_output --partial "10m 35s"
    assert_output --partial "42000 tokens"
}

# ── display_story_failed tests ──────────────────────────────────────

@test "display_story_failed: basic output" {
    NO_COLOR=1 run display_story_failed "3.1" "Timeout"
    assert_success
    assert_output "[FAIL] Story 3.1 failed: Timeout"
}

@test "display_story_failed: with metrics" {
    NO_COLOR=1 run display_story_failed "3.1" "Exit code 1" "5m 00s" "10000" "0.15"
    assert_success
    assert_output --partial "3.1 failed"
    assert_output --partial "Exit code 1"
    assert_output --partial "5m 00s"
}

# ── display_batch_results tests ─────────────────────────────────────

@test "display_batch_results: renders summary" {
    NO_COLOR=1 run display_batch_results 3 1
    assert_success
    assert_output "[INFO] Batch results: 3 succeeded, 1 failed"
}

# ── Dashboard disabled behavior ──────────────────────────────────────

@test "display_init: no-op when called" {
    run display_init
    assert_success
}

@test "display_refresh: always no-op" {
    RALPH_DASHBOARD="false"
    run display_refresh
    assert_success
    assert_output ""
}
