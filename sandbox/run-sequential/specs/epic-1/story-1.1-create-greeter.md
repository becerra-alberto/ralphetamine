---
id: "1.1"
epic: 1
title: "Create greeting script"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 1.1 — Create Greeting Script

## User Story
As a user, I want a bash script that greets me by name so that I can test basic script execution.

## Technical Context
Create the foundational greeting script in `src/greeter.sh`. This is the base that subsequent stories will build upon.

## Acceptance Criteria

### AC1: Script Exists and Is Executable
- **Given** the project is set up
- **When** I check `src/greeter.sh`
- **Then** the file exists and has executable permissions

### AC2: Basic Greeting
- **Given** the greeter script exists
- **When** I run `bash src/greeter.sh World`
- **Then** it outputs `Hello, World!`

### AC3: Default Greeting
- **Given** the greeter script exists
- **When** I run `bash src/greeter.sh` with no arguments
- **Then** it outputs `Hello, Stranger!`

## Files to Create/Modify
- `src/greeter.sh` — Main greeting script (create)

## Test Definition

### Unit Tests
- Verify script exits with code 0
- Verify output matches `Hello, <name>!` format
- Verify default name is "Stranger" when no argument given

## Out of Scope
- Flags and options (Story 1.3)
- Test framework (Story 1.2)
