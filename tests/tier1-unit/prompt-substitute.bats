#!/usr/bin/env bats
# Tier 1 — Pure unit tests for prompt.sh substitution (no filesystem)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    # prompt.sh needs log_debug from ui.sh
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    source_ralph_lib "ui"
    source_ralph_lib "prompt"
}

# ── prompt_substitute ───────────────────────────────────────────────────────

@test "prompt_substitute: single variable" {
    run prompt_substitute "Hello {{NAME}}!" "NAME=World"
    assert_success
    assert_output "Hello World!"
}

@test "prompt_substitute: multiple variables" {
    run prompt_substitute "{{A}} and {{B}}" "A=first" "B=second"
    assert_success
    assert_output "first and second"
}

@test "prompt_substitute: unmatched placeholder left as-is" {
    run prompt_substitute "{{KNOWN}} and {{UNKNOWN}}" "KNOWN=yes"
    assert_success
    assert_output "yes and {{UNKNOWN}}"
}

# ── prompt_process_conditionals ─────────────────────────────────────────────

@test "prompt_process_conditionals: truthy block kept" {
    local template='before
{{#if FEATURE}}
feature content here
{{/if}}
after'
    run prompt_process_conditionals "$template" "FEATURE=enabled"
    assert_success
    assert_output --partial "feature content here"
    assert_output --partial "before"
    assert_output --partial "after"
}

@test "prompt_process_conditionals: falsy block removed" {
    local template='before
{{#if FEATURE}}
feature content here
{{/if}}
after'
    run prompt_process_conditionals "$template" "FEATURE="
    assert_success
    assert_output --partial "before"
    assert_output --partial "after"
    refute_output --partial "feature content here"
}

@test "prompt_process_conditionals: nested if inside falsy block skipped" {
    local template='before
{{#if OUTER}}
outer content
{{#if INNER}}
inner content
{{/if}}
{{/if}}
after'
    run prompt_process_conditionals "$template" "OUTER=" "INNER=yes"
    assert_success
    assert_output --partial "before"
    assert_output --partial "after"
    refute_output --partial "outer content"
    refute_output --partial "inner content"
}
