---
id: "10.2"
epic: 10
title: "Average-per-Month Column"
status: pending
priority: medium
estimation: medium
depends_on: ["10.1"]
---

# Story 10.2: Average-per-Month Column

## User Story

As a **user reviewing annual budget totals**,
I want **an average-per-month row in the totals column**,
So that **I can quickly see my typical monthly spend per category**.

## Technical Context

**Bug refs:** Item 2b (average column)

The TotalsColumn shows annual totals for each category. An additional row below the 12-month totals should display the average (total / 12), using the compact format from Story 10.1.

## Acceptance Criteria

### AC1: Average Row Rendered
**Given** the totals column
**When** rendered below the 12-month total
**Then**:
- An "Avg/mo" labeled row appears
- Shows total divided by 12, rounded to nearest integer

### AC2: Compact Format
**Given** the average value
**When** displayed
**Then**:
- Uses `formatBudgetAmount` from 10.1
- Consistent with cell formatting

### AC3: Column Width
**Given** the totals column layout
**When** the average row is added
**Then**:
- Column width accommodates the average row
- No text overflow or clipping

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` — renders average row below 12M totals
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` — average = total / 12 rounded
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` — average uses compact format from 10.1
- [ ] `src/lib/__tests__/components/budget/TotalsColumn.test.ts` — header shows "Avg/mo" label

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` — totals column width accommodates average row

## Implementation Notes

1. Add average calculation to TotalsColumn: `Math.round(total / 12)`
2. Render new row with "Avg/mo" label
3. Use `formatBudgetAmount` for display
4. Verify column min-width is sufficient

## Files to Create/Modify

- `src/lib/components/budget/TotalsColumn.svelte` — add average row
- `src/lib/components/budget/BudgetGrid.svelte` — verify column width
