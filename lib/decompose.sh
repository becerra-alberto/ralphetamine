#!/usr/bin/env bash
# Ralphetamine — Story decomposition engine
# Breaks failed stories into 2-4 smaller sub-stories via Claude.

# ── Hierarchical ID helpers ──────────────────────────────────────────

# Count depth of a story ID. Two-level (3.1) = 0, three-level (3.1.1) = 1, etc.
story_id_depth() {
    local id="$1"
    local dots="${id//[^.]}"
    echo $(( ${#dots} - 1 ))
}

# Get the parent ID: 3.1.1 → 3.1, 3.1 → "" (no parent at two-level)
story_id_parent() {
    local id="$1"
    if [[ "$id" == *.*.* ]]; then
        echo "${id%.*}"
    else
        echo ""
    fi
}

# Find the next available child number for a parent.
# Scans stories.txt for existing children and returns parent.N+1.
story_id_next_child() {
    local parent="$1"
    local max_child=0

    if [[ -f ".ralph/stories.txt" ]]; then
        while IFS= read -r line; do
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue
            local sid
            sid=$(echo "$line" | sed 's/|.*//' | xargs)
            # Check if this is a direct child of parent
            if [[ "$sid" == "${parent}."* ]]; then
                local suffix="${sid#${parent}.}"
                # Only direct children (no further dots)
                if [[ "$suffix" =~ ^[0-9]+$ ]]; then
                    [[ "$suffix" -gt "$max_child" ]] && max_child="$suffix"
                fi
            fi
        done < ".ralph/stories.txt"
    fi

    echo "${parent}.$(( max_child + 1 ))"
}

# ── Core decomposition function ──────────────────────────────────────

# Decompose a failed story into sub-stories.
# Returns 0 on success (sub-stories created), 1 on failure.
decompose_story() {
    local story_id="$1"
    local spec_path="$2"
    local reason="${3:-}"

    # Check config
    local enabled
    enabled=$(config_get '.decomposition.enabled' 'true')
    if [[ "$enabled" != "true" ]]; then
        log_debug "Decomposition disabled by config"
        return 1
    fi

    # Check depth guard
    local max_depth
    max_depth=$(config_get '.decomposition.max_depth' '2')
    local current_depth
    current_depth=$(story_id_depth "$story_id")
    if [[ $current_depth -ge $max_depth ]]; then
        log_warn "Story $story_id at depth $current_depth (max: $max_depth) — refusing to decompose further"
        return 1
    fi

    # Check if already decomposed
    if state_is_decomposed "$story_id" 2>/dev/null; then
        log_warn "Story $story_id already decomposed — skipping"
        return 1
    fi

    log_info "Attempting decomposition of story $story_id"

    # Gather context
    local spec_content=""
    if [[ -f "$spec_path" ]]; then
        spec_content=$(head -c 10000 "$spec_path" 2>/dev/null) || true
    fi

    local failure_history=""
    if [[ -f "progress.txt" ]]; then
        failure_history=$(grep "$story_id" progress.txt 2>/dev/null | tail -20) || true
    fi

    local last_output=""
    if [[ -f ".ralph/last-claude-output.txt" ]]; then
        last_output=$(tail -c 10000 ".ralph/last-claude-output.txt" 2>/dev/null) || true
        # Extract text from JSON envelope if needed
        if echo "$last_output" | jq -e '.type == "result"' &>/dev/null 2>&1; then
            last_output=$(echo "$last_output" | jq -r '.result // ""' | tail -c 10000)
        fi
    fi

    local learnings=""
    if [[ -d ".ralph/learnings" ]]; then
        for f in .ralph/learnings/*.md; do
            [[ -f "$f" ]] || continue
            local relevant
            relevant=$(grep -i "$story_id" "$f" 2>/dev/null | head -5) || true
            [[ -n "$relevant" ]] && learnings="${learnings}${relevant}\n"
        done
    fi

    local retry_count
    retry_count=$(state_get_retry_count 2>/dev/null || echo "0")

    # Load and populate template
    local template
    if ! template=$(prompt_load_template "decompose" 2>/dev/null); then
        log_error "No decompose template found"
        return 1
    fi

    template=$(prompt_substitute "$template" \
        "STORY_ID=$story_id" \
        "SPEC_CONTENT=$spec_content" \
        "FAILURE_HISTORY=$failure_history" \
        "LAST_OUTPUT=$last_output" \
        "LEARNINGS=$learnings" \
        "RETRY_COUNT=$retry_count"
    )

    # Build claude command
    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)
    local decomp_timeout
    decomp_timeout=$(config_get '.decomposition.timeout_seconds' '600')

    local output_file=".ralph/last-decompose-output.txt"
    local exit_code=0

    $timeout_cmd "$decomp_timeout" claude "${claude_flags[@]}" "$template" \
        < /dev/null 2>&1 | cat > "$output_file" || exit_code=$?

    local raw_result
    raw_result=$(cat "$output_file" 2>/dev/null) || true

    # Extract text from JSON envelope
    local result="$raw_result"
    if echo "$raw_result" | jq -e '.type == "result"' &>/dev/null 2>&1; then
        result=$(echo "$raw_result" | jq -r '.result // ""')
    fi

    # Extract learnings from both raw JSON and extracted result.
    local learnings_input="$result"
    if [[ -n "$raw_result" && "$raw_result" != "$result" ]]; then
        learnings_input="${raw_result}"$'\n'"${result}"
    fi
    if type learnings_extract &>/dev/null && [[ -n "$learnings_input" ]]; then
        learnings_extract "$learnings_input" "$story_id" || true
    fi

    # Check for DECOMPOSE_FAIL
    local fail_info
    if fail_info=$(signals_parse_decompose_fail "$result"); then
        local fail_reason="${fail_info#*|}"
        log_warn "Decomposition agent declined: $fail_reason"
        return 1
    fi

    # Check for DECOMPOSE_DONE
    local done_info
    if ! done_info=$(signals_parse_decompose_done "$result"); then
        log_warn "Decomposition agent produced no completion signal"
        return 1
    fi

    # Parse SUBSTORY blocks
    local substory_output
    substory_output=$(signals_parse_substories "$result")

    if [[ -z "$substory_output" ]]; then
        log_error "Decomposition produced no substory blocks"
        return 1
    fi

    # Process substory blocks
    local children=()
    local block_count=0
    local current_id=""
    local current_content=""

    while IFS= read -r line; do
        if [[ "$line" =~ ^===SUBSTORY:(.+)=== ]]; then
            current_id="${BASH_REMATCH[1]}"
            current_content=""
            continue
        fi
        if [[ "$line" == "===END_SUBSTORY===" ]]; then
            if [[ -n "$current_id" && -n "$current_content" ]]; then
                # Validate: sub-story ID must start with parent ID
                if [[ "$current_id" != "${story_id}."* ]]; then
                    log_warn "Sub-story $current_id doesn't start with parent $story_id — skipping"
                    current_id=""
                    current_content=""
                    continue
                fi

                # Write spec file
                local epic="${story_id%%.*}"
                local spec_dir="specs/epic-${epic}"
                mkdir -p "$spec_dir"

                # Extract slug from title in frontmatter
                local slug
                slug=$(echo "$current_content" | grep -m1 '^title:' | sed 's/^title:[[:space:]]*"*//' | sed 's/"*$//' | \
                    tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | head -c 40) || true
                [[ -z "$slug" ]] && slug="sub-$(echo "$current_id" | tr '.' '-')"

                local spec_file="${spec_dir}/story-${current_id}-${slug}.md"
                echo "$current_content" > "$spec_file"
                log_info "Created spec: $spec_file"

                children+=("$current_id")
                block_count=$((block_count + 1))
            fi
            current_id=""
            current_content=""
            continue
        fi
        if [[ -n "$current_id" ]]; then
            if [[ -n "$current_content" ]]; then
                current_content="${current_content}
${line}"
            else
                current_content="$line"
            fi
        fi
    done <<< "$substory_output"

    # Validate count
    if [[ $block_count -lt 2 || $block_count -gt 4 ]]; then
        log_warn "Expected 2-4 sub-stories, got $block_count"
        if [[ $block_count -eq 0 ]]; then
            return 1
        fi
        # Allow 1 or 5+ but warn — don't fail hard
    fi

    # Insert sub-stories into stories.txt immediately after parent
    _decompose_insert_stories "$story_id" "${children[@]}"

    # Mark parent as decomposed in state
    state_mark_decomposed "$story_id" "${children[@]}"

    # Log to progress.txt
    local timestamp
    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
    echo "[DECOMPOSED] Story $story_id → ${children[*]} - $timestamp" >> progress.txt 2>/dev/null || true

    log_success "Story $story_id decomposed into ${#children[@]} sub-stories: ${children[*]}"
    return 0
}

# Insert sub-story IDs into stories.txt immediately after the parent story.
# This preserves execution order — sub-stories run right after their parent
# would have run, not at the end of the queue.
_decompose_insert_stories() {
    local parent_id="$1"
    shift
    local children=("$@")

    local stories_file=".ralph/stories.txt"
    [[ ! -f "$stories_file" ]] && return 1

    local tmp_file="${stories_file}.tmp"
    local inserted=false

    while IFS= read -r line; do
        echo "$line"
        # Check if this line is the parent story
        if [[ "$inserted" == false ]]; then
            local sid
            sid=$(echo "$line" | sed 's/|.*//' | xargs)
            if [[ "$sid" == "$parent_id" ]]; then
                # Insert children immediately after parent
                for child in "${children[@]}"; do
                    echo "$child | (decomposed from $parent_id)"
                done
                inserted=true
            fi
        fi
    done < "$stories_file" > "$tmp_file"

    # If parent wasn't found in stories.txt, append at end
    if [[ "$inserted" == false ]]; then
        for child in "${children[@]}"; do
            echo "$child | (decomposed from $parent_id)"
        done >> "$tmp_file"
    fi

    mv "$tmp_file" "$stories_file"
}
