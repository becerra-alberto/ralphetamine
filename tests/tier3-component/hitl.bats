#!/usr/bin/env bats
# Tier 3 — Component tests for hitl.sh (HITL review generation and feedback)

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    scaffold_ralph_project

    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "hitl"

    config_load
    state_init

    # Mock 'open' command to prevent browser launch
    create_mock_command "open" 'exit 0'
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "hitl_extract_from_spec: Format A extracts simple bullet ACs" {
    # story-1.1 has simple bullet ACs: "Project builds successfully", etc.
    run hitl_extract_from_spec "specs/epic-1/story-1.1-initialize-project.md"
    assert_success

    # Output should be JSON with items array
    echo "$output" | jq -e '.items' >/dev/null
    local item_count
    item_count=$(echo "$output" | jq '.items | length')
    [ "$item_count" -ge 2 ]

    # Should contain expected AC items
    echo "$output" | jq -r '.items[]' | grep -q "Project builds successfully"
}

@test "hitl_extract_from_spec: Format B extracts Given/When/Then AC items" {
    # Create a spec with Given/When/Then format
    cat > specs/epic-1/story-1.2-gwt.md <<'EOF'
---
id: "1.2"
status: done
priority: high
title: "GWT Feature"
---
# Story 1.2: GWT Feature

## Acceptance Criteria
### AC1: User can login
- **Given** the user is on the login page
- **When** they enter valid credentials
- **Then** they are redirected to the dashboard
- They see a welcome message

### AC2: Error handling
- **Given** invalid credentials
- **When** user submits form
- **Then** an error message is displayed
EOF

    run hitl_extract_from_spec "specs/epic-1/story-1.2-gwt.md"
    assert_success

    # Should have extracted Then items
    echo "$output" | jq -e '.items' >/dev/null
    local item_count
    item_count=$(echo "$output" | jq '.items | length')
    [ "$item_count" -ge 2 ]

    # Should contain items from Then blocks
    echo "$output" | jq -r '.items[]' | grep -qi "redirect\|dashboard\|error\|welcome"
}

@test "hitl_extract_from_spec: fallback uses title when no ACs present" {
    # Create a spec without AC section
    cat > specs/epic-1/story-1.3-no-ac.md <<'EOF'
---
id: "1.3"
status: done
title: "Missing AC Feature"
---
# Story 1.3: Missing AC Feature

## Description
This spec has no acceptance criteria section.
EOF

    run hitl_extract_from_spec "specs/epic-1/story-1.3-no-ac.md"
    assert_success

    # Should fall back to "Verify: <title>"
    echo "$output" | jq -r '.items[0]' | grep -q "Verify:"
}

@test "hitl_extract_epic_header: extracts from README, prd, or folder fallback" {
    # Create a README.md in epic-1 dir
    echo "# User Authentication" > specs/epic-1/README.md

    run hitl_extract_epic_header "1"
    assert_success
    assert_output "User Authentication"
}

@test "hitl_collect_run_data: outputs valid JSON for completed stories" {
    state_mark_done "1.1"
    run hitl_collect_run_data
    [ "$status" -eq 0 ]
    echo "$output" | jq -e '.' >/dev/null
}

@test "hitl_collect_run_data: returns empty array when no completed stories" {
    run hitl_collect_run_data
    [ "$status" -eq 0 ]
    # Output contains log_warn + the JSON; check that the JSON portion is []
    echo "$output" | grep -q '\[\]'
}

@test "hitl_generate_report: produces HTML with injected data" {
    state_mark_done "1.1"

    hitl_generate_report "test-output.html"

    [ -f "test-output.html" ]
    # HTML should contain the project name
    assert_file_contains "test-output.html" "test-project"
    # HTML should contain story data blob
    assert_file_contains "test-output.html" "1.1"
}

@test "hitl_generate_feedback_prd: generates markdown from evaluation JSON" {
    copy_fixture hitl-evaluation.json eval.json

    hitl_generate_feedback_prd "eval.json"

    [ -f "docs/hitl-remediation-prd.md" ]
    # Should contain failed story references
    assert_file_contains "docs/hitl-remediation-prd.md" "1.1"
    assert_file_contains "docs/hitl-remediation-prd.md" "2.1"
    # Should contain reviewer notes
    assert_file_contains "docs/hitl-remediation-prd.md" "Server starts on 3000"
}
