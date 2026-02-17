---
id: "2.1"
epic: 2
title: "Build input handler and parser"
status: pending
priority: high
estimation: medium
depends_on: [1.2]
---

# Story 2.1 — Build Input Handler and Parser

## User Story
As a user, I want to type natural expressions like "2 + 3" so that I don't have to call individual functions.

## Technical Context
Create `src/parser.sh` that tokenizes and parses arithmetic expressions. Supports: numbers, +, -, *, /, parentheses. Operator precedence: * and / before + and -.

## Acceptance Criteria

### AC1: Simple Expressions
- **Given** the parser is sourced
- **When** I call `parse_expr "2 + 3"`
- **Then** it returns the result `5`

### AC2: Operator Precedence
- **Given** the parser is sourced
- **When** I call `parse_expr "2 + 3 * 4"`
- **Then** it returns `14` (not 20)

### AC3: Parentheses
- **Given** the parser is sourced
- **When** I call `parse_expr "(2 + 3) * 4"`
- **Then** it returns `20`

### AC4: Invalid Input
- **Given** the parser is sourced
- **When** I call `parse_expr "abc + 2"`
- **Then** it outputs "Error: invalid expression" and returns exit code 1

## Files to Create/Modify
- `src/parser.sh` — Expression parser (create)
- `tests/test-calc.sh` — Add parser tests (modify)

## Test Definition

### Unit Tests
File: `tests/test-calc.sh`
- Test simple two-operand expressions
- Test operator precedence
- Test parenthesized expressions
- Test invalid input handling
- Test whitespace handling

## Out of Scope
- Variables or assignment
- Functions like sqrt, pow
