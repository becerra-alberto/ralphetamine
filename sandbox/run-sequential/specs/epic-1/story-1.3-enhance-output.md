---
id: "1.3"
epic: 1
title: "Enhance with flags and formatting"
status: pending
priority: medium
estimation: medium
depends_on: [1.2]
---

# Story 1.3 — Enhance with Flags and Formatting

## User Story
As a user, I want command-line flags for different greeting styles so that I can customize the output.

## Technical Context
Extend the greeter script to support `--uppercase`, `--shout`, and `--time` flags. Update tests to cover new functionality.

## Acceptance Criteria

### AC1: Uppercase Flag
- **Given** the greeter script exists
- **When** I run `bash src/greeter.sh --uppercase World`
- **Then** it outputs `HELLO, WORLD!`

### AC2: Shout Flag
- **Given** the greeter script exists
- **When** I run `bash src/greeter.sh --shout World`
- **Then** it outputs `HELLO, WORLD!!!`

### AC3: Time Flag
- **Given** the greeter script exists
- **When** I run `bash src/greeter.sh --time World`
- **Then** it outputs `Good <morning|afternoon|evening>, World!` based on current hour

### AC4: Help Flag
- **Given** the greeter script exists
- **When** I run `bash src/greeter.sh --help`
- **Then** it displays usage information and exits with code 0

### AC5: Updated Tests
- **Given** the new flags are implemented
- **When** I run `bash tests/test-greeter.sh`
- **Then** all tests pass including flag tests

## Files to Create/Modify
- `src/greeter.sh` — Add flag parsing (modify)
- `tests/test-greeter.sh` — Add flag tests (modify)

## Test Definition

### Unit Tests
File: `tests/test-greeter.sh`
- Test `--uppercase` converts output to uppercase
- Test `--shout` adds exclamation marks
- Test `--time` includes time-of-day greeting
- Test `--help` displays usage text
- Test unknown flags show error message

## Out of Scope
- Configuration files
- Internationalization
