---
id: "3.4"
epic: 3
title: "Create Batch Budget Adjustment Modal"
status: pending
priority: medium
estimation: large
depends_on: ["3.1"]
frs: ["FR13"]
---

# Story 3.4: Create Batch Budget Adjustment Modal

## User Story

As a **user**,
I want **a dedicated modal for complex budget adjustments**,
So that **I can make sophisticated changes to my budget plan**.

## Technical Context

**Modal Features (from PRD Section 3.1.3):**
- Category selection
- Date range selection
- Multiple operations
- Preview before apply

## Acceptance Criteria

### AC1: Modal Opens
**Given** the budget view is displayed
**When** the user clicks "Adjust Budgets" button OR presses Cmd+Shift+B
**Then**:
- A modal dialog opens
- Modal is centered on screen
- Background is dimmed
- Focus trapped in modal

### AC2: Category Selector
**Given** the modal is open
**When** the category selector renders
**Then**:
- Dropdown with all categories
- Grouped by section
- "All categories" option
- Multi-select supported

### AC3: Date Range Selector
**Given** the modal is open
**When** the date range is configured
**Then**:
- Start month picker
- End month picker
- Presets: "Next 3 months", "Next 6 months", "Next 12 months"
- Maximum range: 24 months

### AC4: Operation Selector
**Given** the modal is open
**When** operation options are displayed
**Then** user can choose:
- "Set amount" - set fixed amount for all selected
- "Increase by %" - percentage increase
- "Decrease by %" - percentage decrease
- "Copy from previous period" - duplicate from prior months

### AC5: Amount/Percentage Input
**Given** an operation is selected
**When** the input field renders
**Then**:
- For "Set amount": currency input (€XXX.XX)
- For percentage: number input with % suffix
- Validation on input

### AC6: Preview Panel
**Given** selections are made
**When** the preview updates
**Then** shows:
- Number of cells affected
- Before/after comparison for first 3-5 cells
- Total impact (optional)
- Updates live as selections change

### AC7: Apply Changes
**Given** the user clicks "Apply"
**When** changes are submitted
**Then**:
- Loading indicator shows
- All affected budgets updated
- Modal closes
- Grid refreshes with new values
- Toast: "Updated X budget cells"

### AC8: Cancel/Close
**Given** the modal is open
**When** user clicks "Cancel" OR presses Escape OR clicks backdrop
**Then**:
- Modal closes
- No changes saved
- Grid unchanged

## Test Definition

### Unit Tests
- [ ] `src/lib/components/shared/__tests__/Modal.test.ts` - Test modal renders centered with dimmed backdrop
- [ ] `src/lib/components/shared/__tests__/Modal.test.ts` - Test focus is trapped within modal (Tab cycles through modal elements)
- [ ] `src/lib/components/shared/__tests__/Modal.test.ts` - Test Escape key closes modal
- [ ] `src/lib/components/shared/__tests__/Modal.test.ts` - Test backdrop click closes modal
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test category dropdown shows all categories grouped by section
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test "All categories" option selects all
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test multi-select allows multiple category selection
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test date range start/end month pickers render
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test preset "Next 3 months" sets correct date range
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test preset "Next 6 months" sets correct date range
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test preset "Next 12 months" sets correct date range
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test maximum range enforced (24 months)
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test "Set amount" operation shows currency input
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test "Increase by %" operation shows percentage input
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test "Decrease by %" operation shows percentage input
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test "Copy from previous period" option available
- [ ] `src/lib/components/budget/__tests__/AdjustmentPreview.test.ts` - Test preview shows count of affected cells
- [ ] `src/lib/components/budget/__tests__/AdjustmentPreview.test.ts` - Test preview shows before/after for first 5 cells
- [ ] `src/lib/components/budget/__tests__/AdjustmentPreview.test.ts` - Test preview updates live when selections change
- [ ] `src/lib/components/budget/__tests__/AdjustmentPreview.test.ts` - Test "Set amount" preview: all cells show new amount
- [ ] `src/lib/components/budget/__tests__/AdjustmentPreview.test.ts` - Test "Increase by %" preview: cells show calculated increase (400 + 10% = 440)
- [ ] `src/lib/components/budget/__tests__/AdjustmentPreview.test.ts` - Test "Decrease by %" preview: cells show calculated decrease (400 - 10% = 360)
- [ ] `src/lib/components/budget/__tests__/BudgetAdjustmentModal.test.ts` - Test Cancel button closes modal without changes

### Integration Tests
- [ ] `src-tauri/src/commands/budget_test.rs` - Test batch update with multiple categories and date range
- [ ] `src-tauri/src/commands/budget_test.rs` - Test batch percentage increase calculates and stores cents correctly
- [ ] `src-tauri/src/commands/budget_test.rs` - Test batch percentage decrease calculates correctly (handles negative edge case)
- [ ] `src-tauri/src/commands/budget_test.rs` - Test "Copy from previous period" duplicates prior month values
- [ ] `src/lib/api/__tests__/budgets.test.ts` - Test batch API payload structure with categories[], dateRange, operation, value

### E2E Tests
- [ ] `e2e/budget-batch-modal.spec.ts` - Test modal opens via "Adjust Budgets" button click
- [ ] `e2e/budget-batch-modal.spec.ts` - Test modal opens via Cmd+Shift+B keyboard shortcut
- [ ] `e2e/budget-batch-modal.spec.ts` - Test full flow: select 2 categories -> "Next 6 months" -> "Set amount" 500 -> verify preview -> Apply -> verify grid updates
- [ ] `e2e/budget-batch-modal.spec.ts` - Test percentage increase flow: single category -> 3 months -> 15% increase -> verify calculated values in grid
- [ ] `e2e/budget-batch-modal.spec.ts` - Test cancel flow: make selections -> Cancel -> verify grid unchanged
- [ ] `e2e/budget-batch-modal.spec.ts` - Test toast notification appears after successful batch update ("Updated X budget cells")
- [ ] `e2e/budget-batch-modal.spec.ts` - Test loading indicator displays during batch operation

## Implementation Notes

1. Create Modal component (reusable)
2. Create BudgetAdjustmentModal specific component
3. Build preview calculation (computed from selections)
4. Batch API call for performance
5. Handle loading/error states

## Files to Create/Modify

- `src/lib/components/shared/Modal.svelte`
- `src/lib/components/budget/BudgetAdjustmentModal.svelte`
- `src/lib/components/budget/AdjustmentPreview.svelte`
- `src/routes/budget/+page.svelte` - add button and modal
- `src/lib/api/budgets.ts` - batch update endpoint
