---
id: "3.1"
epic: 3
title: "Implement Inline Cell Editing"
status: pending
priority: critical
estimation: medium
depends_on: ["2.5"]
frs: ["FR10"]
---

# Story 3.1: Implement Inline Cell Editing

## User Story

As a **user**,
I want **to edit budget amounts directly in the grid**,
So that **I can quickly adjust my budget without opening dialogs**.

## Technical Context

**Editing Behavior (from PRD Section 3.1.3):**
- Double-click or Enter to edit
- Inline number input
- Enter to save, Escape to cancel

**Data Storage:**
- Amount stored as cents (integer)
- Convert display ↔ storage on edit

## Acceptance Criteria

### AC1: Enter Edit Mode - Double Click
**Given** a budget cell is displayed
**When** the user double-clicks the cell
**Then**:
- Cell enters edit mode
- Budget amount becomes editable input
- Input is focused automatically
- Current value is selected (for easy replacement)

### AC2: Enter Edit Mode - Keyboard
**Given** a budget cell is focused
**When** the user presses Enter
**Then**:
- Cell enters edit mode
- Same behavior as double-click

### AC3: Input Display
**Given** a cell is in edit mode
**When** the input renders
**Then**:
- Shows numeric input field
- Pre-filled with current budget value
- Currency symbol visible (but not editable)
- Input accepts decimal values (e.g., 400.00)

### AC4: Save on Enter
**Given** a cell is in edit mode
**When** the user types a value and presses Enter
**Then**:
- Value is validated (must be number >= 0)
- Converted to cents (× 100) for storage
- Saved to database via `set_budget(category_id, month, amount_cents)`
- Cell exits edit mode
- Display updates with new value

### AC5: Cancel on Escape
**Given** a cell is in edit mode
**When** the user presses Escape
**Then**:
- Changes are discarded
- Cell exits edit mode
- Original value remains displayed

### AC6: Save on Blur
**Given** a cell is in edit mode
**When** the user clicks outside the cell
**Then**:
- If value changed: save the new value
- If value unchanged: just exit edit mode
- Cell returns to display mode

### AC7: Validation
**Given** the user enters an invalid value
**When** attempting to save
**Then**:
- Shows validation error (red border, message)
- Prevents save
- Examples: negative numbers, non-numeric text

## Test Definition

### Unit Tests
- [ ] `src/lib/components/budget/__tests__/BudgetCell.test.ts` - Test double-click triggers edit mode state change
- [ ] `src/lib/components/budget/__tests__/BudgetCell.test.ts` - Test Enter key on focused cell triggers edit mode
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test input renders with current value pre-selected
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test currency symbol displays but is not editable
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test Enter key saves value and exits edit mode
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test Escape key discards changes and exits edit mode
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test blur event saves changes when value modified
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test blur event exits without save when value unchanged
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test validation rejects negative numbers (shows red border)
- [ ] `src/lib/components/budget/__tests__/CellInput.test.ts` - Test validation rejects non-numeric input
- [ ] `src/lib/utils/__tests__/currency.test.ts` - Test cents conversion: 400.00 display -> 40000 cents storage
- [ ] `src/lib/utils/__tests__/currency.test.ts` - Test cents conversion: 40000 cents -> 400.00 display
- [ ] `src/lib/utils/__tests__/currency.test.ts` - Test cents conversion handles decimal rounding (400.999 -> 40100)

### Integration Tests
- [ ] `src-tauri/src/commands/budget_test.rs` - Test `set_budget(category_id, month, amount_cents)` persists to SQLite
- [ ] `src-tauri/src/commands/budget_test.rs` - Test `set_budget` rejects negative amount_cents
- [ ] `src-tauri/src/commands/budget_test.rs` - Test `set_budget` updates existing budget vs creates new
- [ ] `src/lib/api/__tests__/budgets.test.ts` - Test save budget API call with Tauri mock

### E2E Tests
- [ ] `e2e/budget-editing.spec.ts` - Test full edit flow: double-click -> type value -> Enter -> verify display updates
- [ ] `e2e/budget-editing.spec.ts` - Test edit cancel flow: double-click -> type value -> Escape -> verify original value remains
- [ ] `e2e/budget-editing.spec.ts` - Test validation error displays and prevents save on invalid input

## Implementation Notes

1. Create EditableCell component wrapping BudgetCell
2. Track edit state locally in cell
3. Use input type="number" with step="0.01"
4. Convert display value ↔ cents on save/load
5. Debounce rapid edits to prevent excess DB calls

## Files to Create/Modify

- `src/lib/components/budget/BudgetCell.svelte` - add edit mode
- `src/lib/components/budget/CellInput.svelte` - edit input component
- `src/lib/api/budgets.ts` - save budget function
