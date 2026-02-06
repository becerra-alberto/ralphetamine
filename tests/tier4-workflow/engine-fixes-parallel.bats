#!/usr/bin/env bats
# Tier 4 — Workflow tests for engine fixes (parallel)
# Covers: output capture format and progress.txt logging in parallel runs.

_write_config() {
    cat > .ralph/config.json <<'JSON'
{
    "version": "2.0.0",
    "project": { "name": "engine-fix-tests" },
    "specs": {
        "pattern": "specs/epic-{{epic}}/story-{{id}}-*.md",
        "id_format": "epic.story",
        "frontmatter_status_field": "status"
    },
    "loop": {
        "max_iterations": 0,
        "timeout_seconds": 5,
        "max_retries": 1
    },
    "validation": { "commands": [], "blocked_commands": [] },
    "claude": { "flags": ["--print", "--dangerously-skip-permissions"] },
    "commit": { "format": "feat(story-{{id}}): {{title}}", "auto_commit": false },
    "testing_phase": { "enabled": false, "timeout_seconds": 600 },
    "learnings": { "enabled": false, "max_inject_count": 0 },
    "parallel": {
        "enabled": true,
        "max_concurrent": 2,
        "strategy": "worktree",
        "auto_merge": false,
        "merge_review_timeout": 900,
        "stagger_seconds": 0
    },
    "caffeine": false,
    "hooks": { "pre_iteration": "", "post_iteration": "", "pre_story": "", "post_story": "" }
}
JSON
}

_write_story_spec() {
    local id="$1"
    local title="$2"
    local epic="${id%%.*}"
    local slug="test-story"
    mkdir -p "specs/epic-${epic}"
    cat > "specs/epic-${epic}/story-${id}-${slug}.md" <<EOF_SPEC
---
id: "${id}"
epic: ${epic}
title: "${title}"
status: pending
---

# Story ${id}: ${title}

## User Story
As a user, I want ${title}.

## Acceptance Criteria
- [ ] Works as expected.
EOF_SPEC
}

_write_stories() {
    cat > .ralph/stories.txt <<'TXT'
# [batch:1]
1.1 | First Story
1.2 | Second Story
TXT
}

_init_project() {
    mkdir -p .ralph/learnings
    _write_config
    _write_stories
    _write_story_spec "1.1" "First Story"
    _write_story_spec "1.2" "Second Story"
    echo '{}' > .ralph/learnings/_index.json
    touch progress.txt

    git init -q .
    git add -A
    git commit -q -m "scaffold" --allow-empty
}

_mock_timeout_passthrough() {
    create_mock_command "timeout" 'shift; "$@"; exit $?'
    prereqs_timeout_cmd() { echo "timeout"; }
}

setup() {
    load "../helpers/setup.bash"
    load "../helpers/mocks.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    _init_project

    source_ralph_lib "ui"
    source_ralph_lib "prereqs"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "prompt"
    source_ralph_lib "signals"
    source_ralph_lib "hooks"
    source_ralph_lib "runner"
    source_ralph_lib "parallel"

    config_load

    _mock_timeout_passthrough
    prereqs_require_bash4() { return 0; }
}

teardown() {
    cleanup_mocks
    teardown_test_environment
}

@test "Parallel output capture requires stream-json format" {
    create_mock_command "claude" '
HAS_FORMAT=false
NEXT_IS_FORMAT=false
for arg in "$@"; do
    if [[ "$NEXT_IS_FORMAT" == "true" ]]; then
        [[ "$arg" == "stream-json" ]] && HAS_FORMAT=true
        NEXT_IS_FORMAT=false
        continue
    fi
    if [[ "$arg" == "--output-format" ]]; then
        NEXT_IS_FORMAT=true
    fi
    if [[ "$arg" == "--output-format=stream-json" ]]; then
        HAS_FORMAT=true
    fi
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
    fi
done
STORY_ID="${STORY_ID:-1.1}"
if [[ "$HAS_FORMAT" == "true" ]]; then
    echo "{\"type\":\"result\",\"content\":\"<ralph>DONE ${STORY_ID}</ralph>\"}"
fi
exit 0
'

    run parallel_run 5 false false
    assert_success

    # Both stories should be marked done
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    if ! echo "$completed" | grep -q "^1.1$"; then
        echo "1.1 not completed" >&2
        return 1
    fi
    if ! echo "$completed" | grep -q "^1.2$"; then
        echo "1.2 not completed" >&2
        return 1
    fi

    # Output files should be non-empty
    [ -s ".ralph/worktrees/output-1.1.txt" ]
    [ -s ".ralph/worktrees/output-1.2.txt" ]
}

@test "Parallel run writes progress entries" {
    create_mock_command "claude" '
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
STORY_ID="${STORY_ID:-1.1}"
echo "<ralph>DONE ${STORY_ID}</ralph>"
'

    run parallel_run 5 false false
    assert_success

    assert_file_contains "progress.txt" "[DONE] Story 1.1"
    assert_file_contains "progress.txt" "[DONE] Story 1.2"
}
