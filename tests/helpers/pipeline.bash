#!/bin/bash
# Ralph v2 Test Helpers — Pipeline E2E scaffold and assertions
# Used by tier5-e2e tests with the "Notely" mock PRD fixtures.

PIPELINE_FIXTURES_DIR="${TESTS_DIR}/fixtures/pipeline"

# Scaffold a complete pipeline project from the Notely fixtures
# Sets up .ralph/, specs/, and initializes git
scaffold_pipeline_project() {
    mkdir -p .ralph/learnings
    mkdir -p specs/epic-1 specs/epic-2 specs/epic-3 specs/epic-4

    # Core config files
    cp "${PIPELINE_FIXTURES_DIR}/config.json" .ralph/config.json
    cp "${PIPELINE_FIXTURES_DIR}/stories.txt" .ralph/stories.txt
    cp "${PIPELINE_FIXTURES_DIR}/state.json" .ralph/state.json

    # All spec files
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-1/story-1.1-init-project.md" specs/epic-1/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-1/story-1.2-note-crud.md" specs/epic-1/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-1/story-1.3-color-themes.md" specs/epic-1/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-2/story-2.1-search-engine.md" specs/epic-2/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-2/story-2.2-tag-management.md" specs/epic-2/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-2/story-2.3-search-filters.md" specs/epic-2/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-3/story-3.1-markdown-import.md" specs/epic-3/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-3/story-3.2-json-export.md" specs/epic-3/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-4/story-4.1-shortcuts.md" specs/epic-4/
    cp "${PIPELINE_FIXTURES_DIR}/specs/epic-4/story-4.2-performance.md" specs/epic-4/

    # Initialize learnings
    echo '{}' > .ralph/learnings/_index.json

    # Initialize git repo
    git init -q .
    git add -A
    git commit -q -m "notely scaffold" --allow-empty

    touch progress.txt
    touch hooks-log.txt
}

# Create a story-aware mock claude that routes to fixture files based on story ID.
# Parses the prompt argument to find the story ID pattern (Story X.X) and
# returns the corresponding fixture output.
#
# For story 1.2, tracks call count to simulate FAIL-then-DONE:
#   First call  → fail-1.2.txt
#   Second call → done-1.2.txt
#
# Usage: setup_pipeline_claude_mock
setup_pipeline_claude_mock() {
    local fixtures_dir="${PIPELINE_FIXTURES_DIR}/claude-outputs"
    local call_counter_dir="${BATS_TEST_TMPDIR}/claude-calls-$$"
    mkdir -p "$call_counter_dir"

    create_mock_command "claude" "
FIXTURES_DIR='${fixtures_dir}'
CALL_DIR='${call_counter_dir}'

# Parse all arguments to find story ID
STORY_ID=''
for arg in \"\$@\"; do
    if [[ \"\$arg\" =~ Story[[:space:]]+([0-9]+\\.[0-9]+) ]]; then
        STORY_ID=\"\${BASH_REMATCH[1]}\"
        break
    fi
done

# If no story ID found in args, check if it looks like a test review prompt
IS_TEST_REVIEW=false
for arg in \"\$@\"; do
    if [[ \"\$arg\" == *'test-review'* || \"\$arg\" == *'Test Review'* || \"\$arg\" == *'TEST_REVIEW'* || \"\$arg\" == *'review the test'* ]]; then
        IS_TEST_REVIEW=true
        break
    fi
done

if [[ -z \"\$STORY_ID\" ]]; then
    echo 'mock: no story ID found in prompt'
    exit 0
fi

# Track call count per story
CALL_FILE=\"\${CALL_DIR}/story-\${STORY_ID}\"
COUNT=0
if [[ -f \"\$CALL_FILE\" ]]; then
    COUNT=\$(cat \"\$CALL_FILE\")
fi
COUNT=\$((COUNT + 1))
echo \"\$COUNT\" > \"\$CALL_FILE\"

# Route to appropriate fixture
if [[ \"\$IS_TEST_REVIEW\" == true ]]; then
    FIXTURE=\"\${FIXTURES_DIR}/test-review-done-\${STORY_ID}.txt\"
    if [[ -f \"\$FIXTURE\" ]]; then
        cat \"\$FIXTURE\"
        exit 0
    fi
fi

# Story 1.2: first call fails, subsequent calls succeed
if [[ \"\$STORY_ID\" == '1.2' && \"\$COUNT\" -eq 1 ]]; then
    cat \"\${FIXTURES_DIR}/fail-1.2.txt\"
    exit 0
fi

# Default: look for done-X.X.txt
FIXTURE=\"\${FIXTURES_DIR}/done-\${STORY_ID}.txt\"
if [[ -f \"\$FIXTURE\" ]]; then
    cat \"\$FIXTURE\"
else
    echo \"mock: no fixture for story \$STORY_ID\"
fi
"
}

# Source all Ralph library modules needed for pipeline tests
source_pipeline_libs() {
    source_ralph_lib "ui"
    source_ralph_lib "prereqs"
    source_ralph_lib "config"
    source_ralph_lib "state"
    source_ralph_lib "stories"
    source_ralph_lib "specs"
    source_ralph_lib "prompt"
    source_ralph_lib "signals"
    source_ralph_lib "hooks"
    source_ralph_lib "learnings"
    source_ralph_lib "testing"
    source_ralph_lib "runner"
    source_ralph_lib "parallel"
}

# Assert a story is marked completed in state.json
assert_story_completed() {
    local id="$1"
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    if ! echo "$completed" | grep -q "^${id}$"; then
        echo "assert_story_completed: story $id not in completed_stories" >&2
        echo "  completed: $completed" >&2
        return 1
    fi
}

# Assert a story is NOT marked completed
assert_story_not_completed() {
    local id="$1"
    local completed
    completed=$(jq -r '.completed_stories[]' .ralph/state.json 2>/dev/null || true)
    if echo "$completed" | grep -q "^${id}$"; then
        echo "assert_story_not_completed: story $id unexpectedly in completed_stories" >&2
        return 1
    fi
}

# Assert a hook fired with the expected result
assert_hook_fired() {
    local id="$1"
    local result="$2"
    if [[ ! -f hooks-log.txt ]]; then
        echo "assert_hook_fired: hooks-log.txt does not exist" >&2
        return 1
    fi
    if ! grep -q "HOOK:${id}:${result}" hooks-log.txt; then
        echo "assert_hook_fired: HOOK:${id}:${result} not found" >&2
        echo "  contents:" >&2
        cat hooks-log.txt >&2
        return 1
    fi
}

# Assert a learning text is stored in the learnings directory
assert_learning_stored() {
    local text="$1"
    local found=false
    for f in .ralph/learnings/*.md; do
        [[ -f "$f" ]] || continue
        if grep -q "$text" "$f"; then
            found=true
            break
        fi
    done
    if [[ "$found" == false ]]; then
        echo "assert_learning_stored: learning not found: $text" >&2
        echo "  learnings dir contents:" >&2
        ls -la .ralph/learnings/ >&2
        for f in .ralph/learnings/*.md; do
            [[ -f "$f" ]] && echo "--- $f ---" >&2 && cat "$f" >&2
        done
        return 1
    fi
}
