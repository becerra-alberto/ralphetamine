#!/bin/bash
# Ralphetamine Test Helpers — Custom assertions

# Assert a file contains a pattern
# Usage: assert_file_contains "path/to/file" "expected pattern"
assert_file_contains() {
    local file="$1"
    local pattern="$2"

    if [[ ! -f "$file" ]]; then
        echo "assert_file_contains: file does not exist: $file" >&2
        return 1
    fi

    if ! grep -q "$pattern" "$file"; then
        echo "assert_file_contains: pattern not found in $file" >&2
        echo "  pattern: $pattern" >&2
        echo "  contents:" >&2
        cat "$file" >&2
        return 1
    fi
}

# Assert a file does NOT contain a pattern
assert_file_not_contains() {
    local file="$1"
    local pattern="$2"

    if [[ ! -f "$file" ]]; then
        # File doesn't exist — pattern can't be in it
        return 0
    fi

    if grep -q "$pattern" "$file"; then
        echo "assert_file_not_contains: pattern unexpectedly found in $file" >&2
        echo "  pattern: $pattern" >&2
        return 1
    fi
}

# Assert a JSON file field matches expected value (via jq)
# Usage: assert_json_field "state.json" ".retry_count" "2"
assert_json_field() {
    local file="$1"
    local jq_path="$2"
    local expected="$3"

    if [[ ! -f "$file" ]]; then
        echo "assert_json_field: file does not exist: $file" >&2
        return 1
    fi

    local actual
    actual=$(jq -r "$jq_path" "$file" 2>/dev/null)

    if [[ "$actual" != "$expected" ]]; then
        echo "assert_json_field: mismatch at $jq_path" >&2
        echo "  expected: $expected" >&2
        echo "  actual:   $actual" >&2
        return 1
    fi
}

# Assert $output matches a regex pattern
# Usage: assert_output_matches "^[0-9]+\.[0-9]+$"
assert_output_matches() {
    local pattern="$1"

    if [[ ! "$output" =~ $pattern ]]; then
        echo "assert_output_matches: output does not match pattern" >&2
        echo "  pattern: $pattern" >&2
        echo "  output:  $output" >&2
        return 1
    fi
}
