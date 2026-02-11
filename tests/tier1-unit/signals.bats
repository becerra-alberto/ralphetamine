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

@test "parse_done: multiple DONE tags returns the last one" {
    local output='<ralph>DONE 1.1</ralph>
some intermediate work
<ralph>DONE 1.2</ralph>'
    run signals_parse_done "$output"
    assert_success
    assert_output "1.2"
}

@test "parse_done: FAIL then DONE returns the DONE" {
    local output='<ralph>FAIL 2.1: build failed</ralph>
fixed the issue
<ralph>DONE 2.1</ralph>'
    run signals_parse_done "$output"
    assert_success
    assert_output "2.1"
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

@test "parse_fail: multiple FAIL tags returns the last one" {
    local output='<ralph>FAIL 3.1: first error</ralph>
retried...
<ralph>FAIL 3.1: second error</ralph>'
    run signals_parse_fail "$output"
    assert_success
    assert_output "3.1|second error"
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

# ── parse_timeout_postmortem_done ─────────────────────────────────────────

@test "parse_timeout_postmortem_done: standard format" {
    run signals_parse_timeout_postmortem_done '<ralph>TIMEOUT_POSTMORTEM_DONE 3.2</ralph>'
    assert_success
    assert_output "3.2"
}

@test "parse_timeout_postmortem_done: no match returns failure" {
    run signals_parse_timeout_postmortem_done 'Some random output'
    assert_failure
}

@test "parse_timeout_postmortem_done: embedded in output" {
    local output="Analysis complete.
<ralph>LEARN: Story was 60% done</ralph>
<ralph>TIMEOUT_POSTMORTEM_DONE 5.1</ralph>"
    run signals_parse_timeout_postmortem_done "$output"
    assert_success
    assert_output "5.1"
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

# ── Hierarchical story IDs ───────────────────────────────────────────────────

@test "parse_done: three-level hierarchical ID" {
    run signals_parse_done '<ralph>DONE 3.1.1</ralph>'
    assert_success
    assert_output "3.1.1"
}

@test "parse_done: four-level hierarchical ID" {
    run signals_parse_done '<ralph>DONE 3.1.1.2</ralph>'
    assert_success
    assert_output "3.1.1.2"
}

@test "parse_fail: three-level hierarchical ID with reason" {
    run signals_parse_fail '<ralph>FAIL 3.1.1: sub-task failed</ralph>'
    assert_success
    assert_output "3.1.1|sub-task failed"
}

@test "parse_done: legacy format with hierarchical ID" {
    run signals_parse_done '[DONE] Story 3.1.1'
    assert_success
    assert_output "3.1.1"
}

@test "parse_fail: legacy format with hierarchical ID" {
    run signals_parse_fail '[FAIL] Story 3.1.1 - nested failure reason'
    assert_success
    assert_output "3.1.1|nested failure reason"
}

# ── parse_decompose_done / parse_decompose_fail ─────────────────────────────

@test "parse_decompose_done: standard format" {
    run signals_parse_decompose_done '<ralph>DECOMPOSE_DONE 3.1: 3 sub-stories</ralph>'
    assert_success
    assert_output "3.1|3 sub-stories"
}

@test "parse_decompose_done: no match returns failure" {
    run signals_parse_decompose_done 'Some output with no decompose signal'
    assert_failure
}

@test "parse_decompose_fail: standard format" {
    run signals_parse_decompose_fail '<ralph>DECOMPOSE_FAIL 3.1: story is already atomic</ralph>'
    assert_success
    assert_output "3.1|story is already atomic"
}

@test "parse_decompose_fail: no match returns failure" {
    run signals_parse_decompose_fail 'Some output'
    assert_failure
}

# ── parse_substories ────────────────────────────────────────────────────────

@test "parse_substories: extracts two substory blocks" {
    local output='Some preamble text
<ralph>SUBSTORY_START 3.1.1</ralph>
---
id: "3.1.1"
title: "First sub-task"
---
Content of first sub-story
<ralph>SUBSTORY_END 3.1.1</ralph>
<ralph>SUBSTORY_START 3.1.2</ralph>
---
id: "3.1.2"
title: "Second sub-task"
---
Content of second sub-story
<ralph>SUBSTORY_END 3.1.2</ralph>'
    run signals_parse_substories "$output"
    assert_success
    assert_line --index 0 '===SUBSTORY:3.1.1==='
    assert_output --partial '===SUBSTORY:3.1.2==='
    assert_output --partial '===END_SUBSTORY==='
    assert_output --partial 'First sub-task'
    assert_output --partial 'Second sub-task'
}

@test "parse_substories: mismatched START/END IDs are ignored" {
    local output='<ralph>SUBSTORY_START 3.1.1</ralph>
content
<ralph>SUBSTORY_END 3.1.2</ralph>'
    run signals_parse_substories "$output"
    assert_success
    # No output since IDs don't match
    refute_output --partial '===SUBSTORY:'
}

@test "parse_substories: empty output returns empty" {
    run signals_parse_substories 'No substory blocks here'
    assert_success
    refute_output --partial '===SUBSTORY:'
}

@test "parse_timeout_postmortem_done: hierarchical ID" {
    run signals_parse_timeout_postmortem_done '<ralph>TIMEOUT_POSTMORTEM_DONE 3.1.1</ralph>'
    assert_success
    assert_output "3.1.1"
}
