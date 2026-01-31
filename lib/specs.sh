#!/bin/bash
# Ralph v2 — Spec file discovery and management

# Find the spec file for a given story ID using the configured pattern
spec_find() {
    local story_id="$1"
    local epic="${story_id%%.*}"

    # Get the spec pattern from config, or use default
    local pattern
    pattern=$(config_get '.specs.pattern' 'specs/epic-{{epic}}/story-{{id}}-*.md')

    # Substitute pattern variables
    pattern="${pattern//\{\{epic\}\}/$epic}"
    pattern="${pattern//\{\{id\}\}/$story_id}"

    # Use find with the glob pattern
    local spec_file
    spec_file=$(find . -path "./$pattern" 2>/dev/null | head -1)

    if [[ -z "$spec_file" ]]; then
        log_error "Spec file not found for story $story_id (pattern: $pattern)"
        return 1
    fi

    # Remove leading ./
    echo "${spec_file#./}"
}

# Read spec file contents
spec_read() {
    local spec_path="$1"

    if [[ ! -f "$spec_path" ]]; then
        log_error "Spec file does not exist: $spec_path"
        return 1
    fi

    cat "$spec_path"
}

# Extract title from spec filename
# story-10.2-average-per-month-column.md → Average Per Month Column
spec_get_title() {
    local spec_path="$1"
    local filename
    filename=$(basename "$spec_path" .md)

    # Remove "story-X.X-" prefix
    local slug="${filename#story-*-}"
    # Convert hyphens to spaces
    echo "$slug" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g'
}

# Update YAML frontmatter status field in a spec file
spec_update_status() {
    local spec_path="$1"
    local new_status="$2"

    if [[ ! -f "$spec_path" ]]; then
        return 1
    fi

    local status_field
    status_field=$(config_get '.specs.frontmatter_status_field' 'status')

    if grep -q "^${status_field}:" "$spec_path"; then
        sed -i '' "s/^${status_field}:.*$/${status_field}: ${new_status}/" "$spec_path"
        log_debug "Updated spec status to '$new_status': $spec_path"
    fi
}

# Extract a YAML frontmatter field value from a spec
spec_get_field() {
    local spec_path="$1"
    local field="$2"

    if [[ ! -f "$spec_path" ]]; then
        return 1
    fi

    # Read between first --- and second --- (YAML frontmatter)
    sed -n '/^---$/,/^---$/p' "$spec_path" | grep "^${field}:" | sed "s/^${field}:[[:space:]]*//"
}

# Check if a spec has a specific depends_on entry
spec_get_depends_on() {
    local spec_path="$1"

    if [[ ! -f "$spec_path" ]]; then
        return 1
    fi

    # Extract depends_on list from YAML frontmatter
    # Handles both inline [1.2, 1.3] and multi-line - 1.2 formats
    local in_frontmatter=false
    local in_depends=false

    while IFS= read -r line; do
        if [[ "$line" == "---" ]]; then
            if [[ "$in_frontmatter" == true ]]; then
                break
            fi
            in_frontmatter=true
            continue
        fi

        [[ "$in_frontmatter" == false ]] && continue

        # Inline format: depends_on: [1.2, 1.3]
        if [[ "$line" =~ ^depends_on:[[:space:]]*\[(.*)\] ]]; then
            echo "${BASH_REMATCH[1]}" | tr ',' '\n' | sed 's/[[:space:]]*//g; s/"//g; s/'\''//g'
            return 0
        fi

        # Multi-line start
        if [[ "$line" =~ ^depends_on: ]]; then
            in_depends=true
            continue
        fi

        # Multi-line entries
        if [[ "$in_depends" == true ]]; then
            if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*(.*) ]]; then
                echo "${BASH_REMATCH[1]}" | sed 's/[[:space:]]*//g; s/"//g; s/'\''//g'
            else
                break
            fi
        fi
    done < "$spec_path"
}
