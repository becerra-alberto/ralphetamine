---
status: pending
depends_on: []
---
# Story 2.1: Full-Text Search Engine

## Description
Implement a full-text search engine that indexes note content
and supports keyword queries across all notes.

## Acceptance Criteria
- `notely search "query"` returns matching notes
- Search indexes note title and body content
- Results ranked by relevance
- Search completes in under 100ms for 1000 notes

## Test Definition
- Unit test: verify indexing stores tokens
- Unit test: verify search returns correct matches
- Performance test: 1000 notes under 100ms
