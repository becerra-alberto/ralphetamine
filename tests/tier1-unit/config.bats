#!/usr/bin/env bats
# Tier 1 — Unit tests for config_validate()

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    source_ralph_lib "ui"
    source_ralph_lib "config"
}

# Helper: populate _CONFIG directly so config_validate doesn't hit the filesystem
_set_pattern() {
    local pattern="$1"
    _CONFIG=$(echo '{}' | jq --arg p "$pattern" '. + {specs: {pattern: $p}}')
}

@test "config_validate passes with default pattern" {
    _set_pattern 'specs/epic-{{epic}}/story-{{id}}-*.md'
    run config_validate
    assert_success
}

@test "config_validate passes with custom valid pattern" {
    _set_pattern 'work/{{epic}}/{{id}}.md'
    run config_validate
    assert_success
}

@test "config_validate fails when {{epic}} is missing" {
    _set_pattern 'specs/story-{{id}}-*.md'
    run config_validate
    assert_failure
    assert_output --partial 'missing {{epic}} token'
}

@test "config_validate fails when {{id}} is missing" {
    _set_pattern 'specs/epic-{{epic}}/story-*.md'
    run config_validate
    assert_failure
    assert_output --partial 'missing {{id}} token'
}

@test "config_validate fails when both tokens are missing" {
    _set_pattern 'specs/*.md'
    run config_validate
    assert_failure
    assert_output --partial 'missing {{epic}} token'
    assert_output --partial 'missing {{id}} token'
}

@test "config_validate fails with malformed brace (missing closing}}" {
    _set_pattern 'specs/epic-{{epic}/story-{{id}}-*.md'
    run config_validate
    assert_failure
    assert_output --partial 'missing {{epic}} token'
}
