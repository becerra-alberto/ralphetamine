#!/bin/bash
# Ralphetamine Test Helpers — Test environment management

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RALPH_DIR="$(cd "$TESTS_DIR/.." && pwd)"

# Load BATS helpers
load "${TESTS_DIR}/libs/bats-support/load.bash"
load "${TESTS_DIR}/libs/bats-assert/load.bash"

# Create isolated temp dir, cd into it, silence logging
setup_test_environment() {
    TEST_WORK_DIR="${BATS_TEST_TMPDIR}/ralph-$$"
    mkdir -p "$TEST_WORK_DIR"
    cd "$TEST_WORK_DIR"
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    export RALPH_DIR
}

# Remove the temp dir
teardown_test_environment() {
    if [[ -n "${TEST_WORK_DIR:-}" && -d "$TEST_WORK_DIR" ]]; then
        rm -rf "$TEST_WORK_DIR"
    fi
}

# Copy a fixture into the test working directory
# Usage: copy_fixture config.json .ralph/config.json
copy_fixture() {
    local name="$1"
    local dest="${2:-$name}"
    local dest_dir
    dest_dir=$(dirname "$dest")
    mkdir -p "$dest_dir"
    cp "${TESTS_DIR}/fixtures/${name}" "$dest"
}

# Source a Ralph library module with RALPH_DIR set correctly
# Usage: source_ralph_lib signals
source_ralph_lib() {
    local module="$1"
    source "${RALPH_DIR}/lib/${module}.sh"
}

# Scaffold a complete .ralph/ project structure for workflow tests
scaffold_ralph_project() {
    mkdir -p .ralph/learnings
    mkdir -p specs/epic-1 specs/epic-2

    copy_fixture config.json .ralph/config.json
    copy_fixture stories.txt .ralph/stories.txt
    copy_fixture state-empty.json .ralph/state.json
    copy_fixture specs/epic-1/story-1.1-initialize-project.md specs/epic-1/story-1.1-initialize-project.md
    copy_fixture specs/epic-1/story-1.2-setup-database.md specs/epic-1/story-1.2-setup-database.md
    copy_fixture specs/epic-2/story-2.1-first-parallel.md specs/epic-2/story-2.1-first-parallel.md
    copy_fixture specs/epic-2/story-2.3-with-depends.md specs/epic-2/story-2.3-with-depends.md

    # Initialize learnings
    echo '{}' > .ralph/learnings/_index.json

    # Initialize progress.txt
    touch progress.txt

    # Initialize git repo (some tests need git context)
    git init -q .
    git config user.name "Test"
    git config user.email "test@test.com"
    git add -A
    git commit -q -m "test scaffold" --allow-empty
}
