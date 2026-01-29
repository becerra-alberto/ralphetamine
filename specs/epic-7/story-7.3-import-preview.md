---
id: "7.3"
epic: 7
title: "Add Import Preview and Duplicate Detection"
status: pending
priority: high
estimation: medium
depends_on: ["7.2"]
---

# Story 7.3: Add Import Preview and Duplicate Detection

## User Story

As a **user**,
I want **to preview imports and detect duplicates**,
So that **I don't create duplicate transactions**.

## Technical Context

**Duplicate Detection:**
- Match on: date + amount + payee
- Fuzzy matching on payee (case-insensitive)
- User decides on duplicates

## Acceptance Criteria

### AC1: Step 3 Display
**Given** user completes Step 2 (columns mapped)
**When** Step 3 displays
**Then** shows:
- Title: "Review Import"
- Subtitle: "Check your transactions before importing"
- Step indicator: "Step 3 of 3"

### AC2: Import Summary
**Given** Step 3 renders
**When** summary displays
**Then** shows:
- Total transactions to import: X
- Potential duplicates found: Y
- Date range: [earliest] to [latest]

### AC3: Transaction Preview
**Given** Step 3 renders
**When** preview table displays
**Then**:
- Shows first 10 transactions
- Columns: Date, Payee, Amount, Category
- Scroll for more (if > 10)
- "Showing 10 of X transactions"

### AC4: Duplicate Detection
**Given** transactions are previewed
**When** checking for duplicates
**Then**:
- Compare each import row against existing transactions
- Match criteria: same date + amount + similar payee
- Payee match: case-insensitive, fuzzy tolerance

### AC5: Duplicate Handling Options
**Given** duplicates are detected
**When** options display
**Then** user can choose:
- "Import all (including potential duplicates)"
- "Skip duplicates" (default)
- "Review each duplicate"

### AC6: Duplicate Review
**Given** user selects "Review each duplicate"
**When** review UI displays
**Then**:
- Lists potential duplicates
- Shows existing transaction vs import row
- Checkbox to include/exclude each
- "These look like the same transaction"

### AC7: Import Execution
**Given** user clicks "Import"
**When** import executes
**Then**:
- Progress indicator shows
- Transactions inserted to database
- Skips duplicates (if option selected)
- Shows completion: "Imported X transactions"

### AC8: Import Failure Handling
**Given** import is in progress
**When** an error occurs
**Then**:
- Shows error message
- Rolls back partial import
- Or: shows which rows failed
- Can retry

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/duplicateDetection.test.ts` - Test exact match detection (same date + amount + payee)
- [ ] `src/lib/__tests__/duplicateDetection.test.ts` - Test case-insensitive payee matching ("ALBERT HEIJN" vs "Albert Heijn")
- [ ] `src/lib/__tests__/duplicateDetection.test.ts` - Test fuzzy payee matching with minor variations ("Albert Heijn B.V." vs "Albert Heijn")
- [ ] `src/lib/__tests__/duplicateDetection.test.ts` - Test no false positive on same payee different dates
- [ ] `src/lib/__tests__/duplicateDetection.test.ts` - Test no false positive on same date/payee different amounts
- [ ] `src/lib/__tests__/duplicateDetection.test.ts` - Test performance with large dataset (1000+ existing transactions)
- [ ] `src/lib/__tests__/ImportPreview.test.ts` - Test summary displays correct total count
- [ ] `src/lib/__tests__/ImportPreview.test.ts` - Test summary displays correct duplicate count
- [ ] `src/lib/__tests__/ImportPreview.test.ts` - Test date range calculation (earliest to latest)
- [ ] `src/lib/__tests__/ImportPreview.test.ts` - Test preview table renders first 10 rows
- [ ] `src/lib/__tests__/ImportPreview.test.ts` - Test scroll pagination for rows beyond 10
- [ ] `src/lib/__tests__/DuplicateReview.test.ts` - Test duplicate comparison UI shows existing vs import
- [ ] `src/lib/__tests__/DuplicateReview.test.ts` - Test checkbox inclusion/exclusion per duplicate
- [ ] `src/lib/__tests__/ImportProgress.test.ts` - Test progress bar updates during import

### Integration Tests
- [ ] `src-tauri/src/commands/import_test.rs` - Test batch insert with 100 transactions
- [ ] `src-tauri/src/commands/import_test.rs` - Test batch insert with 1000+ transactions (performance)
- [ ] `src-tauri/src/commands/import_test.rs` - Test transaction rollback on insertion failure
- [ ] `src-tauri/src/commands/import_test.rs` - Test skip duplicates flag excludes matched transactions
- [ ] `src-tauri/src/commands/import_test.rs` - Test import_batch_id assigned to all imported transactions
- [ ] `src-tauri/src/commands/import_test.rs` - Test malformed data row handling (partial import with error report)

### E2E Tests
- [ ] `e2e/csv-import.spec.ts` - Test Step 3 displays summary after column mapping
- [ ] `e2e/csv-import.spec.ts` - Test duplicate detection UI shows potential matches
- [ ] `e2e/csv-import.spec.ts` - Test "Skip duplicates" option excludes detected duplicates
- [ ] `e2e/csv-import.spec.ts` - Test "Review each duplicate" flow with include/exclude toggles
- [ ] `e2e/csv-import.spec.ts` - Test Import button shows progress indicator
- [ ] `e2e/csv-import.spec.ts` - Test success message displays correct import count
- [ ] `e2e/csv-import.spec.ts` - Test imported transactions appear in Transactions view

## Implementation Notes

1. Create ImportPreview component
2. Query existing transactions for duplicate check
3. Batch insert for performance
4. Transaction rollback on error
5. Consider import_batch_id for tracking

## Files to Create/Modify

- `src/lib/components/import/ImportPreview.svelte`
- `src/lib/components/import/DuplicateReview.svelte`
- `src/lib/components/import/ImportProgress.svelte`
- `src/lib/utils/duplicateDetection.ts`
- `src-tauri/src/commands/import.rs` - batch insert
