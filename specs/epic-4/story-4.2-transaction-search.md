---
id: "4.2"
epic: 4
title: "Implement Transaction Search"
status: done
priority: high
estimation: medium
depends_on: ["4.1"]
frs: ["FR14"]
---

# Story 4.2: Implement Transaction Search

## User Story

As a **user**,
I want **to search transactions by payee or memo**,
So that **I can quickly find specific transactions**.

## Technical Context

**Search Behavior (from PRD Section 3.2.1):**
- Full-text search across payee and memo
- Case-insensitive
- Instant filtering as you type

## Acceptance Criteria

### AC1: Search Bar Display
**Given** the transaction view is displayed
**When** the header renders
**Then**:
- Search input visible in header area
- Placeholder text: "Search transactions..."
- Search icon visible
- Clear button when text entered

### AC2: Focus Shortcut
**Given** the transaction view is displayed
**When** the user presses Cmd+F
**Then**:
- Focus moves to search input
- Any existing text is selected
- Cursor ready to type

### AC3: Search on Type
**Given** the search input is focused
**When** the user types 2+ characters
**Then**:
- Transaction list filters immediately (or with 150ms debounce)
- Matches against payee field (case-insensitive)
- Matches against memo field (case-insensitive)
- Count updates: "Showing X of Y transactions"

### AC4: Search Results
**Given** a search query is entered
**When** results are displayed
**Then**:
- Only matching transactions shown
- Match highlighting (optional)
- Empty state if no matches: "No transactions match 'query'"

### AC5: Clear Search
**Given** a search is active
**When** the user clicks clear button OR clears input
**Then**:
- Search query removed
- All transactions shown again
- Pagination resets to page 1

### AC6: Search Persistence
**Given** a search is active
**When** the user navigates away and back
**Then**:
- Search is cleared (fresh start)
- Or: persisted in URL params (optional)

### AC7: Performance
**Given** 10,000+ transactions exist
**When** searching
**Then**:
- Results appear within 200ms
- UI remains responsive
- Consider server-side search for large datasets

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test search bar renders with placeholder "Search transactions..."
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test search icon displays correctly
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test clear button appears when text is entered
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test clear button click empties input and emits clear event
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test input debounces at 150ms before emitting search event
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test no search event emitted for queries under 2 characters
- [ ] `src/lib/__tests__/SearchBar.test.ts` - Test "Showing X of Y transactions" count updates on filter
- [ ] `src/lib/__tests__/transactions.store.test.ts` - Test fuzzy matching algorithm for partial payee matches
- [ ] `src/lib/__tests__/transactions.store.test.ts` - Test case-insensitive matching (uppercase, lowercase, mixed)

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test search_transactions with payee filter (LIKE query)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test search_transactions with memo filter (LIKE query)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test search_transactions matches across both payee AND memo fields
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test search returns empty result set gracefully
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test search performance with 10,000+ transactions completes under 200ms

### E2E Tests
- [ ] `e2e/transaction-search.spec.ts` - Test Cmd+F keyboard shortcut focuses search input and selects existing text
- [ ] `e2e/transaction-search.spec.ts` - Test typing filters transaction list in real-time
- [ ] `e2e/transaction-search.spec.ts` - Test no matches displays "No transactions match 'query'" message
- [ ] `e2e/transaction-search.spec.ts` - Test clear button restores full transaction list and resets pagination to page 1
- [ ] `e2e/transaction-search.spec.ts` - Test search state clears when navigating away and returning

## Implementation Notes

1. Use SQL LIKE or FTS for search
2. Debounce input (150-200ms)
3. Search server-side for performance
4. Consider SQLite FTS5 for full-text search
5. Update URL with search param (optional)

## Files to Create/Modify

- `src/lib/components/transactions/SearchBar.svelte`
- `src/routes/transactions/+page.svelte` - add search
- `src/lib/stores/transactions.ts` - search state
- `src-tauri/src/commands/transactions.rs` - search query
