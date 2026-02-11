#!/usr/bin/env bats
# Tier 3 — Component tests for decompose.sh

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "prereqs"
    source_ralph_lib "signals"
    source_ralph_lib "prompt"
    source_ralph_lib "decompose"

    # Set up minimal project structure
    mkdir -p .ralph specs/epic-3
    copy_fixture config.json .ralph/config.json
    copy_fixture state-empty.json .ralph/state.json
    _state_ensure_schema
    config_load

    # Create a stories.txt with one story
    cat > .ralph/stories.txt <<'EOF'
3.1 | Test story
3.2 | Another story
EOF

    # Create a spec file
    cat > specs/epic-3/story-3.1-test.md <<'EOF'
---
id: "3.1"
title: "Test Story"
status: "pending"
---
# Test Story
## Acceptance Criteria
- [ ] Something works
EOF

    touch progress.txt
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

# ── story_id_next_child ─────────────────────────────────────────────────────

@test "story_id_next_child: returns .1 when no children exist" {
    run story_id_next_child "3.1"
    assert_success
    assert_output "3.1.1"
}

@test "story_id_next_child: finds next available child number" {
    # Add existing children
    cat > .ralph/stories.txt <<'EOF'
3.1 | Parent story
3.1.1 | First child
3.1.2 | Second child
3.2 | Another story
EOF
    run story_id_next_child "3.1"
    assert_success
    assert_output "3.1.3"
}

@test "story_id_next_child: skips crossed-out stories" {
    cat > .ralph/stories.txt <<'EOF'
3.1 | Parent story
3.1.1 | First child
x 3.1.2 | Skipped child
3.1.3 | Third child
EOF
    run story_id_next_child "3.1"
    assert_success
    assert_output "3.1.4"
}

# ── _decompose_insert_stories ────────────────────────────────────────────────

@test "_decompose_insert_stories: inserts children after parent" {
    _decompose_insert_stories "3.1" "3.1.1" "3.1.2"
    # Verify order: 3.1, then 3.1.1, 3.1.2, then 3.2
    local lines
    lines=$(cat .ralph/stories.txt)
    local line1 line2 line3 line4
    line1=$(echo "$lines" | sed -n '1p' | sed 's/|.*//' | xargs)
    line2=$(echo "$lines" | sed -n '2p' | sed 's/|.*//' | xargs)
    line3=$(echo "$lines" | sed -n '3p' | sed 's/|.*//' | xargs)
    line4=$(echo "$lines" | sed -n '4p' | sed 's/|.*//' | xargs)
    [[ "$line1" == "3.1" ]]
    [[ "$line2" == "3.1.1" ]]
    [[ "$line3" == "3.1.2" ]]
    [[ "$line4" == "3.2" ]]
}

@test "_decompose_insert_stories: appends if parent not found" {
    _decompose_insert_stories "99.1" "99.1.1" "99.1.2"
    # Children should be at the end
    local last_lines
    last_lines=$(tail -2 .ralph/stories.txt)
    echo "$last_lines" | grep -q "99.1.1" || return 1
    echo "$last_lines" | grep -q "99.1.2" || return 1
}

@test "_decompose_insert_stories: children have decomposed-from annotation" {
    _decompose_insert_stories "3.1" "3.1.1" "3.1.2"
    assert_file_contains .ralph/stories.txt "decomposed from 3.1"
}

# ── decompose_story: depth guard ─────────────────────────────────────────────

@test "decompose_story: refuses at max depth" {
    # Default max_depth is 2, so depth 2 (four-level: 3.1.1.1) should be refused
    # But a three-level ID at depth 1 is still under limit
    # Create a four-level spec to test depth=2
    mkdir -p specs/epic-3
    cat > specs/epic-3/story-3.1.1.1-deep.md <<'EOF'
---
id: "3.1.1.1"
title: "Deep Story"
status: "pending"
---
# Deep Story
EOF
    run decompose_story "3.1.1.1" "specs/epic-3/story-3.1.1.1-deep.md" "test"
    assert_failure
}

# ── decompose_story: already decomposed ──────────────────────────────────────

@test "decompose_story: refuses if already decomposed" {
    state_mark_decomposed "3.1" "3.1.1" "3.1.2"
    run decompose_story "3.1" "specs/epic-3/story-3.1-test.md" "test"
    assert_failure
}

# ── decompose_story: disabled by config ──────────────────────────────────────

@test "decompose_story: skips when decomposition disabled" {
    # Override config to disable decomposition
    local config_content
    config_content=$(cat .ralph/config.json)
    echo "$config_content" | jq '.decomposition.enabled = false' > .ralph/config.json
    _CONFIG=""  # Reset cached config
    config_load

    run decompose_story "3.1" "specs/epic-3/story-3.1-test.md" "test"
    assert_failure
}

# ── decompose_story: successful decomposition with mock claude ───────────────

@test "decompose_story: parses substories from mock claude output" {
    # Create a mock claude that outputs substory blocks
    create_mock_command "claude" 'cat <<CLAUDE_EOF
I will decompose this story into sub-stories.

<ralph>SUBSTORY_START 3.1.1</ralph>
---
id: "3.1.1"
title: "First sub-task"
status: "pending"
depends_on: []
---

# First Sub-Task

## Context
First part of the work.

## Acceptance Criteria
- [ ] First criterion
<ralph>SUBSTORY_END 3.1.1</ralph>
<ralph>SUBSTORY_START 3.1.2</ralph>
---
id: "3.1.2"
title: "Second sub-task"
status: "pending"
depends_on: []
---

# Second Sub-Task

## Context
Second part of the work.

## Acceptance Criteria
- [ ] Second criterion
<ralph>SUBSTORY_END 3.1.2</ralph>

<ralph>DECOMPOSE_DONE 3.1: 2 sub-stories</ralph>
CLAUDE_EOF'

    # Mock gtimeout/timeout to just run the command
    create_mock_command "gtimeout" '"${@:2}"'

    run decompose_story "3.1" "specs/epic-3/story-3.1-test.md" "test failure"
    assert_success

    # Verify spec files were created
    [[ -f specs/epic-3/story-3.1.1-first-sub-task.md ]]
    [[ -f specs/epic-3/story-3.1.2-second-sub-task.md ]]

    # Verify stories.txt was updated
    assert_file_contains .ralph/stories.txt "3.1.1"
    assert_file_contains .ralph/stories.txt "3.1.2"

    # Verify state was updated
    run state_is_decomposed "3.1"
    assert_success

    run state_is_completed "3.1"
    assert_success

    # Verify progress.txt was updated
    assert_file_contains progress.txt "DECOMPOSED"
}

@test "decompose_story: handles DECOMPOSE_FAIL signal" {
    create_mock_command "claude" 'echo "<ralph>DECOMPOSE_FAIL 3.1: story is already atomic</ralph>"'
    create_mock_command "gtimeout" '"${@:2}"'

    run decompose_story "3.1" "specs/epic-3/story-3.1-test.md" "test"
    assert_failure
}
