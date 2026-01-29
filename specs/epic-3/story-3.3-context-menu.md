---
id: "3.3"
epic: 3
title: "Implement Right-Click Context Menu"
status: pending
priority: high
estimation: medium
depends_on: ["3.1"]
frs: ["FR12"]
---

# Story 3.3: Implement Right-Click Context Menu

## User Story

As a **user**,
I want **a context menu with batch budget operations**,
So that **I can efficiently manage budgets across multiple months**.

## Technical Context

**Context Menu Options (from PRD Section 3.1.3):**
- Edit this month only
- Set amount for all future months
- Increase by percentage for future months

## Acceptance Criteria

### AC1: Context Menu Appears
**Given** a budget cell is displayed
**When** the user right-clicks the cell
**Then**:
- A context menu appears at cursor position
- Menu shows available actions
- Menu styled consistently with app design

### AC2: Menu Options
**Given** the context menu is open
**When** options are displayed
**Then** the menu shows:
- "Edit this month" - enters inline edit mode
- "Set for all future months..." - opens amount input
- "Increase future months by %..." - opens percentage input
- Divider
- "Copy budget" / "Paste budget" (optional)

### AC3: Edit This Month
**Given** the context menu is open
**When** user clicks "Edit this month"
**Then**:
- Context menu closes
- Cell enters inline edit mode
- Same as double-click behavior

### AC4: Set Future Months
**Given** user selects "Set for all future months..."
**When** the action is triggered
**Then**:
- Small input popover appears
- User enters amount (e.g., €400)
- "Apply" button confirms
- All months from current to 12 months ahead are updated
- Toast notification: "Updated X months"

### AC5: Increase by Percentage
**Given** user selects "Increase future months by %..."
**When** the action is triggered
**Then**:
- Small input popover appears
- User enters percentage (e.g., 5)
- "Apply" button confirms
- All future months increased by that %
- Amounts rounded to nearest cent
- Toast notification: "Increased X months by Y%"

### AC6: Menu Dismissal
**Given** the context menu is open
**When** user clicks outside OR presses Escape
**Then**:
- Context menu closes
- No action taken

### AC7: Keyboard Accessibility
**Given** a cell is focused
**When** user presses Shift+F10 or Menu key
**Then**:
- Context menu opens
- Arrow keys navigate menu
- Enter selects item

## Test Definition

### Unit Tests
- [ ] `src/lib/components/shared/__tests__/ContextMenu.test.ts` - Test menu renders at provided x,y cursor coordinates
- [ ] `src/lib/components/shared/__tests__/ContextMenu.test.ts` - Test menu repositions when near viewport edge
- [ ] `src/lib/components/shared/__tests__/ContextMenu.test.ts` - Test click outside closes menu and emits close event
- [ ] `src/lib/components/shared/__tests__/ContextMenu.test.ts` - Test Escape key closes menu
- [ ] `src/lib/components/shared/__tests__/ContextMenu.test.ts` - Test arrow keys navigate menu items
- [ ] `src/lib/components/shared/__tests__/ContextMenu.test.ts` - Test Enter key selects highlighted item
- [ ] `src/lib/components/budget/__tests__/BudgetCellContextMenu.test.ts` - Test "Edit this month" option triggers edit mode
- [ ] `src/lib/components/budget/__tests__/BudgetCellContextMenu.test.ts` - Test "Set for all future months" opens amount input popover
- [ ] `src/lib/components/budget/__tests__/BudgetCellContextMenu.test.ts` - Test "Increase future months by %" opens percentage input popover
- [ ] `src/lib/components/budget/__tests__/BudgetCellContextMenu.test.ts` - Test percentage calculation: 400 + 5% = 420
- [ ] `src/lib/components/budget/__tests__/BudgetCellContextMenu.test.ts` - Test percentage rounding to nearest cent (400.50 + 3% = 412.52)
- [ ] `src/lib/components/budget/__tests__/BudgetCell.test.ts` - Test right-click prevents default browser menu
- [ ] `src/lib/components/budget/__tests__/BudgetCell.test.ts` - Test Shift+F10 opens context menu (keyboard accessibility)
- [ ] `src/lib/components/shared/__tests__/Toast.test.ts` - Test toast displays message and auto-dismisses
- [ ] `src/lib/components/shared/__tests__/Toast.test.ts` - Test toast shows "Updated X months" format

### Integration Tests
- [ ] `src-tauri/src/commands/budget_test.rs` - Test `set_budgets_batch(category_id, months[], amount_cents)` updates multiple months
- [ ] `src-tauri/src/commands/budget_test.rs` - Test `increase_budgets_batch(category_id, months[], percentage)` applies percentage correctly
- [ ] `src-tauri/src/commands/budget_test.rs` - Test batch update returns count of affected rows
- [ ] `src/lib/api/__tests__/budgets.test.ts` - Test batch update API call structure and response handling

### E2E Tests
- [ ] `e2e/budget-context-menu.spec.ts` - Test right-click opens menu -> select "Edit this month" -> cell enters edit mode
- [ ] `e2e/budget-context-menu.spec.ts` - Test "Set for all future months" -> enter 500 -> verify 12 months updated -> toast appears
- [ ] `e2e/budget-context-menu.spec.ts` - Test "Increase by %" -> enter 10 -> verify calculated values in future months
- [ ] `e2e/budget-context-menu.spec.ts` - Test keyboard flow: focus cell -> Shift+F10 -> arrow down -> Enter

## Implementation Notes

1. Create ContextMenu component
2. Position menu using cursor coordinates
3. Prevent default browser context menu
4. Create batch update API endpoint
5. Show loading state during batch operations

## Files to Create/Modify

- `src/lib/components/shared/ContextMenu.svelte`
- `src/lib/components/budget/BudgetCellContextMenu.svelte`
- `src/lib/components/budget/BudgetCell.svelte` - add context menu
- `src/lib/api/budgets.ts` - batch update functions
- `src/lib/components/shared/Toast.svelte` - notifications
