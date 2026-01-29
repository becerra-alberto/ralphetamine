---
id: "5.5"
epic: 5
title: "Implement Account Balance Entry"
status: pending
priority: high
estimation: medium
depends_on: ["5.3"]
---

# Story 5.5: Implement Account Balance Entry

## User Story

As a **user**,
I want **to update my account balances**,
So that **my net worth stays accurate**.

## Technical Context

**Balance Entry:**
- Inline editing in net worth view
- Historical snapshots for tracking
- Add new accounts

**Account Balances Table:**
Need to track balance history for accounts that aren't transaction-based.

## Acceptance Criteria

### AC1: Inline Balance Edit
**Given** an account is displayed in net worth view
**When** user clicks the balance amount
**Then**:
- Balance becomes editable inline
- Current value selected
- Input focused

### AC2: Save Balance
**Given** balance is being edited
**When** user enters new value and presses Enter
**Then**:
- Balance saved to database
- Current date recorded as "last updated"
- Display updates immediately
- Totals recalculate

### AC3: Historical Snapshot
**Given** a balance is updated
**When** save occurs
**Then**:
- Previous balance recorded in history
- New balance becomes current
- Enables tracking over time

### AC4: Add New Account
**Given** user wants to add an account
**When** they click "Add Account" in a category
**Then** a form appears with:
- Account name (required)
- Account type (dropdown)
- Institution (text)
- Currency (dropdown: EUR, USD, CAD)
- Starting balance (required)

### AC5: Account Creation
**Given** the add account form is filled
**When** user submits
**Then**:
- Account created in database
- Appears in appropriate category
- Balance initialized
- Totals update

### AC6: Last Updated Indicator
**Given** an account balance was manually entered
**When** displayed in list
**Then**:
- Shows "Updated: [date]" below balance
- Helps user know if data is stale
- Format: "Updated: 28 Jan 2025"

### AC7: Cancel Edit
**Given** balance edit is in progress
**When** user presses Escape
**Then**:
- Edit cancelled
- Original value restored
- No database change

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test click on balance amount activates inline edit mode
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test input displays current value pre-selected
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test Enter key saves value and exits edit mode
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test Escape key cancels edit and restores original value
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test balance input validates numeric values only
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test cents conversion: "150.50" input converts to 15050 cents
- [ ] `src/lib/__tests__/BalanceEdit.test.ts` - Test cents conversion: "1,500.00" with comma parses correctly
- [ ] `src/lib/__tests__/AddAccountModal.test.ts` - Test form validates required fields (name, type, balance)
- [ ] `src/lib/__tests__/AddAccountModal.test.ts` - Test currency dropdown includes EUR, USD, CAD options
- [ ] `src/lib/__tests__/AddAccountModal.test.ts` - Test starting balance converts to cents on submit
- [ ] `src/lib/__tests__/AccountRow.test.ts` - Test "Updated: 28 Jan 2025" date format displays correctly

### Integration Tests
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test update_account_balance saves new balance in cents
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test update_account_balance creates historical snapshot
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test create_account inserts new account with balance
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test get_balance_history returns chronological snapshots
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test last_updated timestamp set on balance change

### E2E Tests
- [ ] `e2e/balance-entry.spec.ts` - Test clicking balance enables inline edit, typing new value, pressing Enter saves
- [ ] `e2e/balance-entry.spec.ts` - Test totals (assets, liabilities, net worth) recalculate after balance save
- [ ] `e2e/balance-entry.spec.ts` - Test Add Account modal opens from category, form submits, account appears in list
- [ ] `e2e/balance-entry.spec.ts` - Test keyboard flow: Tab to balance, Enter to edit, type value, Enter to save

## Implementation Notes

1. Create account_balances history table
2. Inline edit component for balances
3. Add account modal/form
4. Track last_updated timestamp
5. Consider batch balance update UI

## Files to Create/Modify

- `src-tauri/src/db/migrations/004_account_balances_history.sql`
- `src/lib/components/net-worth/BalanceEdit.svelte`
- `src/lib/components/net-worth/AddAccountModal.svelte`
- `src/lib/components/net-worth/AccountRow.svelte` - add edit
- `src-tauri/src/commands/accounts.rs` - balance updates
