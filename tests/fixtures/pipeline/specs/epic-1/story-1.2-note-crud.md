---
status: pending
depends_on: []
---
# Story 1.2: Add Note CRUD Commands

## Description
Implement create, read, update, and delete commands for notes.
Notes are stored as markdown files in a local directory.

## Acceptance Criteria
- `notely add "title"` creates a new note
- `notely list` shows all notes
- `notely show <id>` displays note content
- `notely edit <id>` opens note for editing
- `notely delete <id>` removes a note
- Input validation on all commands

## Test Definition
- Unit test: verify add creates file
- Unit test: verify list returns correct count
- Unit test: verify delete removes file
