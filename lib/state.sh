#!/usr/bin/env bash
# Ralphetamine — State management (state.json read/write)

RALPH_STATE_DIR=".ralph"
RALPH_STATE_FILE="$RALPH_STATE_DIR/state.json"

_state_safe_write() {
    local jq_expr="$1"; shift
    local tmp_file="${RALPH_STATE_FILE}.tmp"
    if ! jq "$@" "$jq_expr" "$RALPH_STATE_FILE" > "$tmp_file" 2>/dev/null; then
        log_error "State write failed: jq error"
        rm -f "$tmp_file"
        return 1
    fi
    if [[ ! -s "$tmp_file" ]] || ! jq empty "$tmp_file" 2>/dev/null; then
        log_error "State write failed: invalid output"
        rm -f "$tmp_file"
        return 1
    fi
    mv "$tmp_file" "$RALPH_STATE_FILE"
}

state_init() {
    mkdir -p "$RALPH_STATE_DIR"

    if [[ -f "$RALPH_STATE_FILE" ]]; then
        log_debug "State file exists: $RALPH_STATE_FILE"
        _state_ensure_schema
    elif [[ -f "progress.txt" ]]; then
        # Check for legacy progress.txt to bootstrap from
        log_info "Initializing state from legacy progress.txt"
        _state_init_from_progress
    else
        _state_write_empty
    fi

    # Initialize provenance tracking if the module is loaded
    if type provenance_init &>/dev/null; then
        provenance_init
    fi
}

_state_write_empty() {
    cat > "$RALPH_STATE_FILE" << 'EOF'
{
    "completed_stories": [],
    "absorbed_stories": {},
    "merged_stories": [],
    "decomposed_stories": {},
    "current_story": null,
    "retry_count": 0
}
EOF
    log_debug "Created empty state file"
}

_state_init_from_progress() {
    local completed=()
    while IFS= read -r line; do
        if [[ "$line" =~ ^\[DONE\]\ Story\ ([0-9]+\.[0-9]+(\.[0-9]+)*) ]]; then
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
    _state_safe_write '.current_story = $story' --arg story "$story" || return 1
}

state_get_current() {
    jq -r '.current_story // empty' "$RALPH_STATE_FILE" 2>/dev/null
}

state_mark_done() {
    local story="$1"
    _state_safe_write '
        .completed_stories += [$story]
        | .completed_stories |= unique
        | .current_story = null
        | .retry_count = 0
    ' --arg story "$story" || return 1
    log_success "Story $story marked as DONE"
}

state_get_retry_count() {
    jq '.retry_count // 0' "$RALPH_STATE_FILE" 2>/dev/null || echo "0"
}

state_increment_retry() {
    local story="$1"
    _state_safe_write '
        .retry_count = (.retry_count // 0) + 1
        | .current_story = $story
    ' --arg story "$story" || return 1
}

state_reset_retries() {
    _state_safe_write '.retry_count = 0' || return 1
}

# Mark a story as absorbed by another story.
# Adds to absorbed_stories map and completed_stories.
state_mark_absorbed() {
    local story="$1"
    local absorbed_by="$2"
    _state_safe_write '
        .absorbed_stories[$story] = $absorbed_by
        | .completed_stories += [$story]
        | .completed_stories |= unique
    ' --arg story "$story" --arg absorbed_by "$absorbed_by" || return 1
    log_info "Story $story marked as absorbed by $absorbed_by"
}

# Check if a story was absorbed
state_is_absorbed() {
    local story="$1"
    [[ ! -f "$RALPH_STATE_FILE" ]] && return 1
    local absorber
    absorber=$(jq -r --arg s "$story" '.absorbed_stories[$s] // empty' "$RALPH_STATE_FILE" 2>/dev/null)
    [[ -n "$absorber" ]]
}

# Get the story that absorbed a given story
state_absorbed_by() {
    local story="$1"
    [[ ! -f "$RALPH_STATE_FILE" ]] && return 1
    jq -r --arg s "$story" '.absorbed_stories[$s] // empty' "$RALPH_STATE_FILE" 2>/dev/null
}

# Mark a story as merged (branch merged into main)
state_mark_merged() {
    local story="$1"
    _state_safe_write '
        .merged_stories += [$story]
        | .merged_stories |= unique
    ' --arg story "$story" || return 1
    log_debug "Story $story marked as merged"
}

# Get list of merged stories
state_get_merged() {
    [[ ! -f "$RALPH_STATE_FILE" ]] && return 0
    jq -r '.merged_stories[]? // empty' "$RALPH_STATE_FILE" 2>/dev/null || true
}

# Ensure schema fields exist (idempotent upgrade for older state files)
_state_ensure_schema() {
    [[ ! -f "$RALPH_STATE_FILE" ]] && return 0
    local needs_update=false

    if ! jq -e '.absorbed_stories' "$RALPH_STATE_FILE" &>/dev/null; then
        needs_update=true
    fi
    if ! jq -e '.merged_stories' "$RALPH_STATE_FILE" &>/dev/null; then
        needs_update=true
    fi
    if ! jq -e '.decomposed_stories' "$RALPH_STATE_FILE" &>/dev/null; then
        needs_update=true
    fi

    if [[ "$needs_update" == true ]]; then
        _state_safe_write '
            .absorbed_stories //= {}
            | .merged_stories //= []
            | .decomposed_stories //= {}
        ' || return 1
        log_debug "State schema upgraded with absorbed/merged/decomposed fields"
    fi
}

# Mark a story as decomposed into children.
# The parent is added to completed_stories (it's "done" by decomposition).
# Children IDs are recorded for provenance.
state_mark_decomposed() {
    local story="$1"
    shift
    local children=("$@")

    local children_json
    children_json=$(printf '%s\n' "${children[@]}" | jq -R . | jq -s .)

    _state_safe_write '
        .decomposed_stories[$story] = $children
        | .completed_stories += [$story]
        | .completed_stories |= unique
        | .current_story = null
        | .retry_count = 0
    ' --arg story "$story" --argjson children "$children_json" || return 1
    log_info "Story $story decomposed into: ${children[*]}"
}

# Check if a story has been decomposed
state_is_decomposed() {
    local story="$1"
    [[ ! -f "$RALPH_STATE_FILE" ]] && return 1
    local children
    children=$(jq -r --arg s "$story" '.decomposed_stories[$s] // empty' "$RALPH_STATE_FILE" 2>/dev/null)
    [[ -n "$children" && "$children" != "null" ]]
}

# Get the children of a decomposed story
state_get_decomposition_children() {
    local story="$1"
    [[ ! -f "$RALPH_STATE_FILE" ]] && return 1
    jq -r --arg s "$story" '.decomposed_stories[$s][]? // empty' "$RALPH_STATE_FILE" 2>/dev/null
}
