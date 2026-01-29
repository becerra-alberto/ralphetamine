---
id: "4.1"
epic: 4
title: "Create Transaction List View"
status: done
priority: critical
estimation: large
depends_on: ["2.1"]
frs: ["FR18"]
---

# Story 4.1: Create Transaction List View

## User Story

As a **user**,
I want **to see all my transactions in a list**,
So that **I can review my spending history**.

## Technical Context

**Columns (from PRD Section 3.2.1):**
Date | Payee | Category | Memo | Outflow | Inflow | Account | Tags

**Data Display:**
- Amounts as currency
- Negative = outflow (red)
- Positive = inflow (green)
- Tags as chips

## Acceptance Criteria

### AC1: Table Structure
**Given** the user navigates to /transactions
**When** the view renders
**Then** a table displays with columns:
- Date (sortable)
- Payee
- Category
- Memo
- Outflow (negative amounts, red text)
- Inflow (positive amounts, green text)
- Account
- Tags (as chips)

### AC2: Data Display
**Given** transactions exist in database
**When** the list renders
**Then**:
- Sorted by date descending (newest first)
- Each row shows one transaction
- Currency formatted correctly
- Empty fields show "-" or blank

### AC3: Pagination
**Given** there are many transactions
**When** the list renders
**Then**:
- Shows 50 transactions per page
- Pagination controls at bottom
- "Page X of Y" indicator
- Previous/Next buttons

### AC4: Outflow/Inflow Display
**Given** a transaction has amount_cents
**When** displayed in table
**Then**:
- If negative: show in Outflow column, red, no minus sign
- If positive: show in Inflow column, green
- Empty column shows "-"
- Amounts formatted as €XXX.XX

### AC5: Row Interaction
**Given** a transaction row is displayed
**When** the user clicks the row
**Then**:
- Row expands to show edit form inline
- Or: row highlights and edit panel appears
- User can edit transaction details

### AC6: Empty State
**Given** no transactions exist
**When** the list renders
**Then**:
- Shows "No transactions yet" message
- Prompts to add first transaction
- Quick-add row still visible

### AC7: Column Sorting
**Given** the table header is displayed
**When** user clicks a column header
**Then**:
- Table sorts by that column
- Toggle asc/desc on repeated clicks
- Sort indicator shown on header

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/TransactionTable.test.ts` - Test table renders with all 8 columns (Date, Payee, Category, Memo, Outflow, Inflow, Account, Tags)
- [ ] `src/lib/__tests__/TransactionTable.test.ts` - Test default sort by date descending (newest first)
- [ ] `src/lib/__tests__/TransactionRow.test.ts` - Test centsToDollars conversion displays currency correctly (e.g., 12345 cents -> €123.45)
- [ ] `src/lib/__tests__/TransactionRow.test.ts` - Test negative amounts display in Outflow column with red text (no minus sign)
- [ ] `src/lib/__tests__/TransactionRow.test.ts` - Test positive amounts display in Inflow column with green text
- [ ] `src/lib/__tests__/TransactionRow.test.ts` - Test empty fields display "-" placeholder
- [ ] `src/lib/__tests__/TransactionRow.test.ts` - Test tags render as chip components
- [ ] `src/lib/__tests__/Pagination.test.ts` - Test pagination displays correct "Page X of Y" indicator
- [ ] `src/lib/__tests__/Pagination.test.ts` - Test Previous/Next buttons enable/disable correctly at boundaries
- [ ] `src/lib/__tests__/TransactionTable.test.ts` - Test empty state renders "No transactions yet" message
- [ ] `src/lib/__tests__/TransactionTable.test.ts` - Test column header click triggers sort with ascending/descending toggle

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test list_transactions returns paginated results (limit 50, offset)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test list_transactions default sort by date DESC
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test list_transactions returns correct total count for pagination
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test amount_cents stored and retrieved accurately (integer, no floating point loss)

### E2E Tests
- [ ] `e2e/transaction-list.spec.ts` - Test navigating to /transactions displays the transaction table
- [ ] `e2e/transaction-list.spec.ts` - Test row click expands inline edit form
- [ ] `e2e/transaction-list.spec.ts` - Test pagination navigation loads correct page of transactions
- [ ] `e2e/transaction-list.spec.ts` - Test column sorting persists and updates URL params

## Implementation Notes

1. Create TransactionTable component
2. Use virtual scrolling for performance (optional)
3. Fetch transactions with pagination params
4. Sort/filter on server side for performance
5. Consider table accessibility (ARIA)

## Files to Create/Modify

- `src/routes/transactions/+page.svelte`
- `src/lib/components/transactions/TransactionTable.svelte`
- `src/lib/components/transactions/TransactionRow.svelte`
- `src/lib/components/shared/Pagination.svelte`
- `src/lib/stores/transactions.ts`
- `src/lib/api/transactions.ts` - list with pagination
