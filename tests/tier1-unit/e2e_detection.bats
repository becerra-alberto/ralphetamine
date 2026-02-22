#!/usr/bin/env bats
# Tier 1 — Unit tests for E2E framework detection functions

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    setup_test_environment
    source_ralph_lib "ui"
    source_ralph_lib "config"
    source_ralph_lib "signals"
    source_ralph_lib "testing"
}

teardown() {
    teardown_test_environment
}

# ── e2e_detect_framework ──────────────────────────────────────────────────────

@test "e2e_detect_framework: detects bats from .bats file" {
    mkdir -p tests
    touch tests/my-test.bats
    run e2e_detect_framework
    assert_success
    assert_output "bats"
}

@test "e2e_detect_framework: detects pytest from pytest.ini" {
    echo "[pytest]" > pytest.ini
    run e2e_detect_framework
    assert_success
    assert_output "pytest"
}

@test "e2e_detect_framework: detects jest from package.json" {
    echo '{"scripts":{"test":"jest"}}' > package.json
    run e2e_detect_framework
    assert_success
    assert_output "jest"
}

@test "e2e_detect_framework: detects go from .go files" {
    mkdir -p pkg
    touch pkg/main.go
    run e2e_detect_framework
    assert_success
    assert_output "go"
}

@test "e2e_detect_framework: detects make from Makefile with test target" {
    printf 'test:\n\techo running tests\n' > Makefile
    run e2e_detect_framework
    assert_success
    assert_output "make"
}

@test "e2e_detect_framework: returns unknown when no framework found" {
    run e2e_detect_framework
    assert_success
    assert_output "unknown"
}

# ── e2e_build_test_command ────────────────────────────────────────────────────

@test "e2e_build_test_command: bats returns correct command" {
    run e2e_build_test_command "bats"
    assert_success
    assert_output "tests/libs/bats-core/bin/bats tests/"
}

@test "e2e_build_test_command: unknown returns failure" {
    run e2e_build_test_command "unknown"
    assert_failure
}

# ── e2e_check_fixtures ────────────────────────────────────────────────────────

@test "e2e_check_fixtures: bats returns 1 with no .bats files" {
    run e2e_check_fixtures "bats"
    assert_failure
}

@test "e2e_check_fixtures: bats returns 0 when .bats files exist" {
    mkdir -p tests
    touch tests/my-test.bats
    run e2e_check_fixtures "bats"
    assert_success
}
