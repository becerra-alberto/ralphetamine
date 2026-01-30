---
id: "10.8"
epic: 10
title: "Fix Expanded Category White Box Bug"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 10.8: Fix Expanded Category White Box Bug

## User Story

As a **user expanding budget cell details**,
I want **the expansion panel to render without a white box artifact on the right edge**,
So that **the UI looks clean and professional**.

## Technical Context

**Bug refs:** Item 2m (white box bug)

When expanding a budget cell to view transactions, a white box artifact appears on the right edge of the expansion panel. This is caused by the expansion panel overflowing into the totals column or having incorrect max-width calculations.

## Acceptance Criteria

### AC1: No Overflow
**Given** a budget cell is expanded
**When** the expansion panel renders
**Then**:
- Panel does not overflow into the totals column
- No white box artifact on the right edge

### AC2: Proper Max-Width
**Given** the expansion panel
**When** calculating its width
**Then**:
- Accounts for the category name column width
- Accounts for the totals column width
- Fills only the month cells area

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` — expansion panel does not overflow into totals column
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` — expansion has proper max-width accounting for category + totals columns
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` — no white box artifact on right edge

## Implementation Notes

1. Review CellExpansion CSS — likely needs `max-width: calc(100% - category-col - totals-col)`
2. Check for stray `background: white` or `background-color` that creates the artifact
3. Ensure the expansion panel respects the grid layout boundaries
4. May need `overflow: hidden` on the expansion container

## Files to Create/Modify

- `src/lib/components/budget/CellExpansion.svelte` — fix width and background
- `src/lib/components/budget/BudgetGrid.svelte` — verify grid layout constraints
