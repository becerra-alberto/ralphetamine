#!/bin/bash
# Ralph v2 — State management (state.json read/write)

RALPH_STATE_DIR=".ralph"
RALPH_STATE_FILE="$RALPH_STATE_DIR/state.json"

state_init() {
    mkdir -p "$RALPH_STATE_DIR"

    if [[ -f "$RALPH_STATE_FILE" ]]; then
        log_debug "State file exists: $RALPH_STATE_FILE"
        return 0
    fi

    # Check for legacy progress.txt to bootstrap from
    if [[ -f "progress.txt" ]]; then
        log_info "Initializing state from legacy progress.txt"
        _state_init_from_progress
    else
        _state_write_empty
    fi
}

_state_write_empty() {
    cat > "$RALPH_STATE_FILE" << 'EOF'
{
    "completed_stories": [],
    "current_story": null,
    "retry_count": 0
}
EOF
    log_debug "Created empty state file"
}

_state_init_from_progress() {
    local completed=()
    while IFS= read -r line; do
        if [[ "$line" =~ ^\[DONE\]\ Story\ ([0-9]+\.[0-9]+) ]]; then
            local story="${BASH_REMATCH[1]}"
            local found=false
            for s in "${completed[@]}"; do
                [[ "$s" == "$story" ]] && found=true && break
            done
            [[ "$found" == false ]] && completed+=("$story")
        fi
    done < "progress.txt"

    local completed_json="[]"
    if [[ ${#completed[@]} -gt 0 ]]; then
        completed_json=$(printf '%s\n' "${completed[@]}" | jq -R . | jq -s .)
    fi

    jq -n --argjson completed "$completed_json" '{
        completed_stories: $completed,
        current_story: null,
        retry_count: 0
    }' > "$RALPH_STATE_FILE"

    log_info "State initialized with ${#completed[@]} completed stories"
}

state_get_completed() {
    if [[ ! -f "$RALPH_STATE_FILE" ]]; then
        echo ""
        return
    fi
    jq -r '.completed_stories[]' "$RALPH_STATE_FILE" 2>/dev/null || echo ""
}

state_completed_count() {
    if [[ ! -f "$RALPH_STATE_FILE" ]]; then
        echo "0"
        return
    fi
    jq '.completed_stories | length' "$RALPH_STATE_FILE" 2>/dev/null || echo "0"
}

state_is_completed() {
    local story="$1"
    state_get_completed | grep -q "^${story}$"
}

state_set_current() {
    local story="$1"
    jq --arg story "$story" '.current_story = $story' "$RALPH_STATE_FILE" > "${RALPH_STATE_FILE}.tmp"
    mv "${RALPH_STATE_FILE}.tmp" "$RALPH_STATE_FILE"
}

state_get_current() {
    jq -r '.current_story // empty' "$RALPH_STATE_FILE" 2>/dev/null
}

state_mark_done() {
    local story="$1"
    jq --arg story "$story" '
        .completed_stories += [$story]
        | .completed_stories |= unique
        | .current_story = null
        | .retry_count = 0
    ' "$RALPH_STATE_FILE" > "${RALPH_STATE_FILE}.tmp"
    mv "${RALPH_STATE_FILE}.tmp" "$RALPH_STATE_FILE"
    log_success "Story $story marked as DONE"
}

state_get_retry_count() {
    jq '.retry_count // 0' "$RALPH_STATE_FILE" 2>/dev/null || echo "0"
}

state_increment_retry() {
    local story="$1"
    jq --arg story "$story" '
        .retry_count = (.retry_count // 0) + 1
        | .current_story = $story
    ' "$RALPH_STATE_FILE" > "${RALPH_STATE_FILE}.tmp"
    mv "${RALPH_STATE_FILE}.tmp" "$RALPH_STATE_FILE"
}

state_reset_retries() {
    jq '.retry_count = 0' "$RALPH_STATE_FILE" > "${RALPH_STATE_FILE}.tmp"
    mv "${RALPH_STATE_FILE}.tmp" "$RALPH_STATE_FILE"
}
