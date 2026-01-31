---
status: pending
depends_on: []
validation_commands: ["npm test"]
---
# Story 2.3: Search Filters and Operators

## Description
Extend the search engine with filter operators for date ranges,
tags, and boolean logic (AND, OR, NOT).

## Acceptance Criteria
- `notely search "query" --tag work` filters by tag
- `notely search "query" --after 2024-01-01` date filter
- `notely search "query AND important"` boolean operators
- Filters combine with full-text search

## Test Definition
- Unit test: verify tag filter narrows results
- Unit test: verify date filter works
- Unit test: verify boolean operators parse correctly
