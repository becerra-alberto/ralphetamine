# PRD: Bookshelf CLI

## Overview
A command-line book collection manager written in pure bash. Stores books in a JSON file and supports browsing, searching, and organizing a personal library.

## Technical Stack
- Language: Bash 3.2+
- Storage: JSON file (`~/.bookshelf/books.json`) via jq
- Testing: Bash test scripts with assertions

## Epic 1: Foundation

### Story 1.1: Initialize Project and Data Store
Set up project structure with `bin/bookshelf`, `src/` for library functions, and `tests/`. Create the data store initialization that creates `~/.bookshelf/books.json` with an empty array on first run. Include `--help` and `--version` flags.

### Story 1.2: Add Book Management
Implement adding books to the collection:
- `bookshelf add --title "Title" --author "Author"` — required fields
- `bookshelf add --title "Title" --author "Author" --isbn "123" --year 2024 --genre "fiction"` — optional fields
- Auto-generate a unique ID for each book
- Validate that title and author are non-empty

## Epic 2: Browse and Search

### Story 2.1: List and Display Books
Implement browsing the collection:
- `bookshelf list` — show all books in a formatted table
- `bookshelf list --sort title|author|year` — sort by field
- `bookshelf show <id>` — display full details of a single book
- Paginate output if more than 20 books

### Story 2.2: Search and Filter
Implement search capabilities:
- `bookshelf search <term>` — full-text search across title and author
- `bookshelf list --genre "fiction"` — filter by genre
- `bookshelf list --author "Name"` — filter by author
- `bookshelf list --year 2024` — filter by year
- Combine multiple filters with AND logic

### Story 2.3: Reading Status Tracking
Track reading progress:
- `bookshelf status <id> unread|reading|finished` — set reading status
- `bookshelf list --status reading` — filter by reading status
- `bookshelf stats` — show summary counts by status
- Default status for new books is "unread"

## Epic 3: Organization

### Story 3.1: Collection Management
Implement collection organization:
- `bookshelf edit <id> --title "New Title"` — update any field
- `bookshelf remove <id>` — delete a book (with confirmation prompt)
- `bookshelf export --format csv` — export collection to CSV
- `bookshelf export --format json` — export as formatted JSON

### Story 3.2: Import and Backup
Implement data portability:
- `bookshelf import <file.csv>` — import books from CSV
- `bookshelf import <file.json>` — import from JSON
- `bookshelf backup` — create timestamped backup of the data file
- `bookshelf restore <backup-file>` — restore from a backup
- Skip duplicates on import (match by ISBN or title+author)
