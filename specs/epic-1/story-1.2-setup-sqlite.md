---
id: "1.2"
epic: 1
title: "Setup SQLite Database with libsql"
status: pending
priority: critical
estimation: small
depends_on: ["1.1"]
---

# Story 1.2: Setup SQLite Database with libsql

## User Story

As a **user**,
I want **my financial data stored locally in SQLite**,
So that **my data persists between sessions and remains private**.

## Technical Context

**Stack Requirements (from PRD Section 7):**
- Database: SQLite with libsql
- Architecture: Local-first, sync-ready
- Privacy: Data never leaves device unless explicitly synced (NFR5)
- Performance: Sub-100ms response (NFR4)

**Data Storage Location:**
- macOS: `~/Library/Application Support/com.stackz.app/stackz.db`
- Windows: `%APPDATA%/com.stackz.app/stackz.db`

## Acceptance Criteria

### AC1: Database File Created
**Given** the Tauri app is running
**When** the app initializes for the first time
**Then** a SQLite database file is created at the appropriate OS location
**And** the database file has correct permissions (user read/write only)

### AC2: Database Connection via Tauri IPC
**Given** the database file exists
**When** the frontend calls `invoke('db_health_check')`
**Then** a response `{ status: 'ok', version: 'x.x.x' }` is returned
**And** the connection is established through Tauri's IPC mechanism

### AC3: CRUD Operations Work
**Given** the database connection is established
**When** basic CRUD operations are tested
**Then** INSERT, SELECT, UPDATE, DELETE operations succeed
**And** operations complete in under 100ms

### AC4: Data Persists Across Restarts
**Given** the app is closed with data in the database
**When** the app is reopened
**Then** the existing database is loaded (not recreated)
**And** previously stored data is accessible

### AC5: Database Migrations Support
**Given** the app initializes
**When** schema changes are needed
**Then** a migration system applies pending migrations
**And** migration history is tracked in a `_migrations` table

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/db.test.ts` - Test TypeScript db client wrapper correctly formats IPC calls
- [ ] `src/lib/__tests__/db.test.ts` - Test db client handles error responses gracefully

### Integration Tests (Rust)
- [ ] `src-tauri/src/db/connection.rs` - `#[cfg(test)]` test database connection opens successfully
- [ ] `src-tauri/src/db/connection.rs` - Test connection uses correct file path for platform (use temp dir in tests)
- [ ] `src-tauri/src/db/connection.rs` - Test database file has correct permissions (user read/write only)
- [ ] `src-tauri/src/db/migrations.rs` - `#[cfg(test)]` test migration runner creates `_migrations` table
- [ ] `src-tauri/src/db/migrations.rs` - Test migration runner tracks applied migrations
- [ ] `src-tauri/src/db/migrations.rs` - Test migration runner skips already-applied migrations
- [ ] `src-tauri/src/commands/db.rs` - `#[cfg(test)]` test `db_health_check` returns `{ status: 'ok', version }` format
- [ ] `src-tauri/src/commands/db.rs` - Test CRUD operations: INSERT returns new row ID
- [ ] `src-tauri/src/commands/db.rs` - Test CRUD operations: SELECT returns correct data
- [ ] `src-tauri/src/commands/db.rs` - Test CRUD operations: UPDATE modifies correct row
- [ ] `src-tauri/src/commands/db.rs` - Test CRUD operations: DELETE removes correct row

### Performance Tests
- [ ] `src-tauri/src/db/connection.rs` - `#[cfg(test)]` test CRUD operations complete in < 100ms (use `std::time::Instant`)

### E2E Tests
- [ ] `e2e/database.spec.ts` - Test `invoke('db_health_check')` returns ok status from frontend
- [ ] `e2e/database.spec.ts` - Test data persists after simulated app restart (close/reopen test)

## Implementation Notes

1. Use `tauri-plugin-sql` or direct `rusqlite` for SQLite access
2. Create Tauri commands for database operations
3. Implement connection pooling for performance
4. Add migration runner that executes on startup
5. Store database in OS-appropriate application data directory

## Files to Create/Modify

- `src-tauri/Cargo.toml` - add rusqlite/libsql dependency
- `src-tauri/src/db/mod.rs` - database module
- `src-tauri/src/db/connection.rs` - connection management
- `src-tauri/src/db/migrations.rs` - migration runner
- `src-tauri/src/commands/db.rs` - Tauri IPC commands
- `src/lib/db.ts` - TypeScript database client wrapper
