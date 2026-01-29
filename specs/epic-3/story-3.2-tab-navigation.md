---
id: "3.2"
epic: 3
title: "Add Tab Navigation While Editing"
status: pending
priority: high
estimation: small
depends_on: ["3.1"]
frs: ["FR11"]
---

# Story 3.2: Add Tab Navigation While Editing

## User Story

As a **user**,
I want **to Tab through budget cells while editing**,
So that **I can quickly set budgets for multiple months**.

## Technical Context

**Tab Behavior (from PRD Section 3.1.3):**
- Tab moves to next month (same category)
- Shift+Tab moves to previous month
- Saves current value before moving
- Enables rapid budget entry

## Acceptance Criteria

### AC1: Tab to Next Month
**Given** a budget cell is in edit mode
**When** the user presses Tab
**Then**:
- Current cell value is saved
- Focus moves to next month's cell (same category)
- Next cell enters edit mode
- Next cell value is selected

### AC2: Shift+Tab to Previous Month
**Given** a budget cell is in edit mode
**When** the user presses Shift+Tab
**Then**:
- Current cell value is saved
- Focus moves to previous month's cell (same category)
- Previous cell enters edit mode
- Previous cell value is selected

### AC3: Tab at Row End
**Given** the user is editing the last visible month
**When** Tab is pressed
**Then**:
- Current value saved
- Focus moves to first month of next category row
- Or: wraps to first month of current row
- (Define behavior preference)

### AC4: Shift+Tab at Row Start
**Given** the user is editing the first visible month
**When** Shift+Tab is pressed
**Then**:
- Current value saved
- Focus moves to last month of previous category row
- Or: stays on current cell
- (Define behavior preference)

### AC5: Skip Section Headers
**Given** Tab navigation is active
**When** moving between cells
**Then**:
- Section header rows are skipped
- Focus moves to next/previous category row
- Section headers are not editable

### AC6: Save Before Move
**Given** the user has typed a new value
**When** Tab or Shift+Tab is pressed
**Then**:
- Value is validated
- If valid: saved to database, then move
- If invalid: show error, don't move

## Test Definition

### Unit Tests
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test Tab key prevents default browser behavior
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test Tab key emits navigation event with direction 'next'
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test Shift+Tab emits navigation event with direction 'prev'
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test Tab triggers save before emitting navigation
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test invalid value on Tab shows error and prevents navigation
- [ ] `src/lib/components/budget/__tests__/BudgetGrid.test.ts` - Test focus moves to next month cell (same category row)
- [ ] `src/lib/components/budget/__tests__/BudgetGrid.test.ts` - Test focus moves to previous month cell on Shift+Tab
- [ ] `src/lib/components/budget/__tests__/BudgetGrid.test.ts` - Test Tab at last month wraps to first month of next category
- [ ] `src/lib/components/budget/__tests__/BudgetGrid.test.ts` - Test Shift+Tab at first month wraps to last month of previous category
- [ ] `src/lib/components/budget/__tests__/BudgetGrid.test.ts` - Test section header rows are skipped during navigation
- [ ] `src/lib/components/budget/__tests__/BudgetGrid.test.ts` - Test next cell automatically enters edit mode with value selected
- [ ] `src/lib/stores/__tests__/budgetUI.test.ts` - Test focused cell position updates correctly on Tab
- [ ] `src/lib/stores/__tests__/budgetUI.test.ts` - Test focused cell position updates correctly on Shift+Tab

### Integration Tests
- [ ] `src-tauri/src/commands/budget_test.rs` - Test rapid sequential saves (debounce handling)
- [ ] `src/lib/api/__tests__/budgets.test.ts` - Test save completes before navigation proceeds

### E2E Tests
- [ ] `e2e/budget-navigation.spec.ts` - Test Tab through 3 months: verify each cell saves and next cell focuses in edit mode
- [ ] `e2e/budget-navigation.spec.ts` - Test Shift+Tab through 3 months: verify backward navigation works
- [ ] `e2e/budget-navigation.spec.ts` - Test Tab across category boundary: verify section headers skipped
- [ ] `e2e/budget-navigation.spec.ts` - Test focus management: verify focus ring visible on active cell

## Implementation Notes

1. Handle keydown event in edit input
2. Prevent default Tab behavior
3. Track cell positions (category, month indices)
4. Coordinate between cells via parent grid
5. Consider using focus trap for accessibility

## Files to Create/Modify

- `src/lib/components/budget/BudgetCell.svelte` - handle Tab key
- `src/lib/components/budget/BudgetGrid.svelte` - coordinate cell focus
- `src/lib/stores/budgetUI.ts` - track focused cell position
