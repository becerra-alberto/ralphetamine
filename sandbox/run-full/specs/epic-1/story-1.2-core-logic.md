---
id: "1.2"
epic: 1
title: "Implement core math logic"
status: done
priority: high
estimation: medium
depends_on: [1.1]
---

# Story 1.2 — Implement Core Math Logic

## User Story
As a user, I want the calculator to perform basic arithmetic so that I can compute results.

## Technical Context
Create `src/math.sh` with functions for add, subtract, multiply, divide. Use `bc` for floating-point support. Each function takes two operands and prints the result.

## Acceptance Criteria

### AC1: Basic Operations
- **Given** the math library is sourced
- **When** I call `calc_add 2 3`
- **Then** it outputs `5`

### AC2: Floating Point
- **Given** the math library is sourced
- **When** I call `calc_divide 10 3`
- **Then** it outputs `3.33` (2 decimal places by default)

### AC3: Division by Zero
- **Given** the math library is sourced
- **When** I call `calc_divide 10 0`
- **Then** it outputs "Error: division by zero" and returns exit code 1

### AC4: Negative Numbers
- **Given** the math library is sourced
- **When** I call `calc_subtract 3 7`
- **Then** it outputs `-4`

## Files to Create/Modify
- `src/math.sh` — Core math functions (create)
- `tests/test-calc.sh` — Add math tests (modify)

## Test Definition

### Unit Tests
File: `tests/test-calc.sh`
- Test addition: 2+3=5, 0+0=0, -1+1=0
- Test subtraction: 5-3=2, 3-7=-4
- Test multiplication: 3*4=12, 0*5=0
- Test division: 10/2=5, 10/3=3.33
- Test division by zero returns error

## Out of Scope
- Expression parsing (Story 2.1)
- Output formatting (Story 2.2)
