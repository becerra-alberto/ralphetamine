---
id: "2.8"
epic: 2
title: "Add Trailing 12M Totals Column"
status: pending
priority: high
estimation: medium
depends_on: ["2.5"]
frs: ["FR5"]
---

# Story 2.8: Add Trailing 12M Totals Column

## User Story

As a **user**,
I want **a totals column showing my trailing 12-month summary**,
So that **I can see my annual spending patterns**.

## Technical Context

**12M Column (from PRD Section 3.1.1):**
- Always rightmost column (after all month columns)
- Shows sum of last 12 months
- Includes actual, budget, and difference
- Updates based on visible date range

## Acceptance Criteria

### AC1: 12M Column Position
**Given** the budget grid is displayed
**When** columns render
**Then**:
- 12M totals column is rightmost
- Column header shows "12M Total" or "Trailing 12M"
- Column is slightly wider than month columns
- Has distinct background (subtle highlight)

### AC2: Category Row Totals
**Given** the 12M column renders for a category row
**When** totals are calculated
**Then** each cell shows:
- Total actual: SUM of last 12 months actual amounts
- Total budget: SUM of last 12 months budget amounts
- Formatted as currency

### AC3: Difference Display
**Given** the 12M totals are shown
**When** difference is calculated
**Then**:
- Shows (Budget - Actual) for the 12 month period
- Color-coded: green if under budget, red if over
- Can optionally show percentage

### AC4: Section Header Totals
**Given** a section header row displays
**When** the 12M column renders for the section
**Then**:
- Shows aggregated totals for all categories in section
- Same format: actual, budget, difference
- Visually consistent with section styling

### AC5: Date Range Adjustment
**Given** the user changes the visible date range
**When** 12M column recalculates
**Then**:
- Always calculates trailing 12 months from END of visible range
- Example: If viewing Jan-Jun 2025, 12M = Jul 2024 - Jun 2025
- Updates immediately when range changes

### AC6: Grand Total Row
**Given** the budget grid is displayed
**When** a footer row renders
**Then**:
- Grand total row at bottom (optional)
- Shows total income, total expenses, net for 12M
- Visually distinct from category rows

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` - Test column header shows "Trailing 12M" or "12M Total"
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` - Test column is wider than month columns
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` - Test column has distinct background (subtle highlight)
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` - Test cell shows total actual and total budget formatted as currency
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` - Test difference calculated as (Budget - Actual) in cents
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` - Test difference color-coded: green under budget, red over
- [ ] `src/lib/__tests__/utils/budgetCalculations.test.ts` - Test 12M total = SUM of last 12 months (cents arithmetic)
- [ ] `src/lib/__tests__/utils/budgetCalculations.test.ts` - Test no floating point errors in aggregation
- [ ] `src/lib/__tests__/utils/budgetCalculations.test.ts` - Test trailing 12M calculated from END of visible range
- [ ] `src/lib/__tests__/utils/budgetCalculations.test.ts` - Test example: viewing Jan-Jun 2025, 12M = Jul 2024 - Jun 2025
- [ ] `src/lib/__tests__/stores/budget.test.ts` - Test 12M computed values in store

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test 12M column is rightmost (after all month columns)
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test section header 12M shows aggregated totals for all child categories
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test grand total row shows total income, expenses, net for 12M
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test 12M updates immediately when date range changes

### E2E Tests
- [ ] `e2e/trailing-totals.spec.ts` - Test 12M column position is rightmost
- [ ] `e2e/trailing-totals.spec.ts` - Test 12M recalculates when user changes date range
- [ ] `e2e/trailing-totals.spec.ts` - Test visual distinction of 12M column from month columns

## Implementation Notes

1. Add 12M column to grid layout
2. Create computed values for 12M totals
3. Memoize calculations (expensive with many categories)
4. Consider lazy calculation on scroll
5. Use same cell styling as month columns

## Files to Create/Modify

- `src/lib/components/budget/BudgetGrid.svelte` - add 12M column
- `src/lib/components/budget/TotalsColumn.svelte` - totals column
- `src/lib/stores/budget.ts` - add 12M computed values
- `src/lib/utils/budgetCalculations.ts` - totals helpers
