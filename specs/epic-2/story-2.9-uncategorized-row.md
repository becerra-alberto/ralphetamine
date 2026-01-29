---
id: "2.9"
epic: 2
title: "Show Uncategorized Transactions Row"
status: pending
priority: high
estimation: small
depends_on: ["2.5"]
frs: ["FR6"]
---

# Story 2.9: Show Uncategorized Transactions Row

## User Story

As a **user**,
I want **to see uncategorized transactions prominently**,
So that **I know when I need to categorize spending**.

## Technical Context

**Uncategorized (from PRD Section 3.1.1):**
- Transactions where category_id IS NULL
- Should be visible at bottom of budget grid
- Prompts user to categorize for accurate budgets

## Acceptance Criteria

### AC1: Uncategorized Row Displays
**Given** the budget grid is displayed
**When** there are transactions with category_id = NULL
**Then**:
- An "Uncategorized" row appears at the bottom of the grid
- Below all section groups
- Row is visually distinct (highlighted background)

### AC2: Monthly Totals Shown
**Given** the uncategorized row displays
**When** month cells render
**Then**:
- Each month shows SUM of uncategorized transactions
- Only shows actual (no budget for uncategorized)
- Formatted as currency

### AC3: Visual Distinction
**Given** the uncategorized row renders
**When** displayed to user
**Then**:
- Background color: warning/yellow tint
- Or left border indicator in warning color
- Label "Uncategorized" in warning color
- Count badge: "(X transactions)"

### AC4: Row Hidden When Empty
**Given** the budget grid is displayed
**When** there are NO uncategorized transactions
**Then**:
- The uncategorized row is hidden
- No empty row or placeholder

### AC5: Click Navigation
**Given** the uncategorized row is displayed
**When** the user clicks the row
**Then**:
- Navigate to /transactions?filter=uncategorized
- Transaction view shows only uncategorized items
- User can then categorize them

### AC6: 12M Column for Uncategorized
**Given** the uncategorized row displays
**When** the 12M totals column renders
**Then**:
- Shows total uncategorized over 12 months
- Helps user see magnitude of uncategorized spending

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test row renders with "Uncategorized" label
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test row has warning/yellow tint background
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test label "Uncategorized" in warning color
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test count badge shows "(X transactions)"
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test monthly cells show SUM of uncategorized in cents
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test only actual shown (no budget for uncategorized)
- [ ] `src/lib/__tests__/components/budget/UncategorizedRow.test.ts` - Test amounts formatted as currency
- [ ] `src/lib/__tests__/stores/budget.test.ts` - Test computed uncategorized totals query WHERE category_id IS NULL
- [ ] `src/lib/__tests__/stores/budget.test.ts` - Test uncategorized totals use cents arithmetic

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test uncategorized row appears at bottom (below all sections)
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test row hidden when no uncategorized transactions exist
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test 12M column shows total uncategorized over 12 months
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test `get_uncategorized_total` returns correct sum in cents

### E2E Tests
- [ ] `e2e/uncategorized-row.spec.ts` - Test click on row navigates to /transactions?filter=uncategorized
- [ ] `e2e/uncategorized-row.spec.ts` - Test transaction view shows only uncategorized items after navigation
- [ ] `e2e/uncategorized-row.spec.ts` - Test row visibility updates when transaction is categorized
- [ ] `e2e/uncategorized-row.spec.ts` - Test visual distinction from category rows (warning styling)

## Implementation Notes

1. Query for uncategorized: WHERE category_id IS NULL
2. Add row conditionally to grid
3. Style differently from category rows
4. Click handler navigates with query param
5. Consider showing uncategorized count in sidebar badge

## Files to Create/Modify

- `src/lib/components/budget/UncategorizedRow.svelte`
- `src/lib/components/budget/BudgetGrid.svelte` - add uncategorized row
- `src/lib/stores/budget.ts` - computed uncategorized totals
