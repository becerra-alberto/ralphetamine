---
id: "2.1"
epic: 2
title: "Create Budget and Transaction Database Tables"
status: pending
priority: critical
estimation: medium
depends_on: ["1.3"]
---

# Story 2.1: Create Budget and Transaction Database Tables

## User Story

As a **developer**,
I want **the budget and transaction tables created**,
So that **budget and spending data can be stored and queried**.

## Technical Context

**Data Model (from PRD Section 5):**
- Amounts stored as **cents (integer)** - positive = income, negative = expense
- Month format: **YYYY-MM** (e.g., "2025-01")
- Tags stored as JSON array
- Foreign keys to categories and accounts tables

## Acceptance Criteria

### AC1: Budgets Table Created
**Given** the database migration runs
**When** the budgets table is created
**Then** the schema matches:

```sql
CREATE TABLE budgets (
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
    amount_cents INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (category_id, month)
);
CREATE INDEX idx_budgets_month ON budgets(month);
```

### AC2: Transactions Table Created
**Given** the database migration runs
**When** the transactions table is created
**Then** the schema matches:

```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
    payee TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    memo TEXT,
    amount_cents INTEGER NOT NULL,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    tags TEXT NOT NULL DEFAULT '[]',
    is_reconciled INTEGER NOT NULL DEFAULT 0,
    import_source TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_payee ON transactions(payee);
```

### AC3: Budget CRUD Operations Work
**Given** the tables exist
**When** budget operations are tested
**Then**:
- `set_budget(category_id, month, amount_cents)` inserts/updates budget
- `get_budget(category_id, month)` returns budget or null
- `get_budgets_for_month(month)` returns all budgets for a month
- `get_budgets_for_category(category_id, start_month, end_month)` returns range

### AC4: Transaction CRUD Operations Work
**Given** the tables exist
**When** transaction operations are tested
**Then**:
- `create_transaction(...)` inserts and returns new transaction
- `get_transaction(id)` returns transaction by ID
- `update_transaction(id, ...)` updates fields
- `delete_transaction(id)` removes transaction
- `get_transactions(filters)` returns filtered list

### AC5: Aggregation Queries Work
**Given** transactions exist
**When** aggregation is needed
**Then**:
- `get_category_totals(month)` returns SUM(amount_cents) grouped by category
- `get_uncategorized_total(month)` returns sum where category_id IS NULL
- Query performance < 100ms for 10,000 transactions

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/budget.types.test.ts` - Test Budget TypeScript type definitions match schema
- [ ] `src/lib/__tests__/transaction.types.test.ts` - Test Transaction TypeScript type definitions match schema
- [ ] `src/lib/__tests__/api/budgets.test.ts` - Test frontend budget API wrapper functions
- [ ] `src/lib/__tests__/api/transactions.test.ts` - Test frontend transaction API wrapper functions

### Integration Tests (Rust/Tauri)
- [ ] `src-tauri/src/commands/budgets_test.rs` - Test `set_budget` inserts/updates budget with cents arithmetic
- [ ] `src-tauri/src/commands/budgets_test.rs` - Test `get_budget` returns correct budget or null
- [ ] `src-tauri/src/commands/budgets_test.rs` - Test `get_budgets_for_month` returns all budgets for YYYY-MM
- [ ] `src-tauri/src/commands/budgets_test.rs` - Test `get_budgets_for_category` returns correct range
- [ ] `src-tauri/src/commands/budgets_test.rs` - Test month format validation (YYYY-MM pattern)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `create_transaction` with amount_cents (integer)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `get_transaction` by ID
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `update_transaction` preserves cents precision
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `delete_transaction` cascade behavior
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `get_transactions` with various filters
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `get_category_totals` aggregation in cents
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `get_uncategorized_total` where category_id IS NULL
- [ ] `src-tauri/src/db/migrations_test.rs` - Test budgets table schema matches specification
- [ ] `src-tauri/src/db/migrations_test.rs` - Test transactions table schema matches specification
- [ ] `src-tauri/src/db/migrations_test.rs` - Test foreign key constraints work correctly
- [ ] `src-tauri/src/db/migrations_test.rs` - Test indexes are created (idx_budgets_month, idx_transactions_*)

### Performance Tests
- [ ] `src-tauri/src/commands/transactions_perf_test.rs` - Test query performance < 100ms with 10,000 transactions
- [ ] `src-tauri/src/commands/transactions_perf_test.rs` - Test aggregation performance with large datasets

## Implementation Notes

1. Create migration: `002_create_budget_transaction_tables.sql`
2. Create Tauri commands for all CRUD operations
3. Use parameterized queries to prevent SQL injection
4. Implement batch insert for CSV import (later)
5. Add database triggers for updated_at timestamps

## Files to Create/Modify

- `src-tauri/src/db/migrations/002_create_budget_transaction_tables.sql`
- `src-tauri/src/commands/budgets.rs`
- `src-tauri/src/commands/transactions.rs`
- `src/lib/types/budget.ts`
- `src/lib/types/transaction.ts`
- `src/lib/api/budgets.ts` - frontend API wrapper
- `src/lib/api/transactions.ts` - frontend API wrapper
