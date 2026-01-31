#!/bin/bash
# Ralph v2 — Parse structured <ralph> tags from Claude output

# Parse DONE signal: <ralph>DONE X.X</ralph>
# Returns story ID on success, empty on failure
signals_parse_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>DONE[[:space:]]+([0-9]+\.[0-9]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    # Legacy fallback: [DONE] Story X.X
    if [[ "$output" =~ \[DONE\][[:space:]]*Story[[:space:]]+([0-9]+\.[0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    return 1
}

# Parse FAIL signal: <ralph>FAIL X.X: reason</ralph>
# Outputs "story_id|reason" on success
signals_parse_fail() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>FAIL[[:space:]]+([0-9]+\.[0-9]+):[[:space:]]*([^\<]+)\</ralph\> ]]; then
        local fail_reason="${BASH_REMATCH[2]}"
        # Sanitize pipe characters to avoid collision with our story|reason delimiter
        fail_reason="${fail_reason//|/-}"
        echo "${BASH_REMATCH[1]}|${fail_reason}"
        return 0
    fi

    # Legacy fallback: [FAIL] Story X.X - reason
    if [[ "$output" =~ \[FAIL\][[:space:]]*Story[[:space:]]+([0-9]+\.[0-9]+)[[:space:]]*-[[:space:]]*(.*) ]]; then
        local fail_reason="${BASH_REMATCH[2]}"
        fail_reason="${fail_reason//|/-}"
        echo "${BASH_REMATCH[1]}|${fail_reason}"
        return 0
    fi

    return 1
}

# Parse LEARN signals: <ralph>LEARN: text</ralph>
# Returns each learning on a separate line
signals_parse_learnings() {
    local output="$1"

    echo "$output" | grep -oE '<ralph>LEARN:[[:space:]]*[^<]+</ralph>' | \
        sed 's/<ralph>LEARN:[[:space:]]*//' | \
        sed 's/<\/ralph>//'
}

# Parse TEST_REVIEW_DONE signal: <ralph>TEST_REVIEW_DONE X.X: result</ralph>
signals_parse_test_review_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>TEST_REVIEW_DONE[[:space:]]+([0-9]+\.[0-9]+):[[:space:]]*([^\<]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}|${BASH_REMATCH[2]}"
        return 0
    fi

    return 1
}

# Parse MERGE_DONE signal: <ralph>MERGE_DONE: resolved N conflicts</ralph>
signals_parse_merge_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>MERGE_DONE:[[:space:]]*([^\<]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    return 1
}

# Parse MERGE_FAIL signal: <ralph>MERGE_FAIL: reason</ralph>
signals_parse_merge_fail() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>MERGE_FAIL:[[:space:]]*([^\<]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    return 1
}

# Check if output contains any completion signal (DONE or FAIL)
signals_has_completion() {
    local output="$1"

    signals_parse_done "$output" >/dev/null 2>&1 && return 0
    signals_parse_fail "$output" >/dev/null 2>&1 && return 0
    return 1
}
