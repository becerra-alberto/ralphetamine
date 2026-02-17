#!/usr/bin/env bats
# Tier 1 — Unit tests for batch discovery and decimal batch support in stories.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment

    source_ralph_lib "ui"
    source_ralph_lib "stories"

    mkdir -p .ralph
    export RALPH_STORIES_FILE=".ralph/stories.txt"
}

teardown() {
    teardown_test_environment
}

# ── stories_get_all_batches ──────────────────────────────────────────────────

@test "stories_get_all_batches: returns batch numbers in file order" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
1.1 | Unbatched
# [batch:1]
2.1 | Story A
# [batch:2]
3.1 | Story B
EOF
    run stories_get_all_batches
    assert_success
    assert_line -n 0 "1"
    assert_line -n 1 "2"
}

@test "stories_get_all_batches: handles high batch numbers (29-39)" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:29]
29.1 | Story A
29.2 | Story B
# [batch:30]
30.1 | Story C
# [batch:35]
35.1 | Story D
# [batch:39]
39.1 | Story E
EOF
    run stories_get_all_batches
    assert_success
    assert_line -n 0 "29"
    assert_line -n 1 "30"
    assert_line -n 2 "35"
    assert_line -n 3 "39"
}

@test "stories_get_all_batches: deduplicates repeated batch numbers" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:5]
5.1 | Story A
# [batch:5]
5.2 | Story B
# [batch:7]
7.1 | Story C
EOF
    run stories_get_all_batches
    assert_success
    assert_line -n 0 "5"
    assert_line -n 1 "7"
    # Only 2 lines total
    [[ ${#lines[@]} -eq 2 ]]
}

@test "stories_get_all_batches: supports decimal batch numbers" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:31]
31.1 | Story A
# [batch:31.5]
31.2 | Story B
# [batch:32]
32.1 | Story C
EOF
    run stories_get_all_batches
    assert_success
    assert_line -n 0 "31"
    assert_line -n 1 "31.5"
    assert_line -n 2 "32"
}

@test "stories_get_all_batches: returns empty for no batches" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
1.1 | Unbatched story
2.1 | Another story
EOF
    run stories_get_all_batches
    assert_success
    # Output should be empty (just a single empty line from printf of empty array)
    [[ -z "${output// /}" ]] || [[ "${#lines[@]}" -eq 0 ]]
}

# ── Decimal batch support in stories_get_batch_members ───────────────────────

@test "stories_get_batch_members: matches decimal batch number" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:31.5]
31.2 | Decimal Batch Story
31.3 | Another Decimal Story
EOF
    run stories_get_batch_members "31.5"
    assert_success
    assert_line -n 0 "31.2"
    assert_line -n 1 "31.3"
}

@test "stories_get_batch_members: decimal and integer batches don't cross-match" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:31]
31.1 | Integer Batch
# [batch:31.5]
31.2 | Decimal Batch
EOF
    run stories_get_batch_members "31"
    assert_success
    assert_output "31.1"

    run stories_get_batch_members "31.5"
    assert_success
    assert_output "31.2"
}

# ── Decimal batch support in stories_get_batch ───────────────────────────────

@test "stories_get_batch: returns decimal batch number for a story" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:31.5]
31.2 | Story In Decimal Batch
EOF
    run stories_get_batch "31.2"
    assert_success
    assert_output "31.5"
}

# ── stories_get_unbatched with decimal regex ─────────────────────────────────

@test "stories_get_unbatched: ignores stories under decimal batches" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
1.1 | Unbatched
# [batch:31.5]
31.2 | Batched
EOF
    run stories_get_unbatched
    assert_success
    assert_output "1.1"
}

# ── High batch numbers in stories_get_batch_members ──────────────────────────

@test "stories_get_batch_members: works with high batch numbers" {
    cat > "$RALPH_STORIES_FILE" <<'EOF'
# [batch:29]
29.1 | Story A
29.2 | Story B
# [batch:39]
39.1 | Story C
EOF
    run stories_get_batch_members "29"
    assert_success
    assert_line -n 0 "29.1"
    assert_line -n 1 "29.2"

    run stories_get_batch_members "39"
    assert_success
    assert_output "39.1"
}
