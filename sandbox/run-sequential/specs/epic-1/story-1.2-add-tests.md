---
id: "1.2"
epic: 1
title: "Add test suite"
status: pending
priority: high
estimation: small
depends_on: [1.1]
---

# Story 1.2 — Add Test Suite

## User Story
As a developer, I want automated tests for the greeter script so that I can verify it works correctly.

## Technical Context
Create a test script that validates the greeter behavior. Tests should use simple bash assertions (no external test framework needed).

## Acceptance Criteria

### AC1: Test Script Exists
- **Given** story 1.1 is complete
- **When** I check `tests/test-greeter.sh`
- **Then** the file exists and has executable permissions

### AC2: Tests Pass
- **Given** the test script exists
- **When** I run `bash tests/test-greeter.sh`
- **Then** all tests pass with exit code 0

### AC3: Test Coverage
- **Given** the test script exists
- **When** I review the test cases
- **Then** it tests: default greeting, named greeting, and exit code

## Files to Create/Modify
- `tests/test-greeter.sh` — Test script for greeter (create)

## Test Definition

### Unit Tests
File: `tests/test-greeter.sh`
- Test default greeting outputs "Hello, Stranger!"
- Test named greeting outputs "Hello, Alice!"
- Test exit code is 0

## Out of Scope
- Testing flags (Story 1.3)
