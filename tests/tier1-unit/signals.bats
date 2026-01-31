#!/usr/bin/env bats
# Tier 1 — Pure unit tests for signals.sh (no filesystem, no externals)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    source_ralph_lib "signals"
}

# ── parse_done ──────────────────────────────────────────────────────────────

@test "parse_done: standard DONE tag" {
    run signals_parse_done '<ralph>DONE 3.4</ralph>'
    assert_success
    assert_output "3.4"
}

@test "parse_done: legacy format" {
    run signals_parse_done '[DONE] Story 2.1'
    assert_success
    assert_output "2.1"
}

@test "parse_done: no match returns failure" {
    run signals_parse_done 'Still working on the implementation...'
    assert_failure
}

@test "parse_done: DONE tag buried in multiline output" {
    local output="Line 1 of output
Some debug info here
More work being done
<ralph>DONE 5.2</ralph>
Final cleanup line"
    run signals_parse_done "$output"
    assert_success
    assert_output "5.2"
}

# ── parse_fail ──────────────────────────────────────────────────────────────

@test "parse_fail: with reason" {
    run signals_parse_fail '<ralph>FAIL 1.2: npm test failed</ralph>'
    assert_success
    assert_output "1.2|npm test failed"
}

@test "parse_fail: pipe character in reason is sanitized" {
    run signals_parse_fail '<ralph>FAIL 3.1: a|b pipeline error</ralph>'
    assert_success
    assert_output "3.1|a-b pipeline error"
}

@test "parse_fail: legacy format" {
    run signals_parse_fail '[FAIL] Story 1.1 - build error in component'
    assert_success
    assert_output "1.1|build error in component"
}

# ── parse_learnings ─────────────────────────────────────────────────────────

@test "parse_learnings: extracts multiple LEARN tags" {
    local output='Some text <ralph>LEARN: first learning</ralph> middle <ralph>LEARN: second learning</ralph> end'
    run signals_parse_learnings "$output"
    assert_success
    assert_line --index 0 "first learning"
    assert_line --index 1 "second learning"
}

@test "parse_learnings: no LEARN tags returns empty" {
    run signals_parse_learnings 'Just regular output with no learn tags'
    assert_success
    assert_output ""
}

# ── parse_test_review_done ──────────────────────────────────────────────────

@test "parse_test_review_done: standard format" {
    run signals_parse_test_review_done '<ralph>TEST_REVIEW_DONE 3.2: all 15 tests passing</ralph>'
    assert_success
    assert_output "3.2|all 15 tests passing"
}

# ── parse_merge_done / parse_merge_fail ─────────────────────────────────────

@test "parse_merge_done: standard format" {
    run signals_parse_merge_done '<ralph>MERGE_DONE: resolved 3 conflicts in 2 files</ralph>'
    assert_success
    assert_output "resolved 3 conflicts in 2 files"
}

@test "parse_merge_fail: standard format" {
    run signals_parse_merge_fail '<ralph>MERGE_FAIL: conflicting changes cannot be reconciled</ralph>'
    assert_success
    assert_output "conflicting changes cannot be reconciled"
}

# ── has_completion ──────────────────────────────────────────────────────────

@test "has_completion: returns 0 for DONE" {
    run signals_has_completion '<ralph>DONE 1.1</ralph>'
    assert_success
}

@test "has_completion: returns 0 for FAIL" {
    run signals_has_completion '<ralph>FAIL 1.1: reason</ralph>'
    assert_success
}

@test "has_completion: returns 1 for no signal" {
    run signals_has_completion 'Just regular output'
    assert_failure
}
