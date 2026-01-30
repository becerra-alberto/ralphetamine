#!/bin/bash
# Ralph - Autonomous Implementation Loop via Claude Code CLI
# Usage: ./ralph.sh [OPTIONS]
#
# Runs Claude Code autonomously to implement stories from specs/
# Each iteration: pick next story -> implement -> test -> commit or revert

set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITERATIONS=45
VERBOSE=false
DRY_RUN=false
LOG_FILE="ralph.log"
RESUME_FROM=""
TIMEOUT=1800  # 30 minutes per iteration

# New configuration for improved Ralph
STATE_DIR=".ralph"
STATE_FILE="$STATE_DIR/state.json"
MAX_RETRIES=3
SPECIFIC_STORY=""

# Ordered list of all stories
STORY_ORDER=(
    "1.1" "1.2" "1.3" "1.4" "1.5" "1.6"
    "2.1" "2.2" "2.3" "2.4" "2.5" "2.6" "2.7" "2.8" "2.9" "2.10"
    "3.1" "3.2" "3.3" "3.4"
    "4.1" "4.2" "4.3" "4.4" "4.5" "4.6" "4.7" "4.8" "4.9"
    "5.1" "5.2" "5.3" "5.4" "5.5"
    "6.1" "6.2" "6.3" "6.4" "6.5" "6.6" "6.7"
    "7.1" "7.2" "7.3" "7.4"
    "8.1" "8.2" "8.3" "8.4" "8.5" "8.6" "8.7" "8.8" "8.9" "8.10" "8.11"
    "9.1" "9.2" "9.3" "9.4" "9.5"
    "10.1" "10.2" "10.3" "10.4" "10.5" "10.6" "10.7" "10.8" "10.9"
    "11.1" "11.2" "11.3" "11.4" "11.5" "11.6" "11.7" "11.8"
    "12.1" "12.2" "12.3"
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Parse Arguments
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

usage() {
    cat << EOF
Ralph - Autonomous Implementation Loop via Claude Code CLI

Usage: ./ralph.sh [OPTIONS]

Options:
    -n, --iterations NUM   Number of iterations (default: 45)
    -v, --verbose          Show full Claude output
    -d, --dry-run          Show what would be executed without running
    -s, --story STORY      Run only this specific story (e.g., "3.4")
    -r, --resume STORY     Resume from a specific story (e.g., "2.10")
    -t, --timeout SECS     Timeout per iteration in seconds (default: 1800)
    -l, --log FILE         Log file path (default: ralph.log)
    -h, --help             Show this help message

Examples:
    ./ralph.sh                      # Run 45 iterations
    ./ralph.sh -n 10                # Run 10 iterations
    ./ralph.sh -s 3.4               # Run only story 3.4
    ./ralph.sh -r 2.10              # Resume from story 2.10
    ./ralph.sh -v -n 5              # Verbose mode, 5 iterations
    ./ralph.sh -d -s 4.1            # Dry run for story 4.1
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--iterations)
            ITERATIONS="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -s|--story)
            SPECIFIC_STORY="$2"
            shift 2
            ;;
        -r|--resume)
            RESUME_FROM="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -l|--log)
            LOG_FILE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    # Check claude CLI is available
    if ! command -v claude &> /dev/null; then
        echo "Error: 'claude' CLI not found. Install Claude Code first."
        exit 1
    fi

    # Check required files exist
    if [[ ! -f "CLAUDE.md" ]]; then
        echo "Error: Required file 'CLAUDE.md' not found."
        exit 1
    fi

    # Check specs directory exists
    if [[ ! -d "specs" ]]; then
        echo "Error: 'specs/' directory not found."
        exit 1
    fi

    # Create state directory if it doesn't exist
    if [[ ! -d "$STATE_DIR" ]]; then
        mkdir -p "$STATE_DIR"
    fi

    # Create progress.txt if it doesn't exist
    if [[ ! -f "progress.txt" ]]; then
        touch "progress.txt"
    fi
}

# Initialize state.json from progress.txt on first run
init_state() {
    if [[ -f "$STATE_FILE" ]]; then
        return 0
    fi

    log "Initializing state from progress.txt"

    # Parse completed stories from progress.txt
    local completed=()
    while IFS= read -r line; do
        if [[ "$line" =~ ^\[DONE\]\ Story\ ([0-9]+\.[0-9]+) ]]; then
            local story="${BASH_REMATCH[1]}"
            # Avoid duplicates
            local found=false
            for s in "${completed[@]}"; do
                if [[ "$s" == "$story" ]]; then
                    found=true
                    break
                fi
            done
            if [[ "$found" == false ]]; then
                completed+=("$story")
            fi
        fi
    done < "progress.txt"

    # Create state.json
    local completed_json="[]"
    if [[ ${#completed[@]} -gt 0 ]]; then
        completed_json=$(printf '%s\n' "${completed[@]}" | jq -R . | jq -s .)
    fi

    cat > "$STATE_FILE" << EOF
{
    "completed_stories": $completed_json,
    "current_story": null,
    "retry_count": 0
}
EOF
    log "State initialized with ${#completed[@]} completed stories"
}

# Read completed stories from state.json
get_completed_stories() {
    if [[ ! -f "$STATE_FILE" ]]; then
        echo ""
        return
    fi
    jq -r '.completed_stories[]' "$STATE_FILE" 2>/dev/null || echo ""
}

# Check if a story is completed
is_story_completed() {
    local story="$1"
    local completed
    completed=$(get_completed_stories)
    echo "$completed" | grep -q "^${story}$"
}

# Find the next story to implement
find_next_story() {
    # If specific story requested, use it (for -s flag)
    if [[ -n "$SPECIFIC_STORY" ]]; then
        echo "$SPECIFIC_STORY"
        return 0
    fi

    # If resuming from a specific story, start from there
    local start_index=0
    if [[ -n "$RESUME_FROM" ]]; then
        for i in "${!STORY_ORDER[@]}"; do
            if [[ "${STORY_ORDER[$i]}" == "$RESUME_FROM" ]]; then
                start_index=$i
                break
            fi
        done
        # Clear RESUME_FROM after first use
        RESUME_FROM=""
    fi

    # Find first non-completed story
    for ((i=start_index; i<${#STORY_ORDER[@]}; i++)); do
        local story="${STORY_ORDER[$i]}"
        if ! is_story_completed "$story"; then
            echo "$story"
            return 0
        fi
    done

    # All stories complete
    return 1
}

# Get the spec file path for a story
get_story_spec_path() {
    local story="$1"
    local epic="${story%%.*}"  # Extract epic number (e.g., "3" from "3.4")

    # Find the spec file matching this story
    local spec_file
    spec_file=$(find "specs/epic-${epic}" -name "story-${story}-*.md" 2>/dev/null | head -1)

    if [[ -z "$spec_file" ]]; then
        echo "Error: Spec file not found for story $story" >&2
        return 1
    fi

    echo "$spec_file"
}

# Get the title from a spec file
get_story_title() {
    local spec_path="$1"
    # Extract title from filename: story-X.X-title-here.md -> title-here -> Title Here
    local filename
    filename=$(basename "$spec_path" .md)
    local title="${filename#story-*-}"  # Remove "story-X.X-" prefix
    echo "$title" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g'  # Convert to Title Case
}

# Mark a story as done
mark_story_done() {
    local story="$1"
    local spec_path="$2"
    local title
    title=$(get_story_title "$spec_path")

    # Update state.json
    local current_completed
    current_completed=$(jq '.completed_stories' "$STATE_FILE")
    jq --arg story "$story" '.completed_stories += [$story] | .current_story = null | .retry_count = 0' "$STATE_FILE" > "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"

    # Update spec YAML status
    update_spec_status "$spec_path" "done"

    # Append to progress.txt
    local timestamp
    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
    echo "[DONE] Story $story - $title - $timestamp" >> progress.txt

    log "Story $story marked as DONE"
}

# Handle story failure
handle_failure() {
    local story="$1"
    local reason="$2"
    local spec_path="$3"

    # Get current retry count
    local retry_count
    retry_count=$(jq '.retry_count // 0' "$STATE_FILE")
    retry_count=$((retry_count + 1))

    # Update state with new retry count
    jq --argjson count "$retry_count" --arg story "$story" '.retry_count = $count | .current_story = $story' "$STATE_FILE" > "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"

    # Append failure to progress.txt
    local timestamp
    timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
    echo "[FAIL] Story $story - $reason - $timestamp (attempt $retry_count/$MAX_RETRIES)" >> progress.txt

    log "Story $story failed (attempt $retry_count/$MAX_RETRIES): $reason"

    # Check if max retries exceeded
    if [[ $retry_count -ge $MAX_RETRIES ]]; then
        echo ""
        echo "╔══════════════════════════════════════════════════════════════════╗"
        echo "║                    MAX RETRIES EXCEEDED                          ║"
        echo "╠══════════════════════════════════════════════════════════════════╣"
        echo "║  Story $story failed $MAX_RETRIES times.                                   ║"
        echo "║  Human intervention required.                                    ║"
        echo "╚══════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Last failure reason: $reason"
        echo ""
        echo "To retry this story after fixing the issue:"
        echo "  ./ralph.sh -s $story"
        echo ""
        log "EXITING: Story $story exceeded max retries ($MAX_RETRIES)"
        exit 1
    fi

    # Will retry on next iteration
    return 0
}

# Update spec YAML frontmatter status
update_spec_status() {
    local spec_path="$1"
    local new_status="$2"

    if [[ ! -f "$spec_path" ]]; then
        return 1
    fi

    # Use sed to replace status in YAML frontmatter
    # Handles: status: pending, status: "pending", status: 'pending'
    if grep -q "^status:" "$spec_path"; then
        sed -i '' "s/^status:.*$/status: $new_status/" "$spec_path"
        log "Updated spec status to '$new_status': $spec_path"
    fi
}

# Append learnings from Claude output to progress.txt
append_learnings() {
    local output="$1"

    # Extract all <ralph>LEARN: ...</ralph> tags
    local learnings
    learnings=$(echo "$output" | grep -oE '<ralph>LEARN:[^<]+</ralph>' | sed 's/<ralph>LEARN: */[LEARN] /g' | sed 's/<\/ralph>//g')

    if [[ -n "$learnings" ]]; then
        echo "" >> progress.txt
        echo "$learnings" >> progress.txt
        log "Appended learnings to progress.txt"
    fi
}

# Build the story-specific prompt with embedded file contents
build_story_prompt() {
    local story="$1"
    local spec_path="$2"
    local title
    title=$(get_story_title "$spec_path")

    # Read file contents
    local spec_content
    spec_content=$(cat "$spec_path")

    cat << PROMPT
You are Ralph, an autonomous implementation agent. Your task is to implement Story $story: $title

## STORY SPECIFICATION

$spec_content

## WORKFLOW

1. Use Read tool to understand existing code patterns in the codebase (check similar components)
2. Use Write and Edit tools to implement the story completely:
   - Create/modify all files listed in the spec
   - Follow acceptance criteria exactly
   - Write all tests defined in Test Definition section
3. Use Bash tool for validation:
   - Run 'npm run check' for TypeScript validation
   - Run 'npm run test' for unit tests
   - NEVER run cargo commands (cargo build/test/run) - sandbox blocks Rust
   - NEVER run 'npm run tauri dev/build' - these trigger cargo
4. On SUCCESS:
   - Use Bash tool to stage and commit with message: feat(story-$story): $title
   - Output the exact text: <ralph>DONE $story</ralph>
5. On FAILURE:
   - Use Bash tool to run 'git checkout .' to revert changes
   - Output the exact text: <ralph>FAIL $story: <reason></ralph>
6. If you discover useful patterns or gotchas, output: <ralph>LEARN: <text></ralph>

## CRITICAL RULES

- Implement this ONE story completely before outputting DONE or FAIL
- Always use integer cents for all monetary values
- Maintain existing code patterns and conventions
- Follow the acceptance criteria in the spec EXACTLY
- Write all tests specified in the Test Definition section
- If tests fail, fix them before committing
- YOU MUST USE TOOLS (Read, Write, Edit, Bash) to accomplish this task
- Do not just respond with text - you must take ACTION using tools

BEGIN IMPLEMENTATION NOW.
PROMPT
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Loop
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    check_prerequisites
    init_state

    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    RALPH IMPLEMENTATION LOOP                     ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║  Iterations: $(printf '%-4s' "$ITERATIONS")                                              ║"
    echo "║  Timeout:    $(printf '%-4s' "$TIMEOUT")s per iteration                              ║"
    echo "║  Log file:   $(printf '%-20s' "$LOG_FILE")                             ║"
    if [[ -n "$SPECIFIC_STORY" ]]; then
    echo "║  Story:      $SPECIFIC_STORY (specific)                                       ║"
    fi
    if [[ -n "$RESUME_FROM" ]]; then
    echo "║  Resume:     Story $RESUME_FROM                                          ║"
    fi
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""

    log "Ralph loop starting - $ITERATIONS iterations planned"

    for ((i=1; i<=ITERATIONS; i++)); do
        echo ""
        echo "┌────────────────────────────────────────────────────────────────────┐"
        echo "│  Iteration $i of $ITERATIONS                                              │"
        echo "└────────────────────────────────────────────────────────────────────┘"

        # 1. Script selects next story (not Claude)
        local next_story
        if ! next_story=$(find_next_story); then
            echo ""
            echo "╔══════════════════════════════════════════════════════════════════╗"
            echo "║                     ALL STORIES COMPLETE!                        ║"
            echo "╚══════════════════════════════════════════════════════════════════╝"
            log "All stories complete - Ralph loop finished"
            exit 0
        fi

        # Get spec path for this story
        local spec_path
        if ! spec_path=$(get_story_spec_path "$next_story"); then
            log "Error: Could not find spec for story $next_story"
            continue
        fi

        local title
        title=$(get_story_title "$spec_path")

        log "Starting iteration $i - Story $next_story: $title"
        echo "📋 Story $next_story: $title"
        echo "📄 Spec: $spec_path"

        # 2. Build story-specific prompt (embeds spec content directly)
        local prompt
        prompt=$(build_story_prompt "$next_story" "$spec_path")

        # Dry run mode
        if [[ "$DRY_RUN" == true ]]; then
            echo ""
            echo "[DRY RUN] Would execute the following:"
            echo "────────────────────────────────────────────────────────────────────"
            echo "Prompt (first 20 lines):"
            echo "$prompt" | head -20
            echo "..."
            echo "────────────────────────────────────────────────────────────────────"

            # If specific story, exit after showing one
            if [[ -n "$SPECIFIC_STORY" ]]; then
                exit 0
            fi
            continue
        fi

        # Update state to track current story
        jq --arg story "$next_story" '.current_story = $story' "$STATE_FILE" > "${STATE_FILE}.tmp"
        mv "${STATE_FILE}.tmp" "$STATE_FILE"

        # 3. Invoke Claude with embedded prompt (spec content included in prompt)
        local claude_cmd=(
            claude
            --print
            --dangerously-skip-permissions
        )

        local result
        local exit_code=0

        if [[ "$VERBOSE" == true ]]; then
            # Verbose: show output in real-time and capture it
            result=$(timeout "$TIMEOUT" "${claude_cmd[@]}" "$prompt" 2>&1 | tee /dev/stderr) || exit_code=$?
        else
            # Quiet: just capture output, show summary
            result=$(timeout "$TIMEOUT" "${claude_cmd[@]}" "$prompt" 2>&1) || exit_code=$?
        fi

        # Handle timeout
        if [[ $exit_code -eq 124 ]]; then
            log "Iteration $i timed out after ${TIMEOUT}s"
            echo "⏱️  Timeout - iteration exceeded ${TIMEOUT}s"
            handle_failure "$next_story" "Timeout after ${TIMEOUT}s" "$spec_path"
            continue
        fi

        # Handle other errors
        if [[ $exit_code -ne 0 ]]; then
            log "Iteration $i failed with exit code $exit_code"
            echo "❌ Error (exit code: $exit_code)"
            if [[ "$VERBOSE" != true ]]; then
                echo "   Run with -v for details"
            fi
            handle_failure "$next_story" "Exit code $exit_code" "$spec_path"
            continue
        fi

        # 4. Parse structured output
        # Extract learnings first (always do this)
        append_learnings "$result"

        # Check for DONE signal
        if [[ "$result" =~ \<ralph\>DONE\ ([0-9]+\.[0-9]+)\</ralph\> ]]; then
            local done_story="${BASH_REMATCH[1]}"
            if [[ "$done_story" == "$next_story" ]]; then
                echo "✅ Story $next_story completed successfully!"
                mark_story_done "$next_story" "$spec_path"

                # If running specific story, exit after completion
                if [[ -n "$SPECIFIC_STORY" ]]; then
                    echo ""
                    echo "╔══════════════════════════════════════════════════════════════════╗"
                    echo "║             SPECIFIC STORY COMPLETE!                             ║"
                    echo "╚══════════════════════════════════════════════════════════════════╝"
                    exit 0
                fi
            else
                log "Warning: DONE signal for $done_story but expected $next_story"
                handle_failure "$next_story" "Mismatched DONE signal" "$spec_path"
            fi
        # Check for FAIL signal
        elif [[ "$result" =~ \<ralph\>FAIL\ ([0-9]+\.[0-9]+):\ ([^\<]+)\</ralph\> ]]; then
            local fail_story="${BASH_REMATCH[1]}"
            local fail_reason="${BASH_REMATCH[2]}"
            echo "❌ Story $fail_story failed: $fail_reason"
            handle_failure "$next_story" "$fail_reason" "$spec_path"
        else
            # No structured signal found - treat as potential incomplete
            log "No structured output signal found in iteration $i"

            # Check for legacy signals in progress.txt style
            if echo "$result" | grep -q '\[DONE\]'; then
                local done_line
                done_line=$(echo "$result" | grep '\[DONE\]' | tail -1)
                echo "✅ $done_line"
                mark_story_done "$next_story" "$spec_path"

                if [[ -n "$SPECIFIC_STORY" ]]; then
                    exit 0
                fi
            elif echo "$result" | grep -q '\[FAIL\]'; then
                local fail_line
                fail_line=$(echo "$result" | grep '\[FAIL\]' | tail -1)
                echo "❌ $fail_line"
                handle_failure "$next_story" "$(echo "$fail_line" | sed 's/\[FAIL\] Story [0-9.]*[ -]*//')" "$spec_path"
            else
                # No signal at all - assume incomplete, retry
                echo "⚠️  No completion signal - assuming incomplete"
                handle_failure "$next_story" "No completion signal in output" "$spec_path"
            fi
        fi
    done

    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║  Reached iteration limit ($ITERATIONS). Check progress.txt.              ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    log "Reached iteration limit ($ITERATIONS)"
}

# Run main
main
