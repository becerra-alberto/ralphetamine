---
id: "3.1"
epic: 3
title: "Wire up integration and CLI entry point"
status: done
priority: high
estimation: medium
depends_on: [2.1, 2.2]
---

# Story 3.1 — Wire Up Integration and CLI Entry Point

## User Story
As a user, I want to run `calc "2 + 3"` and get a formatted result so that the full pipeline works end-to-end.

## Technical Context
Update `bin/calc` to wire together parser, math, and formatter. Support both single-expression mode and interactive REPL mode. Add comprehensive integration tests.

## Acceptance Criteria

### AC1: Single Expression
- **Given** all components are wired up
- **When** I run `bash bin/calc "2 + 3"`
- **Then** it outputs `2 + 3 = 5`

### AC2: Complex Expression
- **Given** all components are wired up
- **When** I run `bash bin/calc "(10 + 5) / 3"`
- **Then** it outputs `(10 + 5) / 3 = 5`

### AC3: Precision Flag
- **Given** all components are wired up
- **When** I run `bash bin/calc --precision 4 "10 / 3"`
- **Then** it outputs `10 / 3 = 3.3333`

### AC4: Error Handling
- **Given** all components are wired up
- **When** I run `bash bin/calc "10 / 0"`
- **Then** it outputs an error and exits with code 1

### AC5: Interactive Mode
- **Given** all components are wired up
- **When** I run `bash bin/calc` with no expression
- **Then** it enters a REPL loop prompting for expressions

## Files to Create/Modify
- `bin/calc` — Wire up full pipeline (modify)
- `tests/test-calc.sh` — Add integration tests (modify)

## Test Definition

### Integration Tests
File: `tests/test-calc.sh`
- Test single expression end-to-end
- Test complex expression with parentheses
- Test precision flag
- Test error propagation
- Test help and version flags still work

## Out of Scope
- History/recall in interactive mode
- Configuration file
