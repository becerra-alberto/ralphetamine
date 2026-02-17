---
id: "1.1"
epic: 1
title: "Set up project structure"
status: done
priority: high
estimation: small
depends_on: []
---

# Story 1.1 — Set Up Project Structure

## User Story
As a developer, I want the project scaffolding in place so that subsequent stories have a clear structure to build on.

## Technical Context
Create the directory layout, main entry point stub, and test harness. The main script `bin/calc` will be the CLI entry point that dispatches to library functions in `src/`.

## Acceptance Criteria

### AC1: Directory Structure
- **Given** the project is initialized
- **When** I check the directory layout
- **Then** directories exist: `bin/`, `src/`, `tests/`

### AC2: Entry Point
- **Given** the project structure exists
- **When** I run `bash bin/calc --help`
- **Then** it displays usage information and exits with code 0

### AC3: Test Harness
- **Given** the project structure exists
- **When** I run `bash tests/test-calc.sh`
- **Then** it runs (even if no tests yet) and exits with code 0

## Files to Create/Modify
- `bin/calc` — CLI entry point with --help (create)
- `src/lib.sh` — Shared utilities placeholder (create)
- `tests/test-calc.sh` — Test harness with assertion helpers (create)

## Test Definition

### Unit Tests
File: `tests/test-calc.sh`
- Verify `bin/calc --help` exits with code 0
- Verify `bin/calc --version` prints version string

## Out of Scope
- Actual math operations (Story 1.2)
- Input parsing (Story 2.1)
