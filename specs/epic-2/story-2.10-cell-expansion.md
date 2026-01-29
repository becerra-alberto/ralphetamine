---
id: "2.10"
epic: 2
title: "Implement Cell Expansion for Transaction Details"
status: pending
priority: medium
estimation: medium
depends_on: ["2.5"]
frs: ["FR9"]
---

# Story 2.10: Implement Cell Expansion for Transaction Details

## User Story

As a **user**,
I want **to see the transactions behind a budget cell**,
So that **I can understand what makes up that number**.

## Technical Context

**Cell Expansion (from PRD Section 3.1.2):**
- Click cell to see underlying transactions
- Only one cell expanded at a time
- Shows transaction list below category row
- Quick access without leaving budget view

## Acceptance Criteria

### AC1: Cell Click Expands
**Given** a budget cell is displayed
**When** the user clicks the cell
**Then**:
- An expansion panel appears below the category row
- Panel shows transactions for that category + month
- Cell is highlighted as "expanded"

### AC2: Keyboard Expand
**Given** a budget cell is focused
**When** the user presses Enter
**Then**:
- The cell expands (same as click)
- Focus moves to expansion panel

### AC3: Transaction List Display
**Given** the expansion panel is open
**When** transactions are displayed
**Then** each row shows:
- Date (DD MMM)
- Payee
- Amount
- Maximum 10 transactions shown
- Sorted by date descending

### AC4: View All Link
**Given** there are more than 10 transactions
**When** the expansion panel renders
**Then**:
- Shows "View all X transactions →" link
- Clicking navigates to /transactions with filters

### AC5: Single Expansion Only
**Given** a cell expansion is open
**When** the user clicks a different cell
**Then**:
- Previous expansion closes
- New cell's expansion opens
- Smooth transition between

### AC6: Close Expansion
**Given** a cell expansion is open
**When** the user:
- Clicks the expanded cell again, OR
- Presses Escape, OR
- Clicks outside the expansion
**Then**:
- The expansion closes
- Cell returns to normal state

### AC7: Empty State
**Given** a cell has no transactions
**When** the cell is expanded
**Then**:
- Shows "No transactions for this month"
- Still allows closing

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` - Test expansion panel renders with transaction list
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` - Test maximum 10 transactions displayed
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` - Test transactions sorted by date descending
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` - Test "View all X transactions →" link appears when > 10
- [ ] `src/lib/__tests__/components/budget/CellExpansion.test.ts` - Test empty state shows "No transactions for this month"
- [ ] `src/lib/__tests__/components/budget/TransactionMiniList.test.ts` - Test each row shows Date (DD MMM), Payee, Amount
- [ ] `src/lib/__tests__/components/budget/TransactionMiniList.test.ts` - Test amounts formatted correctly in cents
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test cell has "expanded" highlight state
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` - Test expanded cell state tracked in component

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test only one expansion open at a time
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test clicking different cell closes previous expansion
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test expansion panel appears below category row
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test transactions fetched on expand (lazy load)

### E2E Tests
- [ ] `e2e/cell-expansion.spec.ts` - Test click cell opens expansion panel
- [ ] `e2e/cell-expansion.spec.ts` - Test Enter key opens expansion when cell focused
- [ ] `e2e/cell-expansion.spec.ts` - Test Escape key closes expansion
- [ ] `e2e/cell-expansion.spec.ts` - Test click outside expansion closes it
- [ ] `e2e/cell-expansion.spec.ts` - Test clicking expanded cell again closes it
- [ ] `e2e/cell-expansion.spec.ts` - Test "View all" link navigates to /transactions with category+month filters
- [ ] `e2e/cell-expansion.spec.ts` - Test smooth transition animation between expansions
- [ ] `e2e/cell-expansion.spec.ts` - Test focus moves to expansion panel on keyboard expand

## Implementation Notes

1. Track expanded cell in component state
2. Fetch transactions on expand (lazy load)
3. Use Svelte transitions for animation
4. Position expansion below the row (shifts rows down)
5. Handle keyboard navigation within expansion

## Files to Create/Modify

- `src/lib/components/budget/CellExpansion.svelte`
- `src/lib/components/budget/BudgetCell.svelte` - add expansion trigger
- `src/lib/components/budget/BudgetGrid.svelte` - manage expansion state
- `src/lib/components/budget/TransactionMiniList.svelte` - compact list
