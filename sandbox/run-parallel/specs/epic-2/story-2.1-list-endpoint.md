---
id: "2.1"
epic: 2
title: "List all bookmarks"
status: pending
priority: high
estimation: small
depends_on: [1.2]
---

# Story 2.1 — List All Bookmarks

## User Story
As a user, I want to list all my bookmarks in a formatted table so that I can see my collection.

## Technical Context
Create `src/list.sh` that reads `data/bookmarks.json` and displays bookmarks in a formatted table. Source `src/lib.sh` for shared functions.

## Acceptance Criteria

### AC1: Table Output
- **Given** bookmarks exist in the data store
- **When** I run `bash src/list.sh`
- **Then** it displays bookmarks in a formatted table with columns: ID, Title, URL

### AC2: Empty State
- **Given** the data store is empty
- **When** I run `bash src/list.sh`
- **Then** it displays "No bookmarks found."

### AC3: Sort by Title
- **Given** bookmarks exist
- **When** I run `bash src/list.sh --sort title`
- **Then** bookmarks are sorted alphabetically by title

## Files to Create/Modify
- `src/list.sh` — List bookmarks script (create)

## Test Definition

### Unit Tests
File: `tests/test-list.sh`
- Verify table output format
- Verify empty state message
- Verify sort flag works

## Out of Scope
- Filtering (Story 2.2)
- Detail view (Story 2.3)
