#!/usr/bin/env bash
# Ralphetamine — PRD-to-Specs provenance tracking

RALPH_PROVENANCE_FILE="$RALPH_STATE_DIR/provenance.json"

# ── Init ──────────────────────────────────────────────────────────────────────
# Create empty provenance.json if it doesn't exist
provenance_init() {
    if [[ ! -f "$RALPH_PROVENANCE_FILE" ]]; then
        cp "${RALPH_DIR}/templates/init/provenance.json" "$RALPH_PROVENANCE_FILE" 2>/dev/null \
            || echo '{"conversions":[]}' > "$RALPH_PROVENANCE_FILE"
        log_debug "Created provenance file: $RALPH_PROVENANCE_FILE"
    fi
}

# ── Record ────────────────────────────────────────────────────────────────────
# Append a conversion entry to provenance.json
# Usage: provenance_record <prd_path> <stories_csv> <spec_files_csv>
#   stories_csv:    comma-separated story IDs (e.g., "1.1,1.2,2.1")
#   spec_files_csv: comma-separated spec file paths
provenance_record() {
    local prd_path="$1"
    local stories_csv="$2"
    local spec_files_csv="$3"

    if [[ ! -f "$prd_path" ]]; then
        log_error "PRD file not found: $prd_path"
        return 1
    fi

    local prd_sha256
    prd_sha256=$(shasum -a 256 "$prd_path" | awk '{print $1}')

    local converted_at
    converted_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    # Convert CSV strings to JSON arrays
    local stories_json spec_files_json
    stories_json=$(echo "$stories_csv" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | jq -R . | jq -s .)
    spec_files_json=$(echo "$spec_files_csv" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | jq -R . | jq -s .)

    local tmp_file="${RALPH_PROVENANCE_FILE}.tmp"
    if ! jq --arg prd "$prd_path" \
            --arg sha "$prd_sha256" \
            --arg ts "$converted_at" \
            --argjson stories "$stories_json" \
            --argjson specs "$spec_files_json" \
            '.conversions += [{
                prd: $prd,
                prd_sha256: $sha,
                converted_at: $ts,
                stories_expected: $stories,
                spec_files: $specs
            }]' "$RALPH_PROVENANCE_FILE" > "$tmp_file" 2>/dev/null; then
        log_error "Provenance write failed: jq error"
        rm -f "$tmp_file"
        return 1
    fi

    if [[ ! -s "$tmp_file" ]] || ! jq empty "$tmp_file" 2>/dev/null; then
        log_error "Provenance write failed: invalid output"
        rm -f "$tmp_file"
        return 1
    fi

    mv "$tmp_file" "$RALPH_PROVENANCE_FILE"
    log_debug "Recorded provenance for $prd_path ($converted_at)"
}

# ── PRD status ────────────────────────────────────────────────────────────────
# Returns "converted", "modified", or "unknown"
provenance_get_prd_status() {
    local prd_path="$1"

    if [[ ! -f "$RALPH_PROVENANCE_FILE" ]]; then
        echo "unknown"
        return
    fi

    local stored_sha
    stored_sha=$(jq -r --arg prd "$prd_path" \
        '[.conversions[] | select(.prd == $prd)] | last | .prd_sha256 // empty' \
        "$RALPH_PROVENANCE_FILE" 2>/dev/null)

    if [[ -z "$stored_sha" ]]; then
        echo "unknown"
        return
    fi

    if [[ ! -f "$prd_path" ]]; then
        echo "unknown"
        return
    fi

    local current_sha
    current_sha=$(shasum -a 256 "$prd_path" | awk '{print $1}')

    if [[ "$current_sha" == "$stored_sha" ]]; then
        echo "converted"
    else
        echo "modified"
    fi
}

# ── Verify ────────────────────────────────────────────────────────────────────
# Run all provenance checks. Prints warnings, returns 0 (advisory only).
provenance_verify() {
    if [[ ! -f "$RALPH_PROVENANCE_FILE" ]]; then
        log_warn "No provenance file found. Run /ralph to convert a PRD first."
        return 0
    fi

    local conversion_count
    conversion_count=$(jq '.conversions | length' "$RALPH_PROVENANCE_FILE" 2>/dev/null)

    if [[ "$conversion_count" -eq 0 ]]; then
        log_info "No conversions recorded in provenance."
        return 0
    fi

    local warnings=0
    local ok_count=0

    # Collect all tracked stories and spec files across all conversions
    local all_tracked_stories all_tracked_specs
    all_tracked_stories=$(jq -r '.conversions[].stories_expected[]' "$RALPH_PROVENANCE_FILE" 2>/dev/null | sort -u)
    all_tracked_specs=$(jq -r '.conversions[].spec_files[]' "$RALPH_PROVENANCE_FILE" 2>/dev/null | sort -u)

    # Check each conversion entry
    local i=0
    while [[ $i -lt $conversion_count ]]; do
        local prd stories_expected spec_files prd_sha256
        prd=$(jq -r ".conversions[$i].prd" "$RALPH_PROVENANCE_FILE")
        prd_sha256=$(jq -r ".conversions[$i].prd_sha256" "$RALPH_PROVENANCE_FILE")
        stories_expected=$(jq -r ".conversions[$i].stories_expected[]" "$RALPH_PROVENANCE_FILE" 2>/dev/null)
        spec_files=$(jq -r ".conversions[$i].spec_files[]" "$RALPH_PROVENANCE_FILE" 2>/dev/null)

        local story_count
        story_count=$(echo "$stories_expected" | grep -c . 2>/dev/null || echo 0)

        # Check 1: PRD hash mismatch (modified after conversion)
        if [[ -f "$prd" ]]; then
            local current_sha
            current_sha=$(shasum -a 256 "$prd" | awk '{print $1}')
            if [[ "$current_sha" != "$prd_sha256" ]]; then
                log_warn "PRD $prd — modified since conversion (hash mismatch)"
                warnings=$((warnings + 1))
            fi
        else
            log_warn "PRD $prd — file not found"
            warnings=$((warnings + 1))
        fi

        # Check 2: Missing stories (expected vs stories.txt)
        local missing_stories=0
        if [[ -f "$RALPH_STORIES_FILE" ]]; then
            local stories_in_file
            stories_in_file=$(stories_list_all 2>/dev/null || true)

            while IFS= read -r sid; do
                [[ -z "$sid" ]] && continue
                if ! echo "$stories_in_file" | grep -q "^${sid}$"; then
                    log_warn "Story $sid in provenance but missing from stories.txt"
                    missing_stories=$((missing_stories + 1))
                    warnings=$((warnings + 1))
                fi
            done <<< "$stories_expected"
        fi

        # Check 3: Missing spec files
        local missing_specs=0
        while IFS= read -r spec; do
            [[ -z "$spec" ]] && continue
            if [[ ! -f "$spec" ]]; then
                log_warn "Spec file missing: $spec (from PRD $prd)"
                missing_specs=$((missing_specs + 1))
                warnings=$((warnings + 1))
            fi
        done <<< "$spec_files"

        local present=$((story_count - missing_stories))
        if [[ $missing_stories -eq 0 && $missing_specs -eq 0 ]]; then
            log_success "PRD $prd — ${present}/${story_count} stories present"
            ok_count=$((ok_count + 1))
        fi

        i=$((i + 1))
    done

    # Check 4: Orphaned spec files (on disk but not in any provenance entry)
    local spec_dirs
    spec_dirs=$(find specs -type f -name 'story-*.md' 2>/dev/null || true)
    while IFS= read -r spec_on_disk; do
        [[ -z "$spec_on_disk" ]] && continue
        if ! echo "$all_tracked_specs" | grep -q "^${spec_on_disk}$"; then
            log_warn "$spec_on_disk not tracked by any PRD"
            warnings=$((warnings + 1))
        fi
    done <<< "$spec_dirs"

    # Check 5: Orphaned stories (in stories.txt but not in any provenance entry)
    if [[ -f "$RALPH_STORIES_FILE" ]]; then
        local all_stories
        all_stories=$(stories_list_all 2>/dev/null || true)
        while IFS= read -r sid; do
            [[ -z "$sid" ]] && continue
            if ! echo "$all_tracked_stories" | grep -q "^${sid}$"; then
                log_warn "Story $sid in stories.txt not tracked by any PRD (untracked)"
                warnings=$((warnings + 1))
            fi
        done <<< "$all_stories"
    fi

    if [[ $warnings -eq 0 ]]; then
        log_success "All provenance checks passed"
    else
        log_info "$warnings warning(s) found"
    fi

    return 0
}

# ── List ──────────────────────────────────────────────────────────────────────
# List all recorded conversions
provenance_list() {
    if [[ ! -f "$RALPH_PROVENANCE_FILE" ]]; then
        log_info "No provenance file found."
        return 0
    fi

    local conversion_count
    conversion_count=$(jq '.conversions | length' "$RALPH_PROVENANCE_FILE" 2>/dev/null)

    if [[ "$conversion_count" -eq 0 ]]; then
        log_info "No conversions recorded."
        return 0
    fi

    echo ""
    echo "PRD Conversions:"
    divider

    local i=0
    while [[ $i -lt $conversion_count ]]; do
        local prd converted_at story_count status
        prd=$(jq -r ".conversions[$i].prd" "$RALPH_PROVENANCE_FILE")
        converted_at=$(jq -r ".conversions[$i].converted_at" "$RALPH_PROVENANCE_FILE")
        story_count=$(jq ".conversions[$i].stories_expected | length" "$RALPH_PROVENANCE_FILE")
        status=$(provenance_get_prd_status "$prd")

        printf "  %-40s %s stories  [%s]  %s\n" "$prd" "$story_count" "$status" "$converted_at"
        i=$((i + 1))
    done
    echo ""
}

# ── PRD frontmatter helpers ──────────────────────────────────────────────────
# Add/update ralph_status frontmatter in a PRD file
provenance_update_prd_frontmatter() {
    local prd_path="$1"
    local stories_range="$2"
    local spec_dir="${3:-specs/}"

    if [[ ! -f "$prd_path" ]]; then
        log_warn "Cannot update PRD frontmatter: file not found: $prd_path"
        return 1
    fi

    local converted_at
    converted_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    local ralph_block
    ralph_block="ralph_status: converted
ralph_converted_at: ${converted_at}
ralph_stories: \"${stories_range}\"
ralph_spec_dir: ${spec_dir}"

    # Check if file already has YAML frontmatter
    local first_line
    first_line=$(head -1 "$prd_path")

    if [[ "$first_line" == "---" ]]; then
        # Has existing frontmatter — merge ralph fields
        # Remove any existing ralph_ fields, then add ours before closing ---
        local tmp_file="${prd_path}.tmp"
        awk -v ralph="$ralph_block" '
        BEGIN { in_fm=0; printed=0 }
        /^---$/ {
            if (in_fm == 0) { in_fm=1; print; next }
            if (in_fm == 1 && printed == 0) { print ralph; printed=1; print; in_fm=2; next }
        }
        in_fm == 1 && /^ralph_/ { next }
        { print }
        ' "$prd_path" > "$tmp_file" && mv "$tmp_file" "$prd_path"
    else
        # No frontmatter — prepend
        local tmp_file="${prd_path}.tmp"
        {
            echo "---"
            echo "$ralph_block"
            echo "---"
            echo ""
            cat "$prd_path"
        } > "$tmp_file" && mv "$tmp_file" "$prd_path"
    fi

    log_debug "Updated PRD frontmatter: $prd_path"
}

# ── Spec source_prd helper ───────────────────────────────────────────────────
# Add source_prd field to a spec's YAML frontmatter
provenance_add_source_prd_to_spec() {
    local spec_path="$1"
    local prd_path="$2"

    if [[ ! -f "$spec_path" ]]; then
        log_warn "Cannot add source_prd: spec not found: $spec_path"
        return 1
    fi

    # Check if source_prd already exists
    if grep -q "^source_prd:" "$spec_path"; then
        # Update existing
        sed -i.bak "s|^source_prd:.*|source_prd: \"${prd_path}\"|" "$spec_path" && rm -f "${spec_path}.bak"
    else
        # Add before closing --- of frontmatter (awk for macOS/GNU portability)
        local tmp_file="${spec_path}.tmp"
        awk -v prd="$prd_path" '
        BEGIN { in_fm=0; added=0 }
        /^---$/ {
            if (in_fm == 0) { in_fm=1; print; next }
            if (in_fm == 1 && added == 0) { printf "source_prd: \"%s\"\n", prd; added=1; print; in_fm=2; next }
        }
        { print }
        ' "$spec_path" > "$tmp_file" && mv "$tmp_file" "$spec_path"
    fi

    log_debug "Added source_prd to spec: $spec_path"
}

# ── stories.txt provenance header ────────────────────────────────────────────
# Add provenance header comments to stories.txt
provenance_add_stories_header() {
    local prd_path="$1"
    local stories_csv="$2"

    local converted_at
    converted_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    # Format stories as comma-separated for the header
    local stories_formatted
    stories_formatted=$(echo "$stories_csv" | tr ',' ', ')

    local header_block="# Source: ${prd_path}
# Generated: ${converted_at}
# Stories: ${stories_formatted}"

    if [[ ! -f "$RALPH_STORIES_FILE" ]]; then
        log_warn "stories.txt not found, cannot add provenance header"
        return 1
    fi

    # Check if this PRD already has a header in the file
    if grep -q "^# Source: ${prd_path}$" "$RALPH_STORIES_FILE"; then
        log_debug "Provenance header for $prd_path already exists in stories.txt"
        return 0
    fi

    # Prepend header block (after any existing header blocks)
    local tmp_file="${RALPH_STORIES_FILE}.tmp"
    {
        # If file starts with provenance headers, add after them
        local in_header=true
        local header_printed=false
        while IFS= read -r line; do
            if [[ "$in_header" == true ]]; then
                if [[ "$line" =~ ^#\ (Source|Generated|Stories): ]]; then
                    echo "$line"
                    continue
                elif [[ -z "$line" && "$header_printed" == false ]]; then
                    echo "$line"
                    continue
                else
                    # End of existing headers — insert our new block
                    if [[ "$header_printed" == false ]]; then
                        echo "$header_block"
                        echo ""
                        header_printed=true
                    fi
                    in_header=false
                fi
            fi
            echo "$line"
        done < "$RALPH_STORIES_FILE"

        # If file was all headers/empty
        if [[ "$header_printed" == false ]]; then
            echo "$header_block"
            echo ""
        fi
    } > "$tmp_file" && mv "$tmp_file" "$RALPH_STORIES_FILE"

    log_debug "Added provenance header to stories.txt for $prd_path"
}
