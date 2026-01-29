---
id: "1.3"
epic: 1
title: "Create Core Database Schema"
status: pending
priority: critical
estimation: medium
depends_on: ["1.2"]
---

# Story 1.3: Create Core Database Schema

## User Story

As a **developer**,
I want **the core database tables created (Category, Account)**,
So that **budget and transaction features can store their data**.

## Technical Context

**Data Model (from PRD Section 5):**
- Store amounts as **cents (integer)** to avoid floating point issues
- UUIDs for primary keys (sync-ready)
- Month identifiers use **YYYY-MM format**

**Default Categories (from PRD Appendix 10.2):**
| Section | Categories |
|---------|------------|
| Income | Salary, Freelance, Investments, Other Income |
| Housing | Rent/Mortgage, VVE Fees, Gas & Electricity, Water, Home Insurance |
| Essential | Groceries, Health/Medical, Phone/Internet, Transportation, Insurance |
| Lifestyle | Entertainment, Dining Out, Subscriptions, Shopping, Travel |
| Savings | Emergency Fund, Investments, Retirement, Goals |

## Acceptance Criteria

### AC1: Categories Table Created
**Given** the database migration runs
**When** the categories table is created
**Then** the schema matches:

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    icon TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);
```

### AC2: Accounts Table Created
**Given** the database migration runs
**When** the accounts table is created
**Then** the schema matches:

```sql
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'cash')),
    institution TEXT NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('EUR', 'USD', 'CAD')) DEFAULT 'EUR',
    is_active INTEGER NOT NULL DEFAULT 1,
    include_in_net_worth INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_active ON accounts(is_active);
```

### AC3: Default Categories Seeded
**Given** the migration completes
**When** default categories are queried
**Then** all categories from PRD Appendix 10.2 exist:
- 5 section categories (Income, Housing, Essential, Lifestyle, Savings)
- 20+ subcategories properly linked via parent_id
- Correct type assignment (income/expense)
- Sort order preserves logical grouping

### AC4: Categories Query Works
**Given** categories are seeded
**When** `invoke('get_categories')` is called
**Then** returns array of categories with nested structure
**And** response time < 50ms

### AC5: Accounts Table Empty Initially
**Given** the migration completes
**When** accounts are queried
**Then** an empty array is returned (user creates accounts)

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/types/category.test.ts` - Test Category TypeScript type matches expected structure
- [ ] `src/lib/__tests__/types/account.test.ts` - Test Account TypeScript type matches expected structure
- [ ] `src/lib/__tests__/types/category.test.ts` - Test category type enum contains only 'income', 'expense', 'transfer'
- [ ] `src/lib/__tests__/types/account.test.ts` - Test account type enum contains only 'checking', 'savings', 'credit', 'investment', 'cash'
- [ ] `src/lib/__tests__/types/account.test.ts` - Test currency enum contains only 'EUR', 'USD', 'CAD'

### Integration Tests (Rust)
- [ ] `src-tauri/src/db/migrations/mod.rs` - `#[cfg(test)]` test categories table has all required columns (id, name, parent_id, type, icon, color, sort_order, created_at, updated_at)
- [ ] `src-tauri/src/db/migrations/mod.rs` - Test categories table type CHECK constraint rejects invalid values
- [ ] `src-tauri/src/db/migrations/mod.rs` - Test categories table parent_id foreign key constraint works
- [ ] `src-tauri/src/db/migrations/mod.rs` - Test accounts table has all required columns
- [ ] `src-tauri/src/db/migrations/mod.rs` - Test accounts table type CHECK constraint rejects invalid values
- [ ] `src-tauri/src/db/migrations/mod.rs` - Test accounts table currency CHECK constraint rejects invalid values
- [ ] `src-tauri/src/db/migrations/mod.rs` - Test indexes exist (idx_categories_parent, idx_categories_type, idx_accounts_type, idx_accounts_active)
- [ ] `src-tauri/src/commands/categories.rs` - `#[cfg(test)]` test default categories seeded (count >= 25)
- [ ] `src-tauri/src/commands/categories.rs` - Test 5 parent section categories exist (Income, Housing, Essential, Lifestyle, Savings)
- [ ] `src-tauri/src/commands/categories.rs` - Test all subcategories have valid parent_id references
- [ ] `src-tauri/src/commands/categories.rs` - Test Income section categories have type='income'
- [ ] `src-tauri/src/commands/categories.rs` - Test expense section categories have type='expense'
- [ ] `src-tauri/src/commands/categories.rs` - Test `get_categories` returns nested structure with children array
- [ ] `src-tauri/src/commands/accounts.rs` - `#[cfg(test)]` test `get_accounts` returns empty array on fresh database

### Performance Tests
- [ ] `src-tauri/src/commands/categories.rs` - `#[cfg(test)]` test `get_categories` query completes in < 50ms
- [ ] `src-tauri/src/commands/accounts.rs` - `#[cfg(test)]` test `get_accounts` query completes in < 50ms

### E2E Tests
- [ ] `e2e/schema.spec.ts` - Test frontend can fetch and display categories via IPC
- [ ] `e2e/schema.spec.ts` - Test frontend receives empty accounts array on fresh install

## Implementation Notes

1. Create migration file: `001_create_core_tables.sql`
2. Create seed file: `seed_categories.sql`
3. Run seeds after migration on first install
4. Use UUIDs (v4) for all IDs
5. Implement Tauri commands: `get_categories`, `get_accounts`

## Files to Create/Modify

- `src-tauri/src/db/migrations/001_create_core_tables.sql`
- `src-tauri/src/db/seeds/categories.sql`
- `src-tauri/src/commands/categories.rs`
- `src-tauri/src/commands/accounts.rs`
- `src/lib/types/category.ts` - TypeScript types
- `src/lib/types/account.ts` - TypeScript types
