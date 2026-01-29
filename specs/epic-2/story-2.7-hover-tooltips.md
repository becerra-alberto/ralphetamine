---
id: "2.7"
epic: 2
title: "Implement Hover Tooltips"
status: pending
priority: medium
estimation: small
depends_on: ["2.5"]
frs: ["FR8"]
---

# Story 2.7: Implement Hover Tooltips

## User Story

As a **user**,
I want **detailed information when I hover over a budget cell**,
So that **I can see the full breakdown without clicking**.

## Technical Context

**Tooltip Content (from PRD Section 3.1.2):**
- Actual amount
- Budget amount
- Difference (budget - actual)
- Usage percentage
- Link to view transactions

**UX Considerations:**
- Delay before showing (200ms)
- Delay before hiding (200ms)
- Position: above or below cell (auto-detect)

## Acceptance Criteria

### AC1: Tooltip Appears on Hover
**Given** a budget cell is displayed
**When** the user hovers over the cell
**Then**:
- Tooltip appears after 200ms delay
- Positioned near the cell (above by default)
- Doesn't obscure the hovered cell

### AC2: Tooltip Content
**Given** a tooltip is displayed
**When** the content renders
**Then** it shows:
- "Actual: €X,XXX.XX"
- "Budget: €X,XXX.XX"
- "Difference: €X,XXX.XX" (positive = under, negative = over)
- "Usage: XX%" (actual/budget * 100)
- "View transactions →" clickable link

### AC3: Difference Display
**Given** the tooltip shows difference
**When** under budget (actual < budget)
**Then**: Shows "+€XXX.XX remaining" in green

**When** over budget (actual > budget)
**Then**: Shows "-€XXX.XX over" in red

**When** on budget
**Then**: Shows "On budget" in neutral

### AC4: Usage Percentage
**Given** a budget is set
**When** usage is calculated
**Then**:
- Formula: (actual / budget) * 100
- Rounded to 1 decimal place
- Shows "N/A" if budget is €0

### AC5: Tooltip Dismissal
**Given** a tooltip is displayed
**When** the user moves mouse away from cell
**Then**:
- Tooltip remains for 200ms (grace period)
- Then fades out smoothly
- Moving to tooltip keeps it open

### AC6: View Transactions Link
**Given** the tooltip shows "View transactions"
**When** the user clicks the link
**Then**:
- Navigates to /transactions
- Filtered to that category and month
- URL: /transactions?category=X&month=YYYY-MM

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/shared/Tooltip.test.ts` - Test tooltip renders with content
- [ ] `src/lib/__tests__/components/shared/Tooltip.test.ts` - Test tooltip positioned above cell by default
- [ ] `src/lib/__tests__/components/shared/Tooltip.test.ts` - Test tooltip handles viewport edge cases
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test displays "Actual: €X,XXX.XX" formatted correctly
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test displays "Budget: €X,XXX.XX" formatted correctly
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test displays "Difference: €X,XXX.XX" calculated in cents
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test displays "Usage: XX%" rounded to 1 decimal place
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test shows "N/A" for usage when budget is €0
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test under budget shows "+€XXX.XX remaining" in green
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test over budget shows "-€XXX.XX over" in red
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test on budget shows "On budget" in neutral
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` - Test "View transactions →" link is present
- [ ] `src/lib/__tests__/actions/tooltip.test.ts` - Test Svelte action attaches hover listeners

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test tooltip appears after 200ms hover delay
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test tooltip remains for 200ms grace period on mouse leave
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test moving to tooltip keeps it open

### E2E Tests
- [ ] `e2e/hover-tooltips.spec.ts` - Test tooltip appears on hover after 200ms delay
- [ ] `e2e/hover-tooltips.spec.ts` - Test tooltip disappears with fade animation on mouse leave
- [ ] `e2e/hover-tooltips.spec.ts` - Test "View transactions" link navigates to /transactions?category=X&month=YYYY-MM
- [ ] `e2e/hover-tooltips.spec.ts` - Test tooltip does not obscure the hovered cell

## Implementation Notes

1. Create reusable Tooltip component
2. Use Svelte action or component for hover detection
3. Position tooltip using getBoundingClientRect
4. Handle edge cases (viewport edges)
5. Use CSS transitions for fade in/out

## Files to Create/Modify

- `src/lib/components/shared/Tooltip.svelte`
- `src/lib/components/budget/BudgetCellTooltip.svelte`
- `src/lib/components/budget/BudgetCell.svelte` - add tooltip
- `src/lib/actions/tooltip.ts` - Svelte action for tooltip
