---
id: "3.1"
epic: 3
title: "CLI interface and dispatcher"
status: pending
priority: high
estimation: medium
depends_on: [2.1, 2.2, 2.3]
---

# Story 3.1 — CLI Interface and Dispatcher

## User Story
As a user, I want a single CLI entry point so that I can run all bookmark operations through one command.

## Technical Context
Create `bin/bookmarks` as the main CLI dispatcher that routes subcommands to the appropriate script in `src/`. Also create `tests/run-tests.sh` that executes all test files.

## Acceptance Criteria

### AC1: Subcommand Routing
- **Given** the CLI script exists
- **When** I run `bash bin/bookmarks list`
- **Then** it dispatches to `src/list.sh`

### AC2: All Subcommands
- **Given** the CLI script exists
- **When** I run subcommands: `init`, `seed`, `list`, `search`, `detail`
- **Then** each routes to the correct script

### AC3: Help Output
- **Given** the CLI script exists
- **When** I run `bash bin/bookmarks --help` or `bash bin/bookmarks` with no args
- **Then** it displays usage with all available subcommands

### AC4: Unknown Command
- **Given** the CLI script exists
- **When** I run `bash bin/bookmarks unknown`
- **Then** it displays "Unknown command: unknown" and shows help

### AC5: Test Runner
- **Given** test files exist
- **When** I run `bash tests/run-tests.sh`
- **Then** it runs all test-*.sh files and reports results

## Files to Create/Modify
- `bin/bookmarks` — CLI entry point (create)
- `tests/run-tests.sh` — Test runner script (create)

## Test Definition

### Integration Tests
File: `tests/test-cli.sh`
- Verify each subcommand routes correctly
- Verify help output lists all commands
- Verify unknown command shows error + help

## Out of Scope
- Additional subcommands beyond the current set
