---
status: pending
depends_on: []
---
# Story 2.2: Tag Management System

## Description
Add a tagging system that allows notes to be categorized with
multiple tags for organization and filtering.

## Acceptance Criteria
- `notely tag add <id> <tag>` adds tag to note
- `notely tag remove <id> <tag>` removes tag
- `notely tag list` shows all tags with counts
- `notely list --tag <tag>` filters by tag
- Tags stored in note frontmatter

## Test Definition
- Unit test: verify tag add/remove
- Unit test: verify list filtering
