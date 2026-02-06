#!/usr/bin/env bats
# Tier 4 — Workflow tests for engine fixes (sequential)
# Covers: timeout cleanup, error cleanup, output capture format,
# skip-on-max-retry, and child process cleanup.

# Helper: write a minimal config.json
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
        "enabled": false,
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

# Helper: write a story spec
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

# Helper: write stories.txt
_write_stories() {
    cat > .ralph/stories.txt <<'TXT'
1.1 | First Story
1.2 | Second Story
TXT
}

# Helper: init minimal project with git
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

# Helper: mock timeout as a real command
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
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "prompt"
    source_ralph_lib "signals"
    source_ralph_lib "hooks"
    source_ralph_lib "runner"

    config_load

    _mock_timeout_passthrough
}

teardown() {
    if [[ -n "${CHILD_PID_FILE:-}" && -f "${CHILD_PID_FILE}" ]]; then
        local pid
        pid=$(cat "${CHILD_PID_FILE}" 2>/dev/null || true)
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    fi
    cleanup_mocks
    teardown_test_environment
}

@test "Timeout cleanup removes partial changes" {
    create_mock_command "claude" '
# Dirty a tracked file and create an untracked file
printf "\nDIRTY_LINE" >> "specs/epic-1/story-1.1-test-story.md"
printf "temp" > "tmp-timeout-file.txt"
exit 124
'

    # Allow at least 2 retries so runner doesn't exit with failure
    jq ".loop.max_retries = 2" .ralph/config.json > .ralph/config.json.tmp && mv .ralph/config.json.tmp .ralph/config.json
    config_load

    run _run_sequential 1 5 false false "1.1" ""
    assert_success

    # Tracked file should be reverted
    run grep -n "DIRTY_LINE" specs/epic-1/story-1.1-test-story.md
    [ "$status" -ne 0 ]
    # Untracked file should be removed
    [ ! -f "tmp-timeout-file.txt" ]
}

@test "Non-zero exit cleanup removes partial changes" {
    create_mock_command "claude" '
printf "\nDIRTY_LINE" >> "specs/epic-1/story-1.1-test-story.md"
printf "temp" > "tmp-error-file.txt"
exit 1
'

    jq ".loop.max_retries = 2" .ralph/config.json > .ralph/config.json.tmp && mv .ralph/config.json.tmp .ralph/config.json
    config_load

    run _run_sequential 1 5 false false "1.1" ""
    assert_success

    run grep -n "DIRTY_LINE" specs/epic-1/story-1.1-test-story.md
    [ "$status" -ne 0 ]
    [ ! -f "tmp-error-file.txt" ]
}

@test "Sequential output capture requires stream-json format" {
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
else
    echo "missing format"
fi
exit 0
'

    # max_retries=1 ensures a missing format causes test failure
    jq ".loop.max_retries = 1" .ralph/config.json > .ralph/config.json.tmp && mv .ralph/config.json.tmp .ralph/config.json
    config_load

    run _run_sequential 1 5 false false "1.1" ""
    assert_success
    assert_file_contains ".ralph/last-claude-output.txt" "<ralph>DONE 1.1</ralph>"
    assert_json_field ".ralph/state.json" ".completed_stories[0]" "1.1"
}

@test "Skip-on-max-retry continues to next story" {
    # Enable skip_on_max_retry and max_retries=1
    jq '.loop.max_retries = 1 | .loop.skip_on_max_retry = true' .ralph/config.json > .ralph/config.json.tmp && mv .ralph/config.json.tmp .ralph/config.json
    config_load

    create_mock_command "claude" '
# FAIL 1.1, DONE 1.2
for arg in "$@"; do
    if [[ "$arg" =~ Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        STORY_ID="${BASH_REMATCH[1]}"
        break
    fi
done
if [[ "$STORY_ID" == "1.1" ]]; then
    echo "<ralph>FAIL 1.1: forced failure</ralph>"
else
    echo "<ralph>DONE 1.2</ralph>"
fi
'

    run _run_sequential 2 5 false false "" ""
    assert_success

    # 1.2 should be done (skip behavior may or may not mark 1.1 completed)
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    if ! echo "$completed" | grep -q "^1.2$"; then
        echo "1.2 not completed" >&2
        return 1
    fi
}

@test "Timeout cleanup kills orphaned child process" {
    # Mock timeout to always return 124 while leaving child alive
    create_mock_command "timeout" 'shift; "$@"; exit 124'
    prereqs_timeout_cmd() { echo "timeout"; }

    export CHILD_PID_FILE="${BATS_TEST_TMPDIR}/child.pid"
    create_mock_command "claude" '
# Spawn a child and exit immediately
sleep 300 &
echo $! > "$CHILD_PID_FILE"
exit 0
'

    jq ".loop.max_retries = 2" .ralph/config.json > .ralph/config.json.tmp && mv .ralph/config.json.tmp .ralph/config.json
    config_load

    run _run_sequential 1 5 false false "1.1" ""
    assert_success

    local pid
    pid=$(cat "$CHILD_PID_FILE" 2>/dev/null || true)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        echo "child process still running: $pid" >&2
        return 1
    fi
}
