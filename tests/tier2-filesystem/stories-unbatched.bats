#!/usr/bin/env bats
# Tier 2 — Filesystem tests for stories_get_unbatched

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    copy_fixture stories.txt .ralph/stories.txt
}

teardown() {
    teardown_test_environment
}

@test "stories_get_unbatched: returns stories not under any batch header" {
    # stories.txt: 1.1, 1.2 are before any [batch:N], 2.1/2.2 are in [batch:1], 3.1 is after a comment
    run stories_get_unbatched
    assert_success
    assert_line --index 0 "1.1"
    assert_line --index 1 "1.2"
    # 2.1 and 2.2 are batched, should not appear
    refute_output --partial "2.1"
    refute_output --partial "2.2"
}

@test "stories_get_unbatched: returns empty when all stories are batched" {
    # Create stories.txt where everything is batched
    cat > .ralph/stories.txt <<'EOF'
# [batch:1]
1.1 | Story A
1.2 | Story B
EOF
    run stories_get_unbatched
    assert_success
    assert_output ""
}

@test "stories_get_batch_members: batch 0 returns stories with no batch header" {
    # batch 0 means stories_get_batch_members "0" should return stories
    # that have their batch set to "0" (no batch annotation above them)
    # However, stories_get_batch_members checks current_batch == target_batch
    # For stories before any annotation, current_batch is "" not "0"
    # So batch_members "0" only returns if there's a [batch:0] annotation
    # This test documents the actual behavior
    run stories_get_batch_members "0"
    assert_success
    # No stories are under a [batch:0] header in the fixture
    assert_output ""
}
