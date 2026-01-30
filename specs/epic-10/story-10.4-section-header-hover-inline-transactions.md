---
id: "10.4"
epic: 10
title: "Section Header Hover + Inline Transactions"
status: pending
priority: medium
estimation: medium
depends_on: []
---

# Story 10.4: Section Header Hover + Inline Transactions

## User Story

As a **user reviewing budget sections**,
I want **hovering a section header cell to show aggregate data and clicking to expand inline transactions**,
So that **I can see section-level summaries and drill into transactions without leaving the budget view**.

## Technical Context

**Bug refs:** Item 2d (section hover), Item 2k (inline transactions)

Section headers (Income, Housing, Essential, Lifestyle, Savings) have cells for each month. Hovering a section cell should show a tooltip with aggregate actual/budget/difference for that section-month. Clicking should expand to show transactions for all categories in that section for that month.

## Acceptance Criteria

### AC1: Section Cell Hover Tooltip
**Given** user hovers a section header cell
**When** the tooltip renders
**Then**:
- Shows aggregate actual amount for all section categories
- Shows aggregate budget amount
- Shows difference (budget - actual)

### AC2: Section Cell Click Expand
**Given** user clicks a section header cell
**When** the expand fires
**Then**:
- Dispatches expand event with all section categoryIds
- Fetches transactions for all categories in that section for the month
- Renders inline transaction list below the section header

### AC3: Transaction List
**Given** the inline transaction list is visible
**When** rendered
**Then**:
- Shows transactions from all categories in the section
- Sorted by date
- Clicking again collapses the list

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` — section cell click dispatches expand event with section categoryIds
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` — section cell renders tooltip on hover
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` — tooltip shows aggregate actual/budget/difference for section

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` — handleSectionCellExpand fetches transactions for all section categories

## Implementation Notes

1. Add hover handler to SectionHeader cells that computes aggregates from children
2. Use BudgetCellTooltip or similar for the hover display
3. Add click handler that dispatches expand event with `categoryIds: string[]`
4. In BudgetGrid, handle section expand by fetching transactions for multiple categories
5. Render expanded transaction list similar to existing cell expansion

## Files to Create/Modify

- `src/lib/components/budget/SectionHeader.svelte` — add hover tooltip and click expand
- `src/lib/components/budget/BudgetGrid.svelte` — handle section cell expansion
