#!/usr/bin/env bash
# Ralph v2 — Parse structured <ralph> tags from Claude output

# Parse DONE signal: <ralph>DONE X.X</ralph>
# Scans entire output and returns the LAST match (authoritative signal).
signals_parse_done() {
    local output="$1"
    local last_id=""

    # Scan for all <ralph>DONE X.X</ralph> tags
    local match
    while IFS= read -r match; do
        [[ -n "$match" ]] && last_id="$match"
    done < <(echo "$output" | grep -oE '<ralph>DONE[[:space:]]+[0-9]+\.[0-9]+</ralph>' \
        | sed 's/<ralph>DONE[[:space:]]*//' | sed 's/<\/ralph>//')

    if [[ -n "$last_id" ]]; then
        echo "$last_id"
        return 0
    fi

    # Legacy fallback: [DONE] Story X.X (last match)
    while IFS= read -r match; do
        [[ -n "$match" ]] && last_id="$match"
    done < <(echo "$output" | grep -oE '\[DONE\][[:space:]]*Story[[:space:]]+[0-9]+\.[0-9]+' \
        | grep -oE '[0-9]+\.[0-9]+')

    if [[ -n "$last_id" ]]; then
        echo "$last_id"
        return 0
    fi

    return 1
}

# Parse FAIL signal: <ralph>FAIL X.X: reason</ralph>
# Scans entire output and returns the LAST match (authoritative signal).
# Outputs "story_id|reason" on success
signals_parse_fail() {
    local output="$1"
    local last_result=""

    # Scan for all <ralph>FAIL X.X: reason</ralph> tags
    local match
    while IFS= read -r match; do
        [[ -z "$match" ]] && continue
        # Extract ID and reason from the matched tag
        if [[ "$match" =~ FAIL[[:space:]]+([0-9]+\.[0-9]+):[[:space:]]*(.*)\</ralph\> ]]; then
            local fail_reason="${BASH_REMATCH[2]}"
            fail_reason="${fail_reason//|/-}"
            last_result="${BASH_REMATCH[1]}|${fail_reason}"
        fi
    done < <(echo "$output" | grep -oE '<ralph>FAIL[[:space:]]+[0-9]+\.[0-9]+:[[:space:]]*[^<]+</ralph>')

    if [[ -n "$last_result" ]]; then
        echo "$last_result"
        return 0
    fi

    # Legacy fallback: [FAIL] Story X.X - reason (last match)
    while IFS= read -r match; do
        [[ -z "$match" ]] && continue
        if [[ "$match" =~ \[FAIL\][[:space:]]*Story[[:space:]]+([0-9]+\.[0-9]+)[[:space:]]*-[[:space:]]*(.*) ]]; then
            local fail_reason="${BASH_REMATCH[2]}"
            fail_reason="${fail_reason//|/-}"
            last_result="${BASH_REMATCH[1]}|${fail_reason}"
        fi
    done < <(echo "$output" | grep -oE '\[FAIL\][[:space:]]*Story[[:space:]]+[0-9]+\.[0-9]+ - .*')

    if [[ -n "$last_result" ]]; then
        echo "$last_result"
        return 0
    fi

    return 1
}

# Parse LEARN signals: <ralph>LEARN: text</ralph>
# Returns each learning on a separate line.
# Handles multi-line LEARN tags by collapsing newlines before matching.
signals_parse_learnings() {
    local output="$1"

    # Use bash ANSI-C quoting ($'\x1f') to create the actual unit separator byte.
    # BSD tr on macOS doesn't support \xNN hex escapes — it would interpret
    # '\x1f' as the literal characters \, x, 1, f, eating 'f' from output.
    local US=$'\x1f'
    echo "$output" | tr '\n' "$US" | \
        grep -oE '<ralph>LEARN:[[:space:]]*[^<]+</ralph>' | \
        sed 's/<ralph>LEARN:[[:space:]]*//' | \
        sed 's/<\/ralph>//' | \
        tr "$US" '\n' || true
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
