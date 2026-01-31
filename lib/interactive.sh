#!/bin/bash
# Ralph v2 — Interactive startup prompts and init wizard

# ── Init wizard ─────────────────────────────────────────────────────────────

interactive_init() {
    echo ""

    # Project name
    local project_name
    local default_name
    default_name=$(basename "$(pwd)")
    read -rp "Project name [$default_name]: " project_name
    project_name="${project_name:-$default_name}"

    # Spec pattern
    local spec_pattern
    read -rp "Spec file pattern [specs/epic-{{epic}}/story-{{id}}-*.md]: " spec_pattern
    spec_pattern="${spec_pattern:-specs/epic-{{epic}}/story-{{id}}-*.md}"

    # Validation commands
    echo ""
    echo "Validation commands (run after each story). Enter empty line to finish."
    local validation_cmds="[]"
    local cmd_index=0
    while true; do
        local cmd_name cmd_str cmd_required
        read -rp "  Command name (e.g., 'tests', 'lint'): " cmd_name
        [[ -z "$cmd_name" ]] && break

        read -rp "  Shell command: " cmd_str
        [[ -z "$cmd_str" ]] && break

        read -rp "  Required? (failure blocks commit) [Y/n]: " cmd_required
        cmd_required="${cmd_required:-y}"
        local required_bool="true"
        [[ "$cmd_required" == [nN] ]] && required_bool="false"

        validation_cmds=$(echo "$validation_cmds" | jq \
            --arg name "$cmd_name" \
            --arg cmd "$cmd_str" \
            --argjson req "$required_bool" \
            '. += [{"name": $name, "cmd": $cmd, "required": $req}]')

        cmd_index=$((cmd_index + 1))
        echo ""
    done

    # Blocked commands
    echo "Blocked commands (never run these). Enter empty line to finish."
    local blocked_cmds="[]"
    while true; do
        local blocked
        read -rp "  Command to block: " blocked
        [[ -z "$blocked" ]] && break
        blocked_cmds=$(echo "$blocked_cmds" | jq --arg cmd "$blocked" '. += [$cmd]')
    done

    # Create .ralph directory
    mkdir -p ".ralph/learnings" ".ralph/templates"

    # Write config.json
    local config_template
    config_template=$(cat "${RALPH_DIR}/templates/init/config.json")

    jq -n \
        --arg name "$project_name" \
        --arg pattern "$spec_pattern" \
        --argjson validation "$validation_cmds" \
        --argjson blocked "$blocked_cmds" \
        '{
            version: "2.0.0",
            project: { name: $name },
            specs: {
                pattern: $pattern,
                id_format: "epic.story",
                frontmatter_status_field: "status"
            },
            loop: { max_iterations: 0, timeout_seconds: 1800, max_retries: 3 },
            validation: { commands: $validation, blocked_commands: $blocked },
            claude: { flags: ["--print", "--dangerously-skip-permissions"] },
            commit: { format: "feat(story-{{id}}): {{title}}", auto_commit: true },
            testing_phase: { enabled: false, timeout_seconds: 600 },
            learnings: { enabled: true, max_inject_count: 5 },
            parallel: {
                enabled: false,
                max_concurrent: 8,
                strategy: "worktree",
                auto_merge: true,
                merge_review_timeout: 900,
                stagger_seconds: 3
            },
            caffeine: false,
            hooks: { pre_iteration: "", post_iteration: "", pre_story: "", post_story: "" }
        }' > ".ralph/config.json"

    # Copy stories.txt template
    cp "${RALPH_DIR}/templates/init/stories.txt" ".ralph/stories.txt"

    # Copy prompt templates
    cp "${RALPH_DIR}/templates/implement.md" ".ralph/templates/implement.md"
    cp "${RALPH_DIR}/templates/test-review.md" ".ralph/templates/test-review.md"

    # Create empty learnings index
    echo '{}' > ".ralph/learnings/_index.json"

    # Create empty progress.txt if it doesn't exist
    [[ -f "progress.txt" ]] || touch "progress.txt"

    echo ""
    log_success "Created .ralph/config.json"
    log_success "Created .ralph/stories.txt"
    log_success "Created .ralph/templates/"
    log_success "Created .ralph/learnings/"
}

# ── Run startup prompts ────────────────────────────────────────────────────

interactive_run_prompt() {
    local total done_count remaining
    total=$(stories_count_total)
    done_count=$(state_completed_count)
    remaining=$(stories_count_remaining)

    echo ""
    echo -e "${CLR_BOLD}Ralph${CLR_RESET} — $(config_get '.project.name' 'project')"
    echo ""
    echo "  Progress: $done_count / $total stories ($remaining remaining)"

    local next
    if next=$(stories_find_next); then
        local next_title
        next_title=$(stories_get_title "$next" 2>/dev/null || echo "(unknown)")
        echo "  Next up:  $next — $next_title"
    else
        log_success "All stories complete!"
        exit 0
    fi

    echo ""
    echo "How would you like to run?"
    echo "  1) Run all remaining stories"
    echo "  2) Run a specific story"
    echo "  3) Run N iterations"
    echo "  4) Dry run (preview prompt)"
    echo "  5) Exit"
    echo ""

    local choice
    read -rp "Choice [1]: " choice
    choice="${choice:-1}"

    case "$choice" in
        1)
            # Defaults are fine
            ;;
        2)
            read -rp "Story ID: " RALPH_RUN_STORY
            export RALPH_RUN_STORY
            ;;
        3)
            read -rp "Number of iterations: " RALPH_RUN_ITERATIONS
            export RALPH_RUN_ITERATIONS
            ;;
        4)
            RALPH_RUN_ITERATIONS=1
            export RALPH_RUN_ITERATIONS
            # Set dry_run externally — caller checks this
            echo ""
            echo "[DRY RUN MODE]"
            # We need to signal dry run back to the caller.
            # Use a sentinel file since we can't modify the caller's local var
            touch "/tmp/.ralph_dry_run_$$"
            ;;
        5)
            exit 0
            ;;
    esac

    # Additional options
    echo ""
    read -rp "Verbose output? [y/N]: " verbose_choice
    [[ "$verbose_choice" == [yY] ]] && RALPH_RUN_VERBOSE=true && export RALPH_RUN_VERBOSE

    local timeout_override
    read -rp "Timeout override (seconds, Enter for default): " timeout_override
    [[ -n "$timeout_override" ]] && RALPH_RUN_TIMEOUT="$timeout_override" && export RALPH_RUN_TIMEOUT

    if [[ "$(uname -s)" == "Darwin" ]]; then
        read -rp "Prevent sleep (caffeine)? [y/N]: " caffeine_choice
        [[ "$caffeine_choice" == [yY] ]] && RALPH_RUN_CAFFEINE=true && export RALPH_RUN_CAFFEINE
    fi

    echo ""
}
