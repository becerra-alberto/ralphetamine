#!/usr/bin/env bash
# Ralphetamine — Parse structured <ralph> tags from Claude output
# Story IDs are hierarchical: X.X, X.X.X, X.X.X.X, etc.

# Shared story ID pattern for grep -oE (ERE)
_RALPH_STORY_ID_RE='[0-9]+\.[0-9]+(\.[0-9]+)*'

# Parse DONE signal: <ralph>DONE X.X</ralph>
# Scans entire output and returns the LAST match (authoritative signal).
signals_parse_done() {
    local output="$1"
    local last_id=""

    # Scan for all <ralph>DONE X.X</ralph> tags
    local match
    while IFS= read -r match; do
        [[ -n "$match" ]] && last_id="$match"
    done < <(echo "$output" | grep -oE "<ralph>DONE[[:space:]]+${_RALPH_STORY_ID_RE}</ralph>" \
        | sed 's/<ralph>DONE[[:space:]]*//' | sed 's/<\/ralph>//')

    if [[ -n "$last_id" ]]; then
        echo "$last_id"
        return 0
    fi

    # Legacy fallback: [DONE] Story X.X (last match)
    while IFS= read -r match; do
        [[ -n "$match" ]] && last_id="$match"
    done < <(echo "$output" | grep -oE "\[DONE\][[:space:]]*Story[[:space:]]+${_RALPH_STORY_ID_RE}" \
        | grep -oE "${_RALPH_STORY_ID_RE}")

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
        if [[ "$match" =~ FAIL[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*):[[:space:]]*(.*)\</ralph\> ]]; then
            local fail_reason="${BASH_REMATCH[3]}"
            fail_reason="${fail_reason//|/-}"
            last_result="${BASH_REMATCH[1]}|${fail_reason}"
        fi
    done < <(echo "$output" | grep -oE "<ralph>FAIL[[:space:]]+${_RALPH_STORY_ID_RE}:[[:space:]]*[^<]+</ralph>")

    if [[ -n "$last_result" ]]; then
        echo "$last_result"
        return 0
    fi

    # Legacy fallback: [FAIL] Story X.X - reason (last match)
    while IFS= read -r match; do
        [[ -z "$match" ]] && continue
        if [[ "$match" =~ \[FAIL\][[:space:]]*Story[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*)[[:space:]]*-[[:space:]]*(.*) ]]; then
            local fail_reason="${BASH_REMATCH[3]}"
            fail_reason="${fail_reason//|/-}"
            last_result="${BASH_REMATCH[1]}|${fail_reason}"
        fi
    done < <(echo "$output" | grep -oE "\[FAIL\][[:space:]]*Story[[:space:]]+${_RALPH_STORY_ID_RE} - .*")

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
    local extracted=""

    extracted=$(echo "$output" | tr '\n' "$US" | \
        grep -oE '<ralph>LEARN:[[:space:]]*[^<]+</ralph>' | \
        sed 's/<ralph>LEARN:[[:space:]]*//' | \
        sed 's/<\/ralph>//' | \
        tr "$US" '\n' || true)

    if [[ -n "$extracted" ]]; then
        printf '%s\n' "$extracted"
        return 0
    fi

    # Fallback: when Claude is run with --output-format json, LEARN tags may be
    # present in streamed JSON events rather than the final .result payload.
    local json_strings
    json_strings=$(echo "$output" | jq -r '
        select((.type? // "") != "user" and (.role? // "") != "user")
        | [
            .result?,
            .message.content[]?.text?,
            .content[]?.text?,
            .delta?.text?,
            .text?
        ]
        | .[]
        | strings
    ' 2>/dev/null || true)

    if [[ -z "$json_strings" ]]; then
        json_strings=$(echo "$output" | jq -Rr '
            fromjson?
            | select((.type? // "") != "user" and (.role? // "") != "user")
            | [
                .result?,
                .message.content[]?.text?,
                .content[]?.text?,
                .delta?.text?,
                .text?
            ]
            | .[]
            | strings
        ' 2>/dev/null || true)
    fi

    [[ -z "$json_strings" ]] && return 0

    echo "$json_strings" | tr '\n' "$US" | \
        grep -oE '<ralph>LEARN:[[:space:]]*[^<]+</ralph>' | \
        sed 's/<ralph>LEARN:[[:space:]]*//' | \
        sed 's/<\/ralph>//' | \
        tr "$US" '\n' || true
}

# Parse TEST_REVIEW_DONE signal: <ralph>TEST_REVIEW_DONE X.X: result</ralph>
signals_parse_test_review_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>TEST_REVIEW_DONE[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*):[[:space:]]*([^\<]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}|${BASH_REMATCH[3]}"
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

# Parse TIMEOUT_POSTMORTEM_DONE signal: <ralph>TIMEOUT_POSTMORTEM_DONE X.X</ralph>
signals_parse_timeout_postmortem_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>TIMEOUT_POSTMORTEM_DONE[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}"
        return 0
    fi

    return 1
}

# Parse DECOMPOSE_DONE signal: <ralph>DECOMPOSE_DONE X.X: N sub-stories</ralph>
signals_parse_decompose_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>DECOMPOSE_DONE[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*):[[:space:]]*([^\<]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}|${BASH_REMATCH[3]}"
        return 0
    fi

    return 1
}

# Parse DECOMPOSE_FAIL signal: <ralph>DECOMPOSE_FAIL X.X: reason</ralph>
signals_parse_decompose_fail() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>DECOMPOSE_FAIL[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*):[[:space:]]*([^\<]+)\</ralph\> ]]; then
        echo "${BASH_REMATCH[1]}|${BASH_REMATCH[3]}"
        return 0
    fi

    return 1
}

# Parse SUBSTORY blocks from decomposition output
# Each block: <ralph>SUBSTORY_START X.X.X</ralph> ... <ralph>SUBSTORY_END X.X.X</ralph>
# Returns blocks on stdout, separated by a delimiter line.
signals_parse_substories() {
    local output="$1"
    local in_block=false
    local current_id=""
    local block_content=""

    while IFS= read -r line; do
        if [[ "$line" =~ \<ralph\>SUBSTORY_START[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*)\</ralph\> ]]; then
            in_block=true
            current_id="${BASH_REMATCH[1]}"
            block_content=""
            continue
        fi

        if [[ "$line" =~ \<ralph\>SUBSTORY_END[[:space:]]+([0-9]+\.[0-9]+(\.[0-9]+)*)\</ralph\> ]]; then
            if [[ "$in_block" == true && "${BASH_REMATCH[1]}" == "$current_id" ]]; then
                echo "===SUBSTORY:${current_id}==="
                echo "$block_content"
                echo "===END_SUBSTORY==="
            fi
            in_block=false
            current_id=""
            block_content=""
            continue
        fi

        if [[ "$in_block" == true ]]; then
            if [[ -n "$block_content" ]]; then
                block_content="${block_content}
${line}"
            else
                block_content="$line"
            fi
        fi
    done <<< "$output"
}

# Check if output contains any completion signal (DONE or FAIL)
signals_has_completion() {
    local output="$1"

    signals_parse_done "$output" >/dev/null 2>&1 && return 0
    signals_parse_fail "$output" >/dev/null 2>&1 && return 0
    return 1
}

# Parse DISCOVERY_DONE signal: <ralph>DISCOVERY_DONE: path/to/prd.md</ralph>
signals_parse_discovery_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>DISCOVERY_DONE:[[:space:]]*([^\<]+)\</ralph\> ]]; then
        local result="${BASH_REMATCH[1]}"
        # Trim leading/trailing whitespace
        result="${result#"${result%%[![:space:]]*}"}"
        result="${result%"${result##*[![:space:]]}"}"
        echo "$result"
        return 0
    fi

    return 1
}

# Parse E2E_SETUP_DONE signal: <ralph>E2E_SETUP_DONE: N files</ralph>
signals_parse_e2e_setup_done() {
    local output="$1"

    if [[ "$output" =~ \<ralph\>E2E_SETUP_DONE:[[:space:]]*([^\<]+)\</ralph\> ]]; then
        local result="${BASH_REMATCH[1]}"
        # Trim leading/trailing whitespace
        result="${result#"${result%%[![:space:]]*}"}"
        result="${result%"${result##*[![:space:]]}"}"
        echo "$result"
        return 0
    fi

    return 1
}
