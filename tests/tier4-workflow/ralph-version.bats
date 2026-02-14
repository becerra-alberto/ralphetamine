#!/usr/bin/env bats
# Tier 4 — Workflow test: ralph --version

setup() {
    load "../helpers/setup.bash"
    RALPH_BIN="${RALPH_DIR}/bin/ralph"
}

@test "ralph --version outputs version string" {
    run "$RALPH_BIN" --version
    assert_success
    assert_output "Ralph v2.4.0"
}
