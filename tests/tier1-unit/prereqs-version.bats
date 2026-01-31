#!/usr/bin/env bats
# Tier 1 — Pure unit tests for prereqs.sh version functions

setup() {
    load "../helpers/setup.bash"
    load "../helpers/assertions.bash"
    export RALPH_LOG_FILE="/dev/null"
    export RALPH_VERBOSE="false"
    source_ralph_lib "ui"
    source_ralph_lib "prereqs"
}

@test "prereqs_bash_version returns major.minor format" {
    run prereqs_bash_version
    assert_success
    assert_output_matches '^[0-9]+\.[0-9]+$'
}

@test "prereqs_timeout_cmd returns timeout or gtimeout" {
    run prereqs_timeout_cmd
    assert_success
    # On any system, it should return one of: timeout, gtimeout, or empty
    [[ "$output" == "timeout" || "$output" == "gtimeout" || "$output" == "" ]]
}
