---
id: "4.4"
epic: 4
title: "Add Uncategorized Warning Banner"
status: done
priority: high
estimation: small
depends_on: ["4.1"]
frs: ["FR16"]
---

# Story 4.4: Add Uncategorized Warning Banner

## User Story

As a **user**,
I want **to be alerted about uncategorized transactions**,
So that **I can keep my budget accurate**.

## Technical Context

**Warning Behavior (from PRD Section 3.2.1):**
- Prominent banner when uncategorized exist
- Quick action to categorize
- Dismissible but persistent until resolved

## Acceptance Criteria

### AC1: Banner Displays
**Given** the transaction view loads
**When** there are uncategorized transactions (category_id = NULL)
**Then**:
- Warning banner appears at top of transaction list
- Below header, above transaction table
- Yellow/warning background color (--warning)

### AC2: Banner Content
**Given** the warning banner is displayed
**When** content renders
**Then** shows:
- Warning icon
- Text: "You have X uncategorized transactions"
- "Categorize now" button

### AC3: Count Accuracy
**Given** uncategorized transactions exist
**When** count is displayed
**Then**:
- Count matches actual uncategorized count
- Updates when transactions are categorized
- Grammar: "1 transaction" vs "X transactions"

### AC4: Categorize Action
**Given** the warning banner is displayed
**When** user clicks "Categorize now"
**Then**:
- Transaction list filters to uncategorized only
- Filter panel shows uncategorized filter active
- First uncategorized transaction highlighted/focused

### AC5: Banner Hidden When Resolved
**Given** all transactions are categorized
**When** the view renders (or updates after categorization)
**Then**:
- Warning banner is hidden
- No empty banner placeholder

### AC6: Dismiss Temporarily
**Given** the banner is displayed
**When** user clicks dismiss/close button
**Then**:
- Banner hides for current session
- Reappears on page reload if still uncategorized
- Or: stays hidden until new uncategorized added

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test banner renders with warning icon and yellow/warning background
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test banner displays correct count: "You have X uncategorized transactions"
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test singular grammar: "You have 1 uncategorized transaction" (no 's')
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test plural grammar: "You have 5 uncategorized transactions"
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test banner hidden when count is 0
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test "Categorize now" button is present and clickable
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test dismiss button hides banner and stores state in session storage
- [ ] `src/lib/__tests__/UncategorizedBanner.test.ts` - Test banner reappears when new uncategorized transaction added (count increases)
- [ ] `src/lib/__tests__/transactions.store.test.ts` - Test uncategorized count computed correctly from transactions with category_id = NULL

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test get_uncategorized_count returns accurate count of transactions with NULL category_id
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test count updates when transaction category_id is set (previously NULL)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test count updates when transaction category_id is removed (set to NULL)

### E2E Tests
- [ ] `e2e/uncategorized-banner.spec.ts` - Test banner appears at top of transaction list when uncategorized exist
- [ ] `e2e/uncategorized-banner.spec.ts` - Test "Categorize now" click filters list to uncategorized only
- [ ] `e2e/uncategorized-banner.spec.ts` - Test first uncategorized transaction receives focus after filtering
- [ ] `e2e/uncategorized-banner.spec.ts` - Test banner disappears after categorizing all transactions
- [ ] `e2e/uncategorized-banner.spec.ts` - Test dismiss persists for session but reappears on page reload

## Implementation Notes

1. Query uncategorized count on load
2. Subscribe to transaction changes
3. Use reactive statement for visibility
4. Store dismiss state in session storage
5. Consider bulk categorization UI

## Files to Create/Modify

- `src/lib/components/transactions/UncategorizedBanner.svelte`
- `src/routes/transactions/+page.svelte` - add banner
- `src/lib/stores/transactions.ts` - uncategorized count
