---
id: "11.2"
epic: 11
title: "Bank/Institution Columns"
status: pending
priority: medium
estimation: small
depends_on: []
---

# Story 11.2: Bank/Institution Columns

## User Story

As a **user viewing transactions**,
I want **to see which bank/institution each transaction belongs to**,
So that **I can quickly identify the source account**.

## Technical Context

**Bug refs:** Item 3b (bank column)

The transaction table currently has no institution column. Each transaction has an accountId that maps to an account which has an institution field. A new column should display the institution name by looking up the account.

## Acceptance Criteria

### AC1: Column Header
**Given** the transaction table
**When** rendered
**Then**:
- A "Bank/Institution" column header is visible
- Positioned after the account column

### AC2: Row Display
**Given** a transaction row
**When** rendered
**Then**:
- Displays the institution name from the account lookup
- Shows empty/dash if institution not set

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/transactions/TransactionTable.test.ts` — renders Bank/Institution column header
- [ ] `src/lib/__tests__/components/transactions/TransactionTable.test.ts` — each row displays institution name from account lookup
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — displays institution name in bank column cell

## Implementation Notes

1. Add institution column to TransactionTable header
2. In TransactionRow, look up account by accountId and display institution
3. Pass accounts data to rows (or use store lookup)

## Files to Create/Modify

- `src/lib/components/transactions/TransactionTable.svelte` — add column header
- `src/lib/components/transactions/TransactionRow.svelte` — display institution
