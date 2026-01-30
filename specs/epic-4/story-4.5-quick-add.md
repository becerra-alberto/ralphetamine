---
id: "4.5"
epic: 4
title: "Implement Quick-Add Transaction Row"
status: done
priority: critical
estimation: medium
depends_on: ["4.1"]
frs: ["FR17"]
---

# Story 4.5: Implement Quick-Add Transaction Row

## User Story

As a **user**,
I want **to quickly add transactions without opening a modal**,
So that **I can efficiently record my spending**.

## Technical Context

**Quick-Add Fields (from PRD Section 3.2.2):**
- Date (default: today)
- Payee (required)
- Category (optional initially)
- Memo (optional)
- Amount (required, with +/- toggle)
- Account (required)
- Save button

## Acceptance Criteria

### AC1: Quick-Add Row Position
**Given** the transaction view is displayed
**When** the view renders
**Then**:
- Quick-add row appears at top of transaction list
- Above all existing transactions
- Visually distinct (subtle background)

### AC2: Field Display
**Given** the quick-add row renders
**When** fields are displayed
**Then** shows inline fields:
- Date picker (compact)
- Payee text input
- Category dropdown
- Memo text input (narrower)
- Amount input with +/- toggle
- Account dropdown
- Save button

### AC3: Default Values
**Given** the quick-add row renders
**When** default values are set
**Then**:
- Date: today's date
- Amount sign: expense (negative) by default
- Account: last used account (or first if new)
- Other fields: empty

### AC4: Save Transaction
**Given** required fields are filled (Payee, Amount, Account)
**When** user clicks Save OR presses Enter
**Then**:
- Transaction created in database
- New transaction appears in list (at top)
- Quick-add row resets for next entry
- Success feedback (subtle animation or toast)

### AC5: Validation
**Given** the user tries to save
**When** required fields are missing
**Then**:
- Validation errors shown on fields
- Save prevented
- Focus moved to first invalid field

### AC6: Keyboard Shortcut
**Given** the transaction view is displayed
**When** user presses Cmd+N
**Then**:
- Focus moves to Payee field in quick-add row
- Ready to type

### AC7: Tab Order
**Given** user is in quick-add row
**When** Tab is pressed
**Then**:
- Focus moves through fields in logical order
- Date → Payee → Category → Memo → Amount → Account → Save
- Shift+Tab moves backwards

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test row renders with all inline fields (Date, Payee, Category, Memo, Amount, Account, Save)
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test row has visually distinct background styling
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test date field defaults to today's date in YYYY-MM-DD format
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test amount sign defaults to expense (negative)
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test +/- toggle switches between income/expense
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test dollarsToCents conversion: $123.45 input -> 12345 cents stored
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test validation error on empty Payee field
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test validation error on empty Amount field
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test validation error on empty Account field
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test focus moves to first invalid field on validation failure
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test form resets all fields after successful save
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test Tab key cycles through fields in order: Date -> Payee -> Category -> Memo -> Amount -> Account -> Save
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test Shift+Tab navigates fields in reverse order
- [ ] `src/lib/__tests__/QuickAddRow.test.ts` - Test Enter key in any field triggers save

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test create_transaction stores amount_cents as integer correctly
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test create_transaction with all required fields (payee, amount_cents, account_id, date)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test create_transaction with optional fields (category_id, memo, tags)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test create_transaction returns the created transaction with generated ID

### E2E Tests
- [ ] `e2e/quick-add.spec.ts` - Test quick-add row visible at top of transaction list
- [ ] `e2e/quick-add.spec.ts` - Test Cmd+N keyboard shortcut focuses Payee input field
- [ ] `e2e/quick-add.spec.ts` - Test filling required fields and clicking Save creates new transaction
- [ ] `e2e/quick-add.spec.ts` - Test new transaction appears at top of list immediately (optimistic UI)
- [ ] `e2e/quick-add.spec.ts` - Test success feedback animation or toast displays after save
- [ ] `e2e/quick-add.spec.ts` - Test quick-add row resets and is ready for next entry after save

## Implementation Notes

1. Create QuickAddRow component
2. Form validation with required fields
3. Reset form state after successful save
4. Optimistic UI update (add to list immediately)
5. Handle save errors gracefully

## Files to Create/Modify

- `src/lib/components/transactions/QuickAddRow.svelte`
- `src/routes/transactions/+page.svelte` - add quick-add
- `src/lib/api/transactions.ts` - create transaction
