#!/usr/bin/env bash
# Ralph v2 — HITL (Human-in-the-Loop) review page generator
# Parses completed specs' Acceptance Criteria into verification items
# and generates an interactive HTML review page.

# ── Priority mapping ──────────────────────────────────────────────
_hitl_map_priority() {
    local raw="$1"
    case "$(echo "$raw" | tr '[:upper:]' '[:lower:]')" in
        critical|crit) echo "CRIT" ;;
        high)          echo "HIGH" ;;
        medium|med)    echo "MED" ;;
        low)           echo "LOW" ;;
        *)             echo "MED" ;;
    esac
}

# ── Escape string for safe JSON embedding ─────────────────────────
_hitl_json_escape() {
    local s="$1"
    # Escape backslashes, double quotes, newlines, tabs
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\t'/\\t}"
    # Escape < and > for safe HTML embedding inside JS strings
    s="${s//</\\u003c}"
    s="${s//>/\\u003e}"
    echo "$s"
}

# ── Extract epic header from spec directory ───────────────────────
# Tries: README.md title, first story's epic context, or folder name
hitl_extract_epic_header() {
    local epic_num="$1"
    local spec_pattern
    spec_pattern=$(config_get '.specs.pattern' 'specs/epic-{{epic}}/story-{{id}}-*.md')

    # Derive the epic directory from the pattern
    local epic_dir
    epic_dir=$(echo "$spec_pattern" | sed "s|{{epic}}|$epic_num|g" | sed 's|/story-.*||')

    # Try README.md
    if [[ -f "$epic_dir/README.md" ]]; then
        local title
        title=$(grep -m1 '^#' "$epic_dir/README.md" | sed 's/^#*[[:space:]]*//')
        if [[ -n "$title" ]]; then
            echo "$title"
            return 0
        fi
    fi

    # Try PRD title
    if [[ -f "$epic_dir/prd.md" ]]; then
        local title
        title=$(grep -m1 '^#' "$epic_dir/prd.md" | sed 's/^#*[[:space:]]*//')
        if [[ -n "$title" ]]; then
            echo "$title"
            return 0
        fi
    fi

    # Try first story's title for epic context
    local first_spec
    first_spec=$(find "$epic_dir" -name "story-${epic_num}.*-*.md" 2>/dev/null | sort | head -1)
    if [[ -n "$first_spec" && -f "$first_spec" ]]; then
        # Extract epic title from story heading: "# Story X.X — Title" → use title pattern
        local heading
        heading=$(grep -m1 "^# Story" "$first_spec" 2>/dev/null || true)
        if [[ -n "$heading" ]]; then
            echo "Epic $epic_num"
            return 0
        fi
    fi

    # Fallback: folder name
    echo "Epic $epic_num"
}

# ── Extract verification items from a single spec ─────────────────
# Outputs a JSON object for one story.
hitl_extract_from_spec() {
    local spec_path="$1"

    if [[ ! -f "$spec_path" ]]; then
        log_warn "HITL: spec not found: $spec_path"
        return 1
    fi

    # ── Extract YAML frontmatter fields ───────────────────────────
    local story_id=""
    local priority=""
    local spec_status=""
    local title=""

    story_id=$(spec_get_field "$spec_path" "id" | sed 's/"//g; s/'\''//g')
    priority=$(spec_get_field "$spec_path" "priority")
    spec_status=$(spec_get_field "$spec_path" "status")
    title=$(spec_get_field "$spec_path" "title" | sed 's/"//g; s/'\''//g')

    local epic_num="${story_id%%.*}"
    local pri_mapped
    pri_mapped=$(_hitl_map_priority "$priority")

    # If no title from frontmatter, try heading
    if [[ -z "$title" ]]; then
        title=$(grep -m1 '^# Story' "$spec_path" | sed 's/^#[[:space:]]*Story[[:space:]]*[0-9]*\.[0-9]*[[:space:]]*[—–:-]*[[:space:]]*//')
    fi
    # Final fallback: derive from filename
    if [[ -z "$title" ]]; then
        title=$(spec_get_title "$spec_path")
    fi

    # ── Extract "changed" description ─────────────────────────────
    local changed=""

    # Try Technical Context section (first paragraph, truncated)
    changed=$(awk '/^## Technical Context/,/^## [^T]/' "$spec_path" \
        | grep -v '^##' \
        | sed '/^$/d' \
        | head -3 \
        | tr '\n' ' ' \
        | sed 's/[[:space:]]*$//' \
        | cut -c1-200)

    # Fallback: Files to Create/Modify section
    if [[ -z "$changed" ]]; then
        changed=$(awk '/^## Files to Create\/Modify/,/^## /' "$spec_path" \
            | grep -v '^##' \
            | grep -v '^$' \
            | head -5 \
            | tr '\n' '; ' \
            | sed 's/;[[:space:]]*$//' \
            | cut -c1-200)
    fi

    # Final fallback: story title
    if [[ -z "$changed" ]]; then
        changed="$title"
    fi

    # ── Extract Acceptance Criteria as verification items ─────────
    local items=()
    local ac_section=""

    # Extract AC section (between "## Acceptance Criteria" and next "## " that isn't AC)
    ac_section=$(awk '/^## Acceptance Criteria/,/^## [^A]/' "$spec_path" | grep -v '^## ')

    if [[ -n "$ac_section" ]]; then
        # Detect format: does it have ### AC headings? (Format B: Given/When/Then)
        if echo "$ac_section" | grep -q '^### AC'; then
            # Format B: Given/When/Then structured ACs
            # Strategy: for each AC block, collect Then content as items
            local current_ac_title=""
            local in_then=false
            local got_sub_bullets=false

            while IFS= read -r line; do
                # New AC heading: ### AC1: Title
                if [[ "$line" =~ ^###[[:space:]]+AC[0-9]+:?[[:space:]]*(.*) ]]; then
                    # Flush previous AC if it had a Then but no sub-bullets
                    if [[ -n "$current_ac_title" && "$got_sub_bullets" == false && "$in_then" == true ]]; then
                        # The previous AC had inline Then text only
                        : # already handled below
                    fi
                    current_ac_title="${BASH_REMATCH[1]}"
                    in_then=false
                    got_sub_bullets=false
                    continue
                fi

                # Detect "- **Then** inline text" (single-line Then with content)
                if [[ "$line" =~ ^-[[:space:]]+\*\*Then\*\*[[:space:]]+(.*) ]]; then
                    in_then=true
                    local inline_text="${BASH_REMATCH[1]}"
                    # Clean backticks for readability
                    inline_text=$(echo "$inline_text" | sed 's/\*\*//g')
                    if [[ -n "$inline_text" ]]; then
                        items+=("$inline_text")
                        got_sub_bullets=true
                    fi
                    continue
                fi

                # Detect "**Then**:" or "**Then**:\n" (block Then introducing sub-bullets)
                if [[ "$line" =~ ^\*\*Then\*\*:?[[:space:]]*$ || "$line" =~ ^-[[:space:]]+\*\*Then\*\*:?[[:space:]]*$ ]]; then
                    in_then=true
                    continue
                fi

                # Detect "- **Given**" or "- **When**" lines — skip these
                if [[ "$line" =~ \*\*Given\*\* || "$line" =~ \*\*When\*\* ]]; then
                    in_then=false
                    continue
                fi

                # Collect sub-bullets under Then
                if [[ "$in_then" == true && "$line" =~ ^-[[:space:]]+(.*) ]]; then
                    local bullet="${BASH_REMATCH[1]}"
                    bullet=$(echo "$bullet" | sed 's/\*\*//g')
                    [[ -n "$bullet" ]] && items+=("$bullet") && got_sub_bullets=true
                    continue
                fi
            done <<< "$ac_section"

            # If we found AC headers but no items, fall back to AC titles
            if [[ ${#items[@]} -eq 0 ]]; then
                while IFS= read -r line; do
                    if [[ "$line" =~ ^###[[:space:]]+AC[0-9]+:?[[:space:]]*(.*) ]]; then
                        local ac_title="${BASH_REMATCH[1]}"
                        [[ -n "$ac_title" ]] && items+=("$ac_title")
                    fi
                done <<< "$ac_section"
            fi
        else
            # Format A: simple bullet list (no ### AC headings)
            while IFS= read -r line; do
                if [[ "$line" =~ ^-[[:space:]]+(.*) ]]; then
                    local item="${BASH_REMATCH[1]}"
                    item=$(echo "$item" | sed 's/\*\*//g')
                    [[ -n "$item" ]] && items+=("$item")
                fi
            done <<< "$ac_section"
        fi
    fi

    # If no items extracted, create a single verification item from the title
    if [[ ${#items[@]} -eq 0 ]]; then
        items+=("Verify: $title")
    fi

    # ── Build JSON ────────────────────────────────────────────────
    local json="{"
    json+="\"id\":\"$(_hitl_json_escape "$story_id")\","
    json+="\"title\":\"$(_hitl_json_escape "$title")\","
    json+="\"changed\":\"$(_hitl_json_escape "$changed")\","
    json+="\"pri\":\"$pri_mapped\","
    json+="\"items\":["

    local first=true
    for item in "${items[@]}"; do
        [[ "$first" == true ]] && first=false || json+=","
        json+="\"$(_hitl_json_escape "$item")\""
    done

    json+="]}"
    echo "$json"
}

# ── Collect data for all completed stories ────────────────────────
# Groups by epic, outputs the full JS data array as JSON.
hitl_collect_run_data() {
    local completed_stories=()
    local epic_data=""

    # Get completed stories from state
    while IFS= read -r sid; do
        [[ -n "$sid" ]] && completed_stories+=("$sid")
    done < <(state_get_completed)

    if [[ ${#completed_stories[@]} -eq 0 ]]; then
        log_warn "HITL: no completed stories found"
        echo "[]"
        return 0
    fi

    # Sort stories by ID (numeric sort on epic.story)
    local sorted_stories
    sorted_stories=$(printf '%s\n' "${completed_stories[@]}" | sort -t. -k1,1n -k2,2n)

    local current_epic=""
    local json_parts=()
    local story_count=0
    local item_count=0
    local epic_min=999
    local epic_max=0

    while IFS= read -r story_id; do
        [[ -z "$story_id" ]] && continue

        local epic_num="${story_id%%.*}"

        # Track epic range
        [[ $epic_num -lt $epic_min ]] && epic_min=$epic_num
        [[ $epic_num -gt $epic_max ]] && epic_max=$epic_num

        # Emit epic header when entering a new epic
        if [[ "$epic_num" != "$current_epic" ]]; then
            current_epic="$epic_num"
            local epic_title
            epic_title=$(hitl_extract_epic_header "$epic_num")
            json_parts+=("{\"epic\":$epic_num,\"epicTitle\":\"$(_hitl_json_escape "$epic_title")\"}")
        fi

        # Find and extract from spec
        local spec_path
        if spec_path=$(spec_find "$story_id" 2>/dev/null); then
            local story_json
            story_json=$(hitl_extract_from_spec "$spec_path" 2>/dev/null)
            if [[ -n "$story_json" ]]; then
                json_parts+=("$story_json")
                story_count=$((story_count + 1))

                # Count items for subtitle
                local items_in_story
                items_in_story=$(echo "$story_json" | grep -o '"items":\[' | head -1)
                if [[ -n "$items_in_story" ]]; then
                    # Count commas + 1 in items array
                    local items_str
                    items_str=$(echo "$story_json" | sed 's/.*"items":\[//;s/\].*//')
                    if [[ -n "$items_str" ]]; then
                        local comma_count
                        comma_count=$(echo "$items_str" | tr -cd ',' | wc -c | xargs)
                        item_count=$((item_count + comma_count + 1))
                    fi
                fi
            fi
        else
            log_debug "HITL: could not find spec for $story_id, skipping"
        fi
    done <<< "$sorted_stories"

    # Build the complete JSON array
    local result="["
    local first=true
    for part in "${json_parts[@]}"; do
        [[ "$first" == true ]] && first=false || result+=","
        result+="$part"
    done
    result+="]"

    # Write metadata to temp file (survives subshell capture)
    local meta_file="${TMPDIR:-/tmp}/.ralph-hitl-meta.$$"
    echo "$story_count $item_count $epic_min $epic_max" > "$meta_file"

    echo "$result"
}

# ── Generate the HITL review HTML report ──────────────────────────
hitl_generate_report() {
    local output_path="${1:-docs/hitl-review.html}"
    local template_path="${RALPH_DIR}/templates/hitl-review.html"

    if [[ ! -f "$template_path" ]]; then
        log_error "HITL template not found: $template_path"
        return 1
    fi

    log_info "Collecting HITL review data from completed specs..."

    # Collect story data (writes metadata to temp file)
    local stories_json
    stories_json=$(hitl_collect_run_data)

    if [[ "$stories_json" == "[]" ]]; then
        log_warn "No completed stories to generate review for."
        return 1
    fi

    # Read metadata written by hitl_collect_run_data
    local meta_file="${TMPDIR:-/tmp}/.ralph-hitl-meta.$$"
    local project_name
    project_name=$(config_get '.project.name' 'Project')
    local story_count=0 item_count=0 epic_min=0 epic_max=0
    if [[ -f "$meta_file" ]]; then
        read -r story_count item_count epic_min epic_max < "$meta_file"
        rm -f "$meta_file"
    fi

    local subtitle
    if [[ "$epic_min" == "$epic_max" ]]; then
        subtitle="Epic $epic_min · $story_count stories · $item_count verification items"
    else
        subtitle="Epics ${epic_min}–${epic_max} · $story_count stories · $item_count verification items"
    fi

    log_info "Found $story_count stories with $item_count verification items"

    # Ensure output directory exists
    local output_dir
    output_dir=$(dirname "$output_path")
    mkdir -p "$output_dir"

    # Read template and inject data
    local template
    template=$(cat "$template_path")

    # Replace placeholders
    # Use a temp file approach to handle large data safely
    local tmp_file
    tmp_file=$(mktemp)

    echo "$template" \
        | sed "s|/\*PROJECT_NAME\*/|$(_hitl_json_escape "$project_name")|g" \
        | sed "s|/\*SUBTITLE\*/|$subtitle|g" \
        > "$tmp_file"

    # Replace STORIES_DATA placeholder — sed can't handle large multi-line data,
    # so we use awk for the data injection
    local data_file
    data_file=$(mktemp)
    echo "$stories_json" > "$data_file"

    awk -v datafile="$data_file" '
    {
        idx = index($0, "/*STORIES_DATA*/[]")
        if (idx > 0) {
            prefix = substr($0, 1, idx - 1)
            # Read data from file
            data = ""
            while ((getline line < datafile) > 0) {
                data = data line
            }
            close(datafile)
            print prefix data ";"
        } else {
            print
        }
    }' "$tmp_file" > "$output_path"

    rm -f "$tmp_file" "$data_file"

    log_success "HITL review generated: $output_path"

    # Open in browser if configured
    if [[ "$(config_get '.hitl.open_after_generate' 'true')" == "true" ]]; then
        if command -v open &>/dev/null; then
            open "$output_path" &
            log_info "Opened in browser"
        fi
    fi
}

# ── Generate a remediation PRD from HITL feedback ─────────────────
hitl_generate_feedback_prd() {
    local json_path="$1"
    local feedback_template="${RALPH_DIR}/templates/hitl-feedback.md"

    if [[ ! -f "$json_path" ]]; then
        log_error "HITL evaluation file not found: $json_path"
        return 1
    fi

    if [[ ! -f "$feedback_template" ]]; then
        log_error "Feedback template not found: $feedback_template"
        return 1
    fi

    # Extract failed items from the evaluation JSON
    local failed_items
    failed_items=$(jq -r '
        .stories | to_entries[] |
        .key as $story_id |
        .value.title as $title |
        .value.priority as $pri |
        .value.items | to_entries[] |
        select(.value.status == "fail") |
        "### Story \($story_id) — \($title) [Priority: \($pri)]\n" +
        "- **\(.key)**: \(.value.description)\n" +
        "  - **Reviewer notes**: \(.value.notes // "No notes provided")\n"
    ' "$json_path" 2>/dev/null)

    if [[ -z "$failed_items" ]]; then
        # Also check for items with notes (even if not marked fail)
        failed_items=$(jq -r '
            .stories | to_entries[] |
            .key as $story_id |
            .value.title as $title |
            .value.priority as $pri |
            .value.items | to_entries[] |
            select(.value.notes != null and .value.notes != "") |
            "### Story \($story_id) — \($title) [Priority: \($pri)]\n" +
            "- **\(.key)** [\(.value.status)]: \(.value.description)\n" +
            "  - **Reviewer notes**: \(.value.notes)\n"
        ' "$json_path" 2>/dev/null)
    fi

    if [[ -z "$failed_items" ]]; then
        log_success "No failed items or notes found. All clear!"
        return 0
    fi

    # Count issues
    local fail_count
    fail_count=$(jq '[.stories[].items | to_entries[] | select(.value.status == "fail")] | length' "$json_path" 2>/dev/null || echo "0")
    local noted_count
    noted_count=$(jq '[.stories[].items | to_entries[] | select(.value.notes != null and .value.notes != "")] | length' "$json_path" 2>/dev/null || echo "0")

    log_info "Found $fail_count failed items, $noted_count items with notes"

    # Read template and inject
    local template
    template=$(cat "$feedback_template")

    local output
    output="${template//\{\{FAILED_ITEMS\}\}/$failed_items}"

    # Write to stdout or file
    local output_path="docs/hitl-remediation-prd.md"
    mkdir -p "$(dirname "$output_path")"
    echo "$output" > "$output_path"

    log_success "Remediation PRD generated: $output_path"
    log_info "Feed this into your story generator: ralph hitl feedback → PRD → specs → ralph run"
}
