---
status: pending
depends_on: []
---
# Story 1.2: Setup Database

## Description
Create the SQLite database schema and migration system.

## Acceptance Criteria
- Database file created in data/ directory
- Schema migration runs successfully
- Tables exist with correct columns

## Test Definition
- Unit test: verify schema creation
- Unit test: verify migration runs idempotently
