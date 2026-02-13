#!/usr/bin/env bash
# Ralph v2 — Template loading and variable substitution engine

RALPH_TEMPLATES_DIR=""

# Initialize template directory (project-local first, then ralph install)
prompt_init() {
    if [[ -d ".ralph/templates" ]]; then
        RALPH_TEMPLATES_DIR=".ralph/templates"
    else
        RALPH_TEMPLATES_DIR="${RALPH_DIR}/templates"
    fi
    log_debug "Template dir: $RALPH_TEMPLATES_DIR"
}

# Load a template file by name (e.g., "implement" loads implement.md)
prompt_load_template() {
    local name="$1"
    local template_path="${RALPH_TEMPLATES_DIR}/${name}.md"

    if [[ ! -f "$template_path" ]]; then
        # Fallback to ralph install directory
        template_path="${RALPH_DIR}/templates/${name}.md"
    fi

    if [[ ! -f "$template_path" ]]; then
        log_error "Template not found: ${name}.md"
        return 1
    fi

    cat "$template_path"
}

# Substitute {{VAR}} placeholders in a template string
# Usage: prompt_substitute "$template" VAR1=value1 VAR2=value2
prompt_substitute() {
    local template="$1"
    shift

    for pair in "$@"; do
        local key="${pair%%=*}"
        local value="${pair#*=}"
        template="${template//\{\{$key\}\}/$value}"
    done

    echo "$template"
}

# Process {{#if VAR}}...{{/if}} conditionals
# If VAR is non-empty, keep the block; otherwise remove it
# NOTE: Nested {{#if}} on different variables is single-level only.
# Nesting the same depth works for skipping (inner #if increments nesting
# counter), but true multi-variable nesting (e.g., {{#if A}} ... {{#if B}})
# where A is truthy and B is falsy will not correctly skip B's block.
# For that case, flatten the conditionals or restructure the template.
prompt_process_conditionals() {
    local template="$1"
    shift

    # Store variable names and values in parallel indexed arrays (Bash 3.2 safe)
    local _cond_keys=()
    local _cond_vals=()
    for pair in "$@"; do
        _cond_keys+=("${pair%%=*}")
        _cond_vals+=("${pair#*=}")
    done

    # Process each conditional block
    # This uses a simple line-by-line approach since bash doesn't have multiline regex
    local result=""
    local skip_until=""
    local nesting=0

    while IFS= read -r line; do
        # Check for {{#if VAR}}
        if [[ "$line" =~ \{\{#if[[:space:]]+([A-Za-z_]+)\}\} ]]; then
            local var_name="${BASH_REMATCH[1]}"
            # Look up var_name in parallel arrays
            local _found_val=""
            local _ci
            for (( _ci=0; _ci<${#_cond_keys[@]}; _ci++ )); do
                if [[ "${_cond_keys[$_ci]}" == "$var_name" ]]; then
                    _found_val="${_cond_vals[$_ci]}"
                    break
                fi
            done
            if [[ -z "$_found_val" ]]; then
                skip_until="$var_name"
                nesting=1
                continue
            fi
            # Variable is set, remove the tag line but keep content
            continue
        fi

        # Check for {{/if}}
        if [[ "$line" =~ \{\{/if\}\} ]]; then
            if [[ -n "$skip_until" ]]; then
                nesting=$((nesting - 1))
                if [[ $nesting -eq 0 ]]; then
                    skip_until=""
                fi
            fi
            continue
        fi

        # Skip lines inside false conditionals
        if [[ -n "$skip_until" ]]; then
            # Handle nested ifs inside skipped blocks
            if [[ "$line" =~ \{\{#if ]]; then
                nesting=$((nesting + 1))
            fi
            continue
        fi

        result+="$line"$'\n'
    done <<< "$template"

    echo "$result"
}

# Extract unique file targets from a spec's "Files to Create/Modify" section.
# Prefers fenced paths like: - `path/to/file.ext` — description
prompt_extract_spec_target_paths() {
    local spec_path="$1"
    [[ -f "$spec_path" ]] || return 0

    awk '
        BEGIN { in_files=0 }
        {
            lower = tolower($0)
        }
        lower ~ /^#{2,6}[[:space:]]+files to create\/modify([[:space:]:].*)?$/ {
            in_files=1
            next
        }
        in_files && /^#{1,6}[[:space:]]+/ {
            in_files=0
        }
        in_files {
            if (match($0, /`[^`]+`/)) {
                path = substr($0, RSTART + 1, RLENGTH - 2)
                gsub(/^[[:space:]]+|[[:space:]]+$/, "", path)
                if (length(path) > 0) print path
            }
        }
    ' "$spec_path" | awk '!seen[$0]++'
}

# Build the full implementation prompt for a story
prompt_build() {
    local story_id="$1"
    local spec_path="$2"

    prompt_init

    local spec_content
    spec_content=$(spec_read "$spec_path") || return 1

    local title
    title=$(stories_get_title "$story_id" 2>/dev/null || spec_get_title "$spec_path")

    # Build validation commands string
    local validation_cmds=""
    local blocked_cmds=""
    local validation_json
    validation_json=$(config_get_json '.validation.commands')

    if [[ "$validation_json" != "null" && "$validation_json" != "[]" ]]; then
        validation_cmds=$(echo "$validation_json" | jq -r '.[] | "   - Run '\''"+.cmd+"'\'' for "+.name' 2>/dev/null)
    fi

    local blocked_json
    blocked_json=$(config_get_json '.validation.blocked_commands')
    if [[ "$blocked_json" != "null" && "$blocked_json" != "[]" ]]; then
        blocked_cmds=$(echo "$blocked_json" | jq -r '.[] | "   - NEVER run '\''"+.+"'\''"' 2>/dev/null)
    fi

    # Build commit format
    local commit_format
    commit_format=$(config_get '.commit.format' 'feat(story-{{id}}): {{title}}')
    commit_format="${commit_format//\{\{id\}\}/$story_id}"
    commit_format="${commit_format//\{\{title\}\}/$title}"

    # Build commit staging guidance (scope staging to story files only).
    local commit_stage_instructions=""
    local commit_stage_paths=()
    local commit_stage_paths_json
    commit_stage_paths_json=$(config_get_json '.commit.stage_paths')

    if [[ "$commit_stage_paths_json" != "null" && "$commit_stage_paths_json" != "[]" ]]; then
        mapfile -t commit_stage_paths < <(
            echo "$commit_stage_paths_json" | jq -r '.[]' 2>/dev/null | sed '/^$/d'
        )
    fi

    if [[ ${#commit_stage_paths[@]} -eq 0 ]]; then
        mapfile -t commit_stage_paths < <(prompt_extract_spec_target_paths "$spec_path")
    fi

    if [[ ${#commit_stage_paths[@]} -gt 0 ]]; then
        local stage_cmd="git add --"
        local stage_path
        local stage_path_lines=""
        for stage_path in "${commit_stage_paths[@]}"; do
            stage_cmd+=" $(printf '%q' "$stage_path")"
            stage_path_lines+="     - \`$stage_path\`"$'\n'
        done
        commit_stage_instructions="   - Stage ONLY story target files (never use \`git add -A\` or \`git add .\`):"$'\n'"$stage_path_lines""   - Run: \`$stage_cmd\`"
    else
        commit_stage_instructions="   - Never use \`git add -A\` or \`git add .\`. Stage only story-related files by naming each path explicitly with \`git add -- <path>\`."
    fi

    # Collect learnings if enabled
    local learnings=""
    if [[ "$(config_get '.learnings.enabled' 'true')" == "true" ]]; then
        local max_count
        max_count=$(config_get '.learnings.max_inject_count' '5')
        if type learnings_select_relevant &>/dev/null; then
            learnings=$(learnings_select_relevant "$spec_content" "$max_count" 2>/dev/null)
        fi
    fi

    # Load and populate template
    local template
    template=$(prompt_load_template "implement") || return 1

    template=$(prompt_substitute "$template" \
        "STORY_ID=$story_id" \
        "TITLE=$title" \
        "SPEC_CONTENT=$spec_content" \
        "VALIDATION_COMMANDS=$validation_cmds" \
        "BLOCKED_COMMANDS=$blocked_cmds" \
        "COMMIT_MESSAGE=$commit_format" \
        "COMMIT_STAGE_INSTRUCTIONS=$commit_stage_instructions" \
        "LEARNINGS=$learnings"
    )

    # Process conditionals
    template=$(prompt_process_conditionals "$template" \
        "VALIDATION_COMMANDS=$validation_cmds" \
        "BLOCKED_COMMANDS=$blocked_cmds" \
        "COMMIT_STAGE_INSTRUCTIONS=$commit_stage_instructions" \
        "LEARNINGS=$learnings"
    )

    echo "$template"
}

# Build the test review prompt for a story
prompt_build_test_review() {
    local story_id="$1"
    local spec_path="$2"

    prompt_init

    local spec_content
    spec_content=$(spec_read "$spec_path") || return 1

    local title
    title=$(stories_get_title "$story_id" 2>/dev/null || spec_get_title "$spec_path")

    local template
    template=$(prompt_load_template "test-review") || return 1

    template=$(prompt_substitute "$template" \
        "STORY_ID=$story_id" \
        "TITLE=$title" \
        "SPEC_CONTENT=$spec_content"
    )

    echo "$template"
}
