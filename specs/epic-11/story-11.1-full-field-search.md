---
id: "11.1"
epic: 11
title: "Full-Field Search (all columns)"
status: pending
priority: high
estimation: medium
depends_on: []
---

# Story 11.1: Full-Field Search (all columns)

## User Story

As a **user searching for transactions**,
I want **search to match across all columns (payee, memo, account, category, amount, tags)**,
So that **I can find any transaction regardless of which field contains my search term**.

## Technical Context

**Bug refs:** Item 3a (full-field search)

The transaction search currently only matches payee. The search filter should check all visible columns: payee, memo, accountName, categoryName, formatted amount, and tags. Case-insensitive matching throughout.

## Acceptance Criteria

### AC1: Multi-Field Matching
**Given** user types a search query
**When** filtering transactions
**Then**:
- Matches payee field
- Matches memo field
- Matches account name
- Matches category name
- Matches formatted amount (e.g., "500" finds 50000 cents)
- Matches tag values

### AC2: Case Insensitive
**Given** search query
**When** matching
**Then**:
- All matching is case-insensitive across all fields

### AC3: Search Placeholder
**Given** the search input
**When** rendered
**Then**:
- Placeholder text mentions all searchable fields

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — search matches payee
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — search matches memo
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — search matches accountName
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — search matches categoryName
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — search matches formatted amount (e.g., "500" finds 50000 cents)
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — search matches tags
- [ ] `src/lib/__tests__/stores/transactions.store.test.ts` — case-insensitive matching across all fields

### Component Tests
- [ ] `src/lib/__tests__/components/transactions/SearchBar.test.ts` — placeholder text mentions all searchable fields

## Implementation Notes

1. Update the transaction filter function in the store to check all fields
2. Format amount as string before matching (cents → formatted amount)
3. Join tags array into searchable string
4. Update SearchBar placeholder to indicate multi-field search

## Files to Create/Modify

- `src/lib/stores/transactions.ts` — update filter function for multi-field search
- `src/lib/components/transactions/SearchBar.svelte` — update placeholder text
