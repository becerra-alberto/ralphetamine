---
id: "2.2"
epic: 2
title: "Search bookmarks"
status: pending
priority: high
estimation: medium
depends_on: [1.2]
---

# Story 2.2 — Search Bookmarks

## User Story
As a user, I want to search my bookmarks by keyword so that I can find specific entries quickly.

## Technical Context
Create `src/search.sh` that searches across bookmark titles, descriptions, and URLs. Source `src/lib.sh` for shared functions.

## Acceptance Criteria

### AC1: Text Search
- **Given** bookmarks exist in the data store
- **When** I run `bash src/search.sh "github"`
- **Then** it returns bookmarks matching "github" in title, description, or URL

### AC2: Tag Filter
- **Given** bookmarks exist with tags
- **When** I run `bash src/search.sh --tag "dev"`
- **Then** it returns only bookmarks with the "dev" tag

### AC3: No Results
- **Given** bookmarks exist
- **When** I run `bash src/search.sh "nonexistent"`
- **Then** it displays "No matching bookmarks found."

### AC4: Case Insensitive
- **Given** a bookmark with title "GitHub Repos"
- **When** I run `bash src/search.sh "github"`
- **Then** it matches regardless of case

## Files to Create/Modify
- `src/search.sh` — Search bookmarks script (create)

## Test Definition

### Unit Tests
File: `tests/test-search.sh`
- Verify text search matches across fields
- Verify tag filter works
- Verify no-results message
- Verify case-insensitive matching

## Out of Scope
- Regex search
- Fuzzy matching
