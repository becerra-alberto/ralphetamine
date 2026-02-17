#!/bin/bash
# Ralphetamine Test Helpers — Mock command generator

MOCK_BIN_DIR=""

# Create a mock command on PATH
# Usage: create_mock_command "claude" 'echo "mock output"'
create_mock_command() {
    local name="$1"
    local body="$2"

    if [[ -z "$MOCK_BIN_DIR" ]]; then
        MOCK_BIN_DIR="${BATS_TEST_TMPDIR}/mocks-$$"
        mkdir -p "$MOCK_BIN_DIR"
        export PATH="${MOCK_BIN_DIR}:${PATH}"
    fi

    cat > "${MOCK_BIN_DIR}/${name}" <<MOCK_EOF
#!/bin/bash
${body}
MOCK_EOF
    chmod +x "${MOCK_BIN_DIR}/${name}"
}

# Mock the claude CLI to output contents of a fixture file
# Usage: mock_claude_output "claude-outputs/done.txt"
mock_claude_output() {
    local fixture_file="$1"
    local fixture_path="${TESTS_DIR}/fixtures/${fixture_file}"
    create_mock_command "claude" "cat '${fixture_path}'"
}

# Mock the claude CLI to exit with a specific code
# Usage: mock_claude_exit 124  (for timeout simulation)
mock_claude_exit() {
    local code="$1"
    create_mock_command "claude" "exit ${code}"
}

# Clean up mock bin directory
cleanup_mocks() {
    if [[ -n "$MOCK_BIN_DIR" && -d "$MOCK_BIN_DIR" ]]; then
        rm -rf "$MOCK_BIN_DIR"
        MOCK_BIN_DIR=""
    fi
}
