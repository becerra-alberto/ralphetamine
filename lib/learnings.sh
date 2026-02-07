#!/usr/bin/env bash
# Ralph v2 — Learning extraction, categorization, and injection

RALPH_LEARNINGS_DIR=".ralph/learnings"
RALPH_LEARNINGS_INDEX="$RALPH_LEARNINGS_DIR/_index.json"

# Category keyword patterns — parallel indexed arrays for Bash 3.2 compatibility
# (replaces declare -A associative array which requires Bash 4.0+)
_CATEGORY_NAMES=("testing" "framework" "data-model" "tooling" "patterns" "gotchas")
_CATEGORY_PATTERNS=(
    "test|mock|assert|vitest|jest|playwright|expect|describe|it\\("
    "svelte|react|component|render|template|store|reactive|rune"
    "sql|migration|schema|table|column|sqlite|database|query"
    "build|compile|bundle|config|webpack|vite|tauri|cargo"
    "pattern|convention|approach|architecture|design|refactor"
    "gotcha|pitfall|trap|caveat|careful|warning|workaround|bug"
)

# Initialize learnings directory
learnings_init() {
    mkdir -p "$RALPH_LEARNINGS_DIR"
    if [[ ! -f "$RALPH_LEARNINGS_INDEX" ]]; then
        echo '{}' > "$RALPH_LEARNINGS_INDEX"
    fi
}

# Categorize a learning string by keyword matching
_learnings_categorize() {
    local text="$1"
    local lower_text
    lower_text=$(echo "$text" | tr '[:upper:]' '[:lower:]')

    local i
    for (( i=0; i<${#_CATEGORY_NAMES[@]}; i++ )); do
        if echo "$lower_text" | grep -qE "${_CATEGORY_PATTERNS[$i]}"; then
            echo "${_CATEGORY_NAMES[$i]}"
            return 0
        fi
    done

    echo "uncategorized"
}

# Extract LEARN tags from Claude output and store them
learnings_extract() {
    local output="$1"
    local story_id="$2"

    learnings_init

    local learnings
    learnings=$(signals_parse_learnings "$output")

    if [[ -z "$learnings" ]]; then
        return 0
    fi

    local count=0
    while IFS= read -r learning; do
        [[ -z "$learning" ]] && continue

        local category
        category=$(_learnings_categorize "$learning")
        local category_file="${RALPH_LEARNINGS_DIR}/${category}.md"

        # Append to category file
        if [[ ! -f "$category_file" ]]; then
            echo "# Learnings: ${category}" > "$category_file"
            echo "" >> "$category_file"
        fi

        echo "- [Story $story_id] $learning" >> "$category_file"

        # Update index
        if jq --arg cat "$category" --arg file "${category}.md" \
            '.[$cat] = $file' "$RALPH_LEARNINGS_INDEX" > "${RALPH_LEARNINGS_INDEX}.tmp" 2>/dev/null; then
            mv "${RALPH_LEARNINGS_INDEX}.tmp" "$RALPH_LEARNINGS_INDEX"
        else
            rm -f "${RALPH_LEARNINGS_INDEX}.tmp"
            log_warn "Failed to update learnings index for: $category"
        fi

        count=$((count + 1))
    done <<< "$learnings"

    # Also append to progress.txt (legacy compatibility)
    while IFS= read -r learning; do
        [[ -z "$learning" ]] && continue
        echo "[LEARN] $learning" >> progress.txt 2>/dev/null || true
    done <<< "$learnings"

    if [[ $count -gt 0 ]]; then
        log_debug "Extracted $count learnings from story $story_id"
    fi
}

# Select relevant learnings for a spec (keyword overlap scoring)
# O(n*m) scan is acceptable — typically <50 learnings, <20 keywords
learnings_select_relevant() {
    local spec_content="$1"
    local max_count="${2:-5}"

    learnings_init

    local spec_lower
    spec_lower=$(echo "$spec_content" | tr '[:upper:]' '[:lower:]')

    # Collect all learnings with scores
    local scored_learnings=()

    for category_file in "${RALPH_LEARNINGS_DIR}"/*; do
        [[ -f "$category_file" ]] || continue
        # Skip non-.md files (e.g., _index.json)
        case "$category_file" in
            *.md) ;;
            *) continue ;;
        esac

        while IFS= read -r line; do
            # Only process learning lines (start with -)
            [[ "$line" =~ ^-[[:space:]] ]] || continue

            local learning_text="$line"
            local learning_lower
            learning_lower=$(echo "$learning_text" | tr '[:upper:]' '[:lower:]')

            # Score: count word overlaps with spec (pure Bash, no subprocess per word)
            local score=0
            for word in $learning_lower; do
                [[ ${#word} -lt 4 ]] && continue  # skip short words
                if [[ "$spec_lower" == *"$word"* ]]; then
                    score=$((score + 1))
                fi
            done

            if [[ $score -gt 0 ]]; then
                scored_learnings+=("$score|$learning_text")
            fi
        done < "$category_file"
    done

    # Sort by score (descending) and take top N
    if [[ ${#scored_learnings[@]} -eq 0 ]]; then
        return 0
    fi

    printf '%s\n' "${scored_learnings[@]}" | sort -t'|' -k1 -rn | head -n "$max_count" | while IFS='|' read -r score text; do
        echo "$text"
    done
}

# Import learnings from legacy progress.txt [LEARN] entries
learnings_import_legacy() {
    local progress_file="${1:-progress.txt}"

    if [[ ! -f "$progress_file" ]]; then
        log_error "Progress file not found: $progress_file"
        return 1
    fi

    learnings_init

    local count=0
    while IFS= read -r line; do
        if [[ "$line" =~ ^\[LEARN\][[:space:]]*(.*) ]]; then
            local text="${BASH_REMATCH[1]}"
            local category
            category=$(_learnings_categorize "$text")
            local category_file="${RALPH_LEARNINGS_DIR}/${category}.md"

            if [[ ! -f "$category_file" ]]; then
                echo "# Learnings: ${category}" > "$category_file"
                echo "" >> "$category_file"
            fi

            echo "- [legacy] $text" >> "$category_file"

            if jq --arg cat "$category" --arg file "${category}.md" \
                '.[$cat] = $file' "$RALPH_LEARNINGS_INDEX" > "${RALPH_LEARNINGS_INDEX}.tmp" 2>/dev/null; then
                mv "${RALPH_LEARNINGS_INDEX}.tmp" "$RALPH_LEARNINGS_INDEX"
            else
                rm -f "${RALPH_LEARNINGS_INDEX}.tmp"
                log_warn "Failed to update learnings index for: $category"
            fi

            count=$((count + 1))
        fi
    done < "$progress_file"

    log_success "Imported $count learnings from $progress_file"
}

# Display learnings (for ralph learnings command)
learnings_show() {
    local topic="${1:-}"

    learnings_init

    if [[ -n "$topic" ]]; then
        local file="${RALPH_LEARNINGS_DIR}/${topic}.md"
        if [[ -f "$file" ]]; then
            cat "$file"
        else
            log_error "No learnings found for topic: $topic"
            echo "Available topics:"
            for f in "${RALPH_LEARNINGS_DIR}"/*.md; do
                [[ -f "$f" ]] && echo "  - $(basename "$f" .md)"
            done
        fi
        return
    fi

    # Show all topics with counts
    echo ""
    echo "Learnings by topic:"
    divider

    local total=0
    for file in "${RALPH_LEARNINGS_DIR}"/*.md; do
        [[ -f "$file" ]] || continue
        local topic_name
        topic_name=$(basename "$file" .md)
        local count
        count=$(grep -c '^- ' "$file" 2>/dev/null || echo "0")
        total=$((total + count))
        printf "  %-20s %d entries\n" "$topic_name" "$count"
    done

    echo ""
    echo "Total: $total learnings"
    echo ""
    echo "View a topic: ralph learnings <topic>"
}
