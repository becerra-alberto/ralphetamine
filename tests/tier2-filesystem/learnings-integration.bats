#!/usr/bin/env bats
# Tier 2 — Filesystem tests for learnings.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "signals"
    source_ralph_lib "learnings"
}

teardown() {
    teardown_test_environment
}

@test "learnings_init: creates directory and _index.json" {
    run learnings_init
    assert_success
    [[ -d ".ralph/learnings" ]]
    [[ -f ".ralph/learnings/_index.json" ]]
    assert_json_field ".ralph/learnings/_index.json" "." "{}"
}

@test "learnings_extract: two LEARN signals creates category files" {
    learnings_init
    local output='text <ralph>LEARN: SQLite migration columns need types</ralph> mid <ralph>LEARN: Svelte 5 runes reactivity handling</ralph> end'
    run learnings_extract "$output" "2.1"
    assert_success
    # data-model.md from SQLite, framework.md from Svelte
    [[ -f ".ralph/learnings/data-model.md" ]]
    [[ -f ".ralph/learnings/framework.md" ]]
    assert_file_contains ".ralph/learnings/data-model.md" "Story 2.1"
    assert_file_contains ".ralph/learnings/framework.md" "Story 2.1"
}

@test "learnings_extract: appends to progress.txt" {
    mkdir -p .ralph/learnings
    echo '{}' > .ralph/learnings/_index.json
    # Run extract and check progress.txt directly (not via run, to keep fs side effects)
    learnings_extract 'text <ralph>LEARN: vite build config tip</ralph> end' "3.1" || true
    assert_file_contains "progress.txt" "LEARN"
}

@test "learnings_select_relevant: returns top-scored entries" {
    # Set up learnings directory with content
    mkdir -p .ralph/learnings
    echo '{}' > .ralph/learnings/_index.json
    cat > .ralph/learnings/testing.md << 'EOF'
# Learnings: testing

- [Story 1.1] vitest describe blocks should use consistent naming
- [Story 2.1] mock functions need cleanup between test runs
EOF
    cat > .ralph/learnings/framework.md << 'EOF'
# Learnings: framework

- [Story 1.2] Svelte 5 runes require special handling for reactive state
EOF

    # Query with spec content that overlaps with testing learnings
    run learnings_select_relevant "This story involves vitest test blocks and naming" 2
    assert_success
    # Should return the testing learning that matches
    assert_output --partial "vitest"
}

@test "learnings_import_legacy: parses [LEARN] from progress.txt" {
    copy_fixture progress-legacy.txt progress.txt
    run learnings_import_legacy "progress.txt"
    assert_success
    # Should have imported learnings — at least data-model.md from SQLite learning
    [[ -f ".ralph/learnings/data-model.md" ]]
    assert_file_contains ".ralph/learnings/data-model.md" "SQLite"
}
