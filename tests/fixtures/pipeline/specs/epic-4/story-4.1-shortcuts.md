---
status: pending
depends_on: []
---
# Story 4.1: Keyboard Shortcuts

## Description
Add keyboard shortcut support for common operations
in interactive mode.

## Acceptance Criteria
- Ctrl+N creates new note
- Ctrl+F opens search
- Ctrl+D deletes selected note
- Shortcuts listed in --help

## Test Definition
- Unit test: verify shortcut bindings registered
- Unit test: verify help output includes shortcuts
