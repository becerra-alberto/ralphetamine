#!/usr/bin/env bats
# Tier 3 — Component tests for hooks.sh (mocked externals)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    _CONFIG=""
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

_setup_hook_config() {
    local hook_cmd="$1"
    mkdir -p .ralph
    # Use printf to avoid heredoc escaping issues with special chars
    printf '{"version":"2.0.0","project":{"name":"test"},"hooks":{"pre_story":"%s"}}\n' "$hook_cmd" > .ralph/config.json
    config_load
    source_ralph_lib "hooks"
}

@test "hooks_run: exports RALPH_STORY and hook uses it" {
    _setup_hook_config 'echo story=$RALPH_STORY'
    run hooks_run "pre_story" "RALPH_STORY=3.2"
    assert_success
    assert_output --partial "story=3.2"
}

@test "hooks_run: empty hook string is no-op" {
    _setup_hook_config ''
    run hooks_run "pre_story" "RALPH_STORY=1.1"
    assert_success
}

@test "hooks_run: cleans up exported vars after execution" {
    _setup_hook_config 'true'
    RALPH_STORY=""
    hooks_run "pre_story" "RALPH_STORY=5.1" || true
    [[ -z "${RALPH_STORY:-}" ]]
}

@test "hooks_run: hook failure is non-fatal" {
    _setup_hook_config 'false'
    run hooks_run "pre_story" "RALPH_STORY=1.1"
    assert_success
}

@test "hooks_run: multiple env pairs exported correctly" {
    _setup_hook_config 'echo s=$RALPH_STORY sp=$RALPH_SPEC'
    run hooks_run "pre_story" "RALPH_STORY=2.1" "RALPH_SPEC=specs/epic-2/story-2.1.md"
    assert_success
    assert_output --partial "s=2.1"
    assert_output --partial "sp=specs/epic-2/story-2.1.md"
}
