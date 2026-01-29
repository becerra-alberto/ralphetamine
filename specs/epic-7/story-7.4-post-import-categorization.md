---
id: "7.4"
epic: 7
title: "Add Post-Import Category Assignment"
status: done
priority: medium
estimation: medium
depends_on: ["7.3"]
---

# Story 7.4: Add Post-Import Category Assignment

## User Story

As a **user**,
I want **to bulk-assign categories after import**,
So that **my imported transactions are properly categorized**.

## Technical Context

**Post-Import Flow:**
- Imported transactions often uncategorized
- Prompt user to categorize
- Bulk categorization for efficiency

## Acceptance Criteria

### AC1: Completion Prompt
**Given** import completes successfully
**When** completion screen displays
**Then** shows:
- Success message: "Imported X transactions"
- "Y transactions need categorization" (if any)
- "Categorize now" button
- "Done" button (skip categorization)

### AC2: Categorize Now Action
**Given** user clicks "Categorize now"
**When** action executes
**Then**:
- Wizard closes
- Navigate to /transactions
- Filter applied: uncategorized + import date
- Ready for categorization

### AC3: Filtered View
**Given** user is taken to categorization view
**When** transactions display
**Then**:
- Only uncategorized transactions shown
- Filtered to import date/batch
- Banner: "Categorizing imported transactions"

### AC4: Bulk Selection
**Given** uncategorized transactions are displayed
**When** user wants to select multiple
**Then**:
- Checkboxes on each row
- "Select all" option
- Selection count shown

### AC5: Bulk Category Assignment
**Given** multiple transactions selected
**When** user assigns category
**Then**:
- Category dropdown appears
- Select category from hierarchy
- "Apply to X selected" button
- All selected updated at once

### AC6: Quick Patterns
**Given** bulk categorization is active
**When** common payees exist
**Then**:
- Suggest: "Categorize all 'Albert Heijn' as Groceries?"
- Based on payee patterns
- One-click to apply

### AC7: Progress Tracking
**Given** categorization is in progress
**When** transactions are categorized
**Then**:
- Count updates: "X of Y categorized"
- Progress bar or indicator
- "All done!" when complete

### AC8: Return to Normal View
**Given** categorization is complete (or user clicks Done)
**When** returning to normal view
**Then**:
- Filters cleared
- All transactions shown
- Normal transaction view

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/payeePatterns.test.ts` - Test pattern detection groups transactions by payee
- [ ] `src/lib/__tests__/payeePatterns.test.ts` - Test pattern suggestion generation ("Categorize all 'X' as Y?")
- [ ] `src/lib/__tests__/payeePatterns.test.ts` - Test pattern matching with payee variations (whitespace, punctuation)
- [ ] `src/lib/__tests__/payeePatterns.test.ts` - Test minimum threshold for pattern suggestions (3+ occurrences)
- [ ] `src/lib/__tests__/ImportComplete.test.ts` - Test success message displays correct import count
- [ ] `src/lib/__tests__/ImportComplete.test.ts` - Test uncategorized count is calculated correctly
- [ ] `src/lib/__tests__/ImportComplete.test.ts` - Test "Categorize now" button navigates with correct filters
- [ ] `src/lib/__tests__/ImportComplete.test.ts` - Test "Done" button closes wizard without navigation
- [ ] `src/lib/__tests__/BulkActions.test.ts` - Test bulk selection with checkboxes
- [ ] `src/lib/__tests__/BulkActions.test.ts` - Test "Select all" selects all visible transactions
- [ ] `src/lib/__tests__/BulkActions.test.ts` - Test selection count updates correctly
- [ ] `src/lib/__tests__/BulkActions.test.ts` - Test category dropdown appears when selection > 0
- [ ] `src/lib/__tests__/BulkActions.test.ts` - Test "Apply to X selected" button text updates with count
- [ ] `src/lib/__tests__/TransactionCheckbox.test.ts` - Test checkbox toggle updates parent selection state

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test batch category update for multiple transaction IDs
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test batch update with 100+ transactions (performance)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter by import_batch_id returns correct transactions
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter by uncategorized + import_batch_id combination
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test batch update rollback on partial failure

### E2E Tests
- [ ] `e2e/csv-import.spec.ts` - Test completion prompt appears after successful import
- [ ] `e2e/csv-import.spec.ts` - Test "Categorize now" navigates to filtered Transactions view
- [ ] `e2e/csv-import.spec.ts` - Test filter banner displays "Categorizing imported transactions"
- [ ] `e2e/csv-import.spec.ts` - Test multi-select checkboxes and bulk category assignment
- [ ] `e2e/csv-import.spec.ts` - Test pattern suggestion click applies category to matching transactions
- [ ] `e2e/csv-import.spec.ts` - Test progress indicator shows "X of Y categorized"
- [ ] `e2e/csv-import.spec.ts` - Test "Done" clears filters and returns to normal view

## Implementation Notes

1. Track import batch for filtering
2. Add batch category update API
3. Payee pattern detection
4. Transaction checkboxes component
5. Clear filters on completion

## Files to Create/Modify

- `src/lib/components/import/ImportComplete.svelte`
- `src/lib/components/transactions/BulkActions.svelte`
- `src/lib/components/transactions/TransactionCheckbox.svelte`
- `src/lib/utils/payeePatterns.ts`
- `src-tauri/src/commands/transactions.rs` - batch update
