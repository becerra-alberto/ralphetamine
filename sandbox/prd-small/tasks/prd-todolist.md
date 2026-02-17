# PRD: Todolist CLI

## Overview
A simple command-line todo list manager written in pure bash. Stores tasks in a plain text file and supports basic CRUD operations.

## Technical Stack
- Language: Bash 3.2+
- Storage: Plain text file (`~/.todolist/tasks.txt`)
- Testing: Bash test scripts with assertions

## Epic 1: Core Todo Management

### Story 1.1: Initialize Project Structure
Set up the project directory layout with `bin/todo`, a `src/` directory for library functions, and a `tests/` directory. The main `bin/todo` script should parse subcommands (`add`, `list`, `done`, `remove`) and dispatch to the appropriate function. Include `--help` and `--version` flags.

### Story 1.2: Implement CRUD Operations
Implement the core operations:
- `todo add "task description"` — append a new task with auto-incremented ID
- `todo list` — display all tasks with IDs and status
- `todo done <id>` — mark a task as completed
- `todo remove <id>` — delete a task permanently
Tasks are stored one-per-line in `tasks.txt` with format: `ID|STATUS|DESCRIPTION`

### Story 1.3: Add Filtering and Search
Add filtering capabilities:
- `todo list --active` — show only incomplete tasks
- `todo list --done` — show only completed tasks
- `todo search <term>` — full-text search across task descriptions
- Color-coded output (green for done, default for active)
