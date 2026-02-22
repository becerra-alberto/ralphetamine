#!/usr/bin/env bats
# Tier 1 — Unit tests for new signals: DISCOVERY_DONE and E2E_SETUP_DONE

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    source_ralph_lib "signals"
}

# ── signals_parse_discovery_done ─────────────────────────────────────────────

@test "parse_discovery_done: extracts PRD path" {
    run signals_parse_discovery_done '<ralph>DISCOVERY_DONE: tasks/prd-discovery-testing.md</ralph>'
    assert_success
    assert_output "tasks/prd-discovery-testing.md"
}

@test "parse_discovery_done: no match returns failure" {
    run signals_parse_discovery_done 'No discovery signal here'
    assert_failure
}

@test "parse_discovery_done: trims leading and trailing whitespace" {
    run signals_parse_discovery_done '<ralph>DISCOVERY_DONE:   tasks/prd-discovery-foo.md   </ralph>'
    assert_success
    assert_output "tasks/prd-discovery-foo.md"
}

# ── signals_parse_e2e_setup_done ─────────────────────────────────────────────

@test "parse_e2e_setup_done: extracts summary" {
    run signals_parse_e2e_setup_done '<ralph>E2E_SETUP_DONE: 3 files created</ralph>'
    assert_success
    assert_output "3 files created"
}

@test "parse_e2e_setup_done: no match returns failure" {
    run signals_parse_e2e_setup_done 'No e2e setup signal here'
    assert_failure
}
