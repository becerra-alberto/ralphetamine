---
status: pending
depends_on: [2.1, 2.2]
---
# Story 3.2: JSON/CSV Export

## Description
Implement export functionality to JSON and CSV formats,
including search results and tag-filtered collections.

## Acceptance Criteria
- `notely export --format json` exports all notes
- `notely export --format csv` exports all notes
- `notely export --tag work --format json` filtered export
- Export includes tags and search metadata

## Test Definition
- Unit test: verify JSON output structure
- Unit test: verify CSV headers and rows
- Unit test: verify filtered export correctness
