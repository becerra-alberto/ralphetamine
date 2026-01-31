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

# ── Dashboard disabled behavior ──────────────────────────────────────

@test "display_init: no-op when dashboard disabled" {
    RALPH_DASHBOARD="false"
    run display_init
    assert_success
    assert_output ""
}

@test "display_refresh: no-op when dashboard disabled" {
    RALPH_DASHBOARD="false"
    run display_refresh
    assert_success
    assert_output ""
}

# ── _display_render_progress_line (Level 1 fallback) ─────────────────

@test "_display_render_progress_line: renders a status line" {
    _DISPLAY_DONE_STORIES=5
    _DISPLAY_TOTAL_STORIES=12
    _DISPLAY_CURRENT_STORY="2.3"
    _DISPLAY_CURRENT_TITLE="auth-middleware"
    _DISPLAY_RETRY_COUNT=1
    _DISPLAY_MAX_RETRIES=3
    _DISPLAY_LEARNINGS_COUNT=14

    run _display_render_progress_line
    assert_success
    assert_output --partial "5/12"
    assert_output --partial "2.3"
    assert_output --partial "1/3"
    assert_output --partial "14"
}

# ── _display_box_top / _display_box_bottom ───────────────────────────

@test "_display_box_top: contains RALPH DASHBOARD title" {
    run _display_box_top 70
    assert_success
    assert_output --partial "RALPH DASHBOARD"
}

@test "_display_box_bottom: renders separator line" {
    run _display_box_bottom 70
    assert_success
    assert_output --partial "="
}
