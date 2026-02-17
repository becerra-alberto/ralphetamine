---
id: "1.1"
epic: 1
title: "Initialize schema and data store"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 1.1 — Initialize Schema and Data Store

## User Story
As a developer, I want a data store initialization script so that the bookmarks JSON file is created with the correct schema.

## Technical Context
Create `src/init-store.sh` that initializes `data/bookmarks.json` with an empty array. Also create `src/lib.sh` with shared utility functions (json read/write helpers).

## Acceptance Criteria

### AC1: Store Initialization
- **Given** no data file exists
- **When** I run `bash src/init-store.sh`
- **Then** `data/bookmarks.json` is created with `[]`

### AC2: Idempotent Init
- **Given** the data file already exists with bookmarks
- **When** I run `bash src/init-store.sh`
- **Then** the existing data is preserved (no overwrite)

### AC3: Library Functions
- **Given** `src/lib.sh` is sourced
- **When** I call `bm_read_store`
- **Then** it returns the contents of the bookmarks JSON file

## Files to Create/Modify
- `src/init-store.sh` — Store initialization script (create)
- `src/lib.sh` — Shared library functions (create)
- `data/` — Data directory (create)

## Test Definition

### Unit Tests
- Verify store creates file with empty array
- Verify idempotent behavior preserves existing data
- Verify lib.sh functions load correctly

## Out of Scope
- Bookmark CRUD operations (later stories)
