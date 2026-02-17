---
id: "2.2"
epic: 2
title: "Build output formatter"
status: pending
priority: medium
estimation: small
depends_on: [1.2]
---

# Story 2.2 — Build Output Formatter

## User Story
As a user, I want nicely formatted output so that results are easy to read.

## Technical Context
Create `src/formatter.sh` with functions to format numeric output. Supports decimal precision control, thousand separators, and result display with the original expression.

## Acceptance Criteria

### AC1: Default Formatting
- **Given** the formatter is sourced
- **When** I call `format_result "2 + 3" "5"`
- **Then** it outputs `2 + 3 = 5`

### AC2: Decimal Precision
- **Given** the formatter is sourced
- **When** I call `format_result "10 / 3" "3.333333" --precision 2`
- **Then** it outputs `10 / 3 = 3.33`

### AC3: Integer Results
- **Given** the formatter is sourced
- **When** a result is a whole number like `5.00`
- **Then** it strips trailing zeros: `5`

### AC4: Error Formatting
- **Given** the formatter is sourced
- **When** I call `format_error "division by zero"`
- **Then** it outputs `Error: division by zero` to stderr

## Files to Create/Modify
- `src/formatter.sh` — Output formatter (create)
- `tests/test-calc.sh` — Add formatter tests (modify)

## Test Definition

### Unit Tests
File: `tests/test-calc.sh`
- Test default result formatting
- Test precision flag
- Test integer result cleanup
- Test error formatting goes to stderr

## Out of Scope
- Color output
- Interactive mode display
