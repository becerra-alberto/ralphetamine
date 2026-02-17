---
id: "2.3"
epic: 2
title: "Bookmark detail view"
status: pending
priority: medium
estimation: small
depends_on: [1.2]
---

# Story 2.3 — Bookmark Detail View

## User Story
As a user, I want to view full details of a specific bookmark so that I can see all its metadata.

## Technical Context
Create `src/detail.sh` that displays all fields of a single bookmark by ID. Source `src/lib.sh` for shared functions.

## Acceptance Criteria

### AC1: Detail Display
- **Given** a bookmark with ID "1" exists
- **When** I run `bash src/detail.sh 1`
- **Then** it displays all fields: id, title, url, description, tags, created_at

### AC2: Not Found
- **Given** no bookmark with ID "999" exists
- **When** I run `bash src/detail.sh 999`
- **Then** it displays "Bookmark not found: 999" and exits with code 1

### AC3: Formatted Output
- **Given** a bookmark exists
- **When** I view its details
- **Then** each field is on its own line with a label (e.g., "Title: ...")

## Files to Create/Modify
- `src/detail.sh` — Bookmark detail script (create)

## Test Definition

### Unit Tests
File: `tests/test-detail.sh`
- Verify all fields displayed for valid ID
- Verify error message for invalid ID
- Verify exit code 1 for not found

## Out of Scope
- Edit functionality
- Delete functionality
