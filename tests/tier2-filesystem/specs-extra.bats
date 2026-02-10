#!/usr/bin/env bats
# Tier 2 — Extra filesystem tests for specs.sh and prompt.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "specs"
    source_ralph_lib "prompt"

    mkdir -p .ralph specs/epic-1
    copy_fixture config.json .ralph/config.json
    config_load
}

teardown() {
    teardown_test_environment
}

@test "spec_get_depends_on: parses multi-line YAML list format" {
    cat > specs/epic-1/story-1.1-test.md <<'EOF'
---
id: "1.1"
status: pending
depends_on:
  - 2.1
  - 2.2
  - 3.1
---
# Story 1.1: Test
EOF

    run spec_get_depends_on "specs/epic-1/story-1.1-test.md"
    assert_success
    assert_line --index 0 "2.1"
    assert_line --index 1 "2.2"
    assert_line --index 2 "3.1"
}

@test "spec_find: rejects pattern with unresolved template variables" {
    # Override config to use a broken pattern
    jq '.specs.pattern = "specs/epic-{{epic}}/story-{{id}}-{{flavor}}-*.md"' \
        .ralph/config.json > .ralph/config.json.tmp && mv .ralph/config.json.tmp .ralph/config.json
    config_load

    run spec_find "1.1"
    assert_failure
    assert_output --partial "unresolved template variables"
}

@test "prompt_load_template: falls back from project-local to RALPH_DIR templates" {
    prompt_init

    # No project-local template exists — should fall back to RALPH_DIR/templates/
    run prompt_load_template "implement"
    assert_success
    # The implement.md template should have content
    [ -n "$output" ]
}
