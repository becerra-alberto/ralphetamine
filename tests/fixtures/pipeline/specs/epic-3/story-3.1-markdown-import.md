---
status: pending
depends_on: [2.1]
---
# Story 3.1: Markdown Import Pipeline

## Description
Build an import pipeline that reads external markdown files
and converts them into Notely notes with proper indexing.

## Acceptance Criteria
- `notely import <file.md>` imports single file
- `notely import <dir>` imports all .md files from directory
- Imported notes are indexed by the search engine
- Duplicate detection by content hash

## Test Definition
- Unit test: verify single file import
- Unit test: verify directory import
- Unit test: verify search indexes imported notes
