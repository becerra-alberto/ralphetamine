#!/usr/bin/env bash
# Ralph v2 — Story queue management (stories.txt parsing)

RALPH_STORIES_FILE=".ralph/stories.txt"

# Parse stories.txt and return story IDs (respecting skip/comments)
# Format: "10.1 | Smart Number Formatting"
#          "x 10.2 | Skipped Story"        ← skipped
#          "# comment"                      ← ignored
#          "# [batch:1]"                    ← batch annotation (metadata)
stories_list_all() {
    if [[ ! -f "$RALPH_STORIES_FILE" ]]; then
        log_error "Stories file not found: $RALPH_STORIES_FILE"
        return 1
    fi

    while IFS= read -r line; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        # Skip lines prefixed with 'x'
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue

        # Extract story ID (first field before |)
        local id
        id=$(echo "$line" | sed 's/|.*//' | xargs)
        [[ -n "$id" ]] && echo "$id"
    done < "$RALPH_STORIES_FILE"
}

# Return all story lines with their full info (id | title), excluding skipped/comments
stories_list_details() {
    if [[ ! -f "$RALPH_STORIES_FILE" ]]; then
        return 1
    fi

    while IFS= read -r line; do
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue
        echo "$line"
    done < "$RALPH_STORIES_FILE"
}

# Get title for a story ID from stories.txt
stories_get_title() {
    local target_id="$1"

    while IFS= read -r line; do
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue

        local id
        id=$(echo "$line" | sed 's/|.*//' | xargs)
        if [[ "$id" == "$target_id" ]]; then
            echo "$line" | sed 's/^[^|]*|[[:space:]]*//'
            return 0
        fi
    done < "$RALPH_STORIES_FILE"

    return 1
}

# Find the next uncompleted story
stories_find_next() {
    local resume_from="${1:-}"
    local found_resume=false

    # If no resume point, start from beginning
    [[ -z "$resume_from" ]] && found_resume=true

    while IFS= read -r line; do
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue

        local id
        id=$(echo "$line" | sed 's/|.*//' | xargs)

        # Handle resume: skip until we find the resume point
        if [[ "$found_resume" == false ]]; then
            [[ "$id" == "$resume_from" ]] && found_resume=true
            [[ "$found_resume" == false ]] && continue
        fi

        # Return first non-completed story
        if ! state_is_completed "$id"; then
            echo "$id"
            return 0
        fi
    done < "$RALPH_STORIES_FILE"

    return 1
}

# Count total stories (excluding skipped)
stories_count_total() {
    stories_list_all | wc -l | xargs
}

# Count completed stories in the current queue (intersects state with stories.txt)
stories_count_completed() {
    local count=0
    while IFS= read -r id; do
        state_is_completed "$id" && count=$((count + 1))
    done < <(stories_list_all)
    echo "$count"
}

# Count remaining stories
stories_count_remaining() {
    local total remaining=0
    while IFS= read -r id; do
        state_is_completed "$id" || remaining=$((remaining + 1))
    done < <(stories_list_all)
    echo "$remaining"
}

# Get batch number for a story (from [batch:N] annotations)
stories_get_batch() {
    local target_id="$1"
    local current_batch=""

    while IFS= read -r line; do
        # Track batch annotations
        if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*\[batch:([0-9]+(\.[0-9]+)*)\] ]]; then
            current_batch="${BASH_REMATCH[1]}"
            continue
        fi

        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue

        local id
        id=$(echo "$line" | sed 's/|.*//' | xargs)
        if [[ "$id" == "$target_id" ]]; then
            echo "${current_batch:-0}"
            return 0
        fi
    done < "$RALPH_STORIES_FILE"

    echo "0"
}

# Get all stories in a given batch
stories_get_batch_members() {
    local target_batch="$1"
    local current_batch=""

    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*\[batch:([0-9]+(\.[0-9]+)*)\] ]]; then
            current_batch="${BASH_REMATCH[1]}"
            continue
        fi

        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue

        if [[ "$current_batch" == "$target_batch" ]]; then
            local id
            id=$(echo "$line" | sed 's/|.*//' | xargs)
            echo "$id"
        fi
    done < "$RALPH_STORIES_FILE"
}

# Get stories with no [batch:N] annotation above them
stories_get_unbatched() {
    local current_batch=""
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*\[batch:([0-9]+(\.[0-9]+)*)\] ]]; then
            current_batch="${BASH_REMATCH[1]}"
            continue
        fi
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^[[:space:]]*x[[:space:]] ]] && continue
        if [[ -z "$current_batch" ]]; then
            local id
            id=$(echo "$line" | sed 's/|.*//' | xargs)
            echo "$id"
        fi
    done < "$RALPH_STORIES_FILE"
}

# Return sorted list of distinct batch numbers found in stories.txt
stories_get_all_batches() {
    local batches=()
    local seen=""
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*\[batch:([0-9]+(\.[0-9]+)*)\] ]]; then
            local b="${BASH_REMATCH[1]}"
            # Deduplicate
            if [[ " $seen " != *" $b "* ]]; then
                batches+=("$b")
                seen="$seen $b"
            fi
        fi
    done < "$RALPH_STORIES_FILE"
    printf '%s\n' "${batches[@]}"
}

# Append a story to stories.txt
stories_append() {
    local id="$1"
    local title="$2"
    echo "$id | $title" >> "$RALPH_STORIES_FILE"
    log_debug "Appended story $id to stories.txt"
}
