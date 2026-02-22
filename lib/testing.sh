#!/usr/bin/env bash
# Ralphetamine — Testing specialist phase (optional second Claude invocation)

# Run a test review after a story is implemented and committed
testing_review() {
    local story_id="$1"
    local spec_path="$2"

    local enabled
    enabled=$(config_get '.testing_phase.enabled' 'false')
    if [[ "$enabled" != "true" ]]; then
        return 0
    fi

    local timeout_secs
    timeout_secs=$(config_get '.testing_phase.timeout_seconds' '600')

    log_info "Testing specialist: reviewing story $story_id"

    # Build test review prompt
    local prompt
    prompt=$(prompt_build_test_review "$story_id" "$spec_path") || {
        log_warn "Testing specialist: failed to build prompt"
        return 0
    }

    # Build claude command
    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local result exit_code=0

    if [[ "$RALPH_VERBOSE" == true ]]; then
        result=$($timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" 2>&1 | tee /dev/stderr) || exit_code=$?
    else
        result=$($timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" 2>&1) || exit_code=$?
    fi

    # Handle timeout
    if [[ $exit_code -eq 124 ]]; then
        log_warn "Testing specialist: timed out after ${timeout_secs}s (non-fatal)"
        return 0
    fi

    # Handle errors
    if [[ $exit_code -ne 0 ]]; then
        log_warn "Testing specialist: failed (exit code $exit_code, non-fatal)"
        return 0
    fi

    # Extract learnings from test review
    if type learnings_extract &>/dev/null; then
        learnings_extract "$result" "$story_id"
    fi

    # Parse test review signal
    local review_info
    if review_info=$(signals_parse_test_review_done "$result"); then
        local review_story="${review_info%%|*}"
        local review_result="${review_info#*|}"
        log_success "Testing specialist: $review_result"

        local timestamp
        timestamp=$(date '+%a %d %b %Y %H:%M:%S %Z')
        echo "[TEST_REVIEW] Story $story_id - $review_result - $timestamp" >> progress.txt
    else
        log_warn "Testing specialist: no completion signal (non-fatal)"
    fi

    return 0
}

# ── E2E Testing Functions ───────────────────────────────────────────────────

# Detect the test framework used in the current project.
# Priority: BATS → pytest → jest → go → make → unknown
# Always returns 0; prints framework name to stdout.
e2e_detect_framework() {
    # BATS: tests/ directory with .bats files, or bats-core present
    if [[ -d "tests" ]] && ls tests/**/*.bats 2>/dev/null | head -1 | grep -q '.bats' 2>/dev/null; then
        echo "bats"
        return 0
    fi
    if find . -maxdepth 4 -name "*.bats" 2>/dev/null | head -1 | grep -q '.bats'; then
        echo "bats"
        return 0
    fi

    # pytest: common config files
    if [[ -f "pytest.ini" || -f "setup.cfg" || -f "pyproject.toml" ]]; then
        if grep -q 'pytest\|testpaths' pytest.ini setup.cfg pyproject.toml 2>/dev/null || true; then
            echo "pytest"
            return 0
        fi
    fi

    # jest: package.json with scripts.test containing jest
    if [[ -f "package.json" ]]; then
        if jq -e '.scripts.test' package.json 2>/dev/null | grep -qi 'jest' 2>/dev/null || true; then
            echo "jest"
            return 0
        fi
    fi

    # go: any .go files
    if find . -maxdepth 3 -name "*.go" 2>/dev/null | head -1 | grep -q '.go'; then
        echo "go"
        return 0
    fi

    # make: Makefile with a test target
    if [[ -f "Makefile" ]] && grep -q '^test:' Makefile 2>/dev/null; then
        echo "make"
        return 0
    fi

    echo "unknown"
    return 0
}

# Return the runnable test command for a given framework.
# Returns 1 for unknown framework.
e2e_build_test_command() {
    local framework="$1"

    case "$framework" in
        bats)
            echo "tests/libs/bats-core/bin/bats tests/"
            ;;
        pytest)
            echo "pytest"
            ;;
        jest)
            echo "npm test"
            ;;
        go)
            echo "go test ./..."
            ;;
        make)
            echo "make test"
            ;;
        *)
            return 1
            ;;
    esac
    return 0
}

# Check that test fixture files exist for the given framework.
# Returns 0 if fixtures present, 1 if missing.
e2e_check_fixtures() {
    local framework="$1"

    case "$framework" in
        bats)
            find . -maxdepth 5 -name "*.bats" 2>/dev/null | head -1 | grep -q '.bats' || return 1
            ;;
        pytest)
            find . -maxdepth 5 -name "test_*.py" -o -name "*_test.py" 2>/dev/null | head -1 | grep -q '\.py' || return 1
            ;;
        jest)
            find . -maxdepth 5 \( -name "*.test.js" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.spec.ts" \) 2>/dev/null | head -1 | grep -q '\.' || return 1
            ;;
        go)
            find . -maxdepth 5 -name "*_test.go" 2>/dev/null | head -1 | grep -q '.go' || return 1
            ;;
        make)
            [[ -f "Makefile" ]] && grep -q '^test:' Makefile 2>/dev/null || return 1
            ;;
        *)
            return 1
            ;;
    esac
    return 0
}

# Invoke Claude to set up missing test fixtures (non-fatal).
# Signals: <ralph>E2E_SETUP_DONE: N files</ralph> or <ralph>E2E_SETUP_SKIP: reason</ralph>
e2e_setup_via_claude() {
    local framework="$1"
    local timeout_secs="${2:-300}"

    local template_file="${RALPH_DIR}/templates/test-setup.md"
    if [[ ! -f "$template_file" ]]; then
        log_warn "E2E: test-setup.md template not found — skipping setup"
        return 0
    fi

    # Gather codebase summary
    local codebase_summary
    codebase_summary=$(find . -maxdepth 3 -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.go" \) 2>/dev/null | head -30 || true)

    local readme=""
    [[ -f "README.md" ]] && readme=$(head -c 3000 README.md 2>/dev/null || true)

    local prompt
    prompt=$(sed \
        -e "s|{{FRAMEWORK}}|${framework}|g" \
        -e "s|{{CODEBASE_SUMMARY}}|${codebase_summary}|g" \
        -e "s|{{README}}|${readme}|g" \
        "$template_file")

    local claude_flags=()
    while IFS= read -r flag; do
        [[ -n "$flag" ]] && claude_flags+=("$flag")
    done < <(config_get_claude_flags)

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    local output_file=".ralph/last-e2e-setup-output.txt"
    local exit_code=0

    mkdir -p "$(dirname "$output_file")"

    $timeout_cmd "$timeout_secs" claude "${claude_flags[@]}" "$prompt" \
        < /dev/null 2>&1 | cat > "$output_file" || exit_code=$?

    if [[ $exit_code -eq 124 ]]; then
        log_warn "E2E setup: timed out (non-fatal)"
    elif [[ $exit_code -ne 0 ]]; then
        log_warn "E2E setup: failed (exit code $exit_code, non-fatal)"
    else
        local result
        result=$(cat "$output_file")
        if type signals_parse_e2e_setup_done &>/dev/null; then
            local summary
            if summary=$(signals_parse_e2e_setup_done "$result"); then
                log_success "E2E setup: $summary"
            fi
        fi
    fi

    return 0
}

# Run the full E2E test suite.
# Writes results to .ralph/e2e/last-result.txt and progress.txt.
e2e_run_suite() {
    local timeout_secs="${1:-900}"

    local enabled
    enabled=$(config_get '.post_run.e2e_testing' 'true')
    if [[ "$enabled" != "true" ]]; then
        log_debug "E2E testing disabled in config"
        return 0
    fi

    local framework
    framework=$(e2e_detect_framework)
    log_info "E2E: detected framework: $framework"

    if [[ "$framework" == "unknown" ]]; then
        log_warn "E2E: no recognized test framework — skipping"
        return 0
    fi

    # Check fixtures; offer setup via Claude if missing
    if ! e2e_check_fixtures "$framework"; then
        log_info "E2E: test fixtures missing — invoking Claude to set up"
        local setup_timeout
        setup_timeout=$(config_get '.post_run.e2e_setup_timeout_seconds' '300')
        e2e_setup_via_claude "$framework" "$setup_timeout" || true
    fi

    # Build test command
    local test_cmd
    if ! test_cmd=$(e2e_build_test_command "$framework"); then
        log_warn "E2E: could not build test command for $framework"
        return 0
    fi

    log_info "E2E: running: $test_cmd"

    # Prepare output directory
    mkdir -p ".ralph/e2e"
    local result_file=".ralph/e2e/last-result.txt"
    local tmp_output
    tmp_output=$(mktemp)
    local exit_code=0

    local timeout_cmd
    timeout_cmd=$(prereqs_timeout_cmd)

    $timeout_cmd "$timeout_secs" bash -c "$test_cmd" > "$tmp_output" 2>&1 || exit_code=$?

    local timestamp
    timestamp=$(date '+%Y-%m-%dT%H:%M:%SZ')

    # Write structured result file
    {
        echo "framework=${framework}"
        echo "exit_code=${exit_code}"
        echo "timestamp=${timestamp}"
        echo "---output---"
        cat "$tmp_output"
    } > "$result_file"

    rm -f "$tmp_output"

    local ts_human
    ts_human=$(date '+%a %d %b %Y %H:%M:%S %Z')

    if [[ $exit_code -eq 124 ]]; then
        log_warn "E2E: test suite timed out after ${timeout_secs}s"
        echo "[E2E_TIMEOUT] ${framework} - timed out - ${ts_human}" >> progress.txt
    elif [[ $exit_code -eq 0 ]]; then
        log_success "E2E: all tests passed"
        echo "[E2E_PASS] ${framework} - ${ts_human}" >> progress.txt
    else
        log_warn "E2E: tests failed (exit code $exit_code)"
        echo "[E2E_FAIL] ${framework} - exit ${exit_code} - ${ts_human}" >> progress.txt
    fi

    return 0
}
