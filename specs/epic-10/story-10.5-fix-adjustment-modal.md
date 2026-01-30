---
id: "10.5"
epic: 10
title: "Fix Adjustment Modal (Dropdown, Input, Preview, Apply)"
status: pending
priority: critical
estimation: medium
depends_on: []
---

# Story 10.5: Fix Adjustment Modal (Dropdown, Input, Preview, Apply)

## User Story

As a **user applying bulk budget adjustments**,
I want **the adjustment modal's dropdown, input, preview, and apply button to work correctly**,
So that **I can efficiently adjust budgets across multiple categories and months**.

## Technical Context

**Bug refs:** Items 2g (dropdown), 2h (input), 2i (preview), 2j (apply)

Four issues with BudgetAdjustmentModal: (1) Operation dropdown doesn't accept clicks / doesn't change value. (2) Amount input doesn't accept keyboard input. (3) Preview section shows static text instead of an expandable "Show N more" list. (4) Apply button doesn't call the API or shows unhelpful error messages.

## Acceptance Criteria

### AC1: Operation Dropdown Works
**Given** the adjustment modal is open
**When** user clicks the operation dropdown
**Then**:
- Dropdown opens and shows options (Set, Add, Subtract, Multiply)
- Selecting an option updates the value
- Selected value reflects in the UI

### AC2: Amount Input Works
**Given** the adjustment modal is open
**When** user types in the amount input
**Then**:
- Input accepts keyboard input
- Value updates as user types
- Numeric validation applied

### AC3: Preview Expandable
**Given** the preview section shows affected cells
**When** there are more items than the visible limit
**Then**:
- Shows "Show N more" clickable button
- Clicking expands to reveal all preview items
- All items visible in expanded state

### AC4: Apply Calls API
**Given** user clicks Apply
**When** the adjustments are submitted
**Then**:
- `setBudget` API called for each affected cell
- Success shows confirmation
- Error shows descriptive toast with backend error message

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — Operation dropdown accepts click and changes value
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — Amount input accepts keyboard input and updates value
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — Preview section shows "Show N more" button instead of static text
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — clicking "Show more" reveals all preview items
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — Apply button calls setBudget API for each affected cell
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — Apply error shows descriptive toast message with backend error

### Component Tests
- [ ] `src/lib/__tests__/components/budget/AdjustmentPreview.test.ts` — renders "Show N more" clickable link
- [ ] `src/lib/__tests__/components/budget/AdjustmentPreview.test.ts` — clicking expands full list
- [ ] `src/lib/__tests__/components/budget/AdjustmentPreview.test.ts` — expanded state shows all items

## Implementation Notes

1. Fix dropdown: ensure `<select>` or custom dropdown handles click events and `bind:value`
2. Fix input: ensure `bind:value` and event handlers are wired correctly
3. Refactor preview into AdjustmentPreview component with expandable list
4. Fix apply: wire `setBudget` API calls with proper error handling and toast notifications
5. Initial visible count: show first 5 items, then "Show N more" for the rest

## Files to Create/Modify

- `src/lib/components/budget/BudgetAdjustmentModal.svelte` — fix dropdown, input, apply
- `src/lib/components/budget/AdjustmentPreview.svelte` — create expandable preview component
