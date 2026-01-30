---
id: "10.9"
epic: 10
title: "Add New Categories and Subcategories"
status: pending
priority: high
estimation: large
depends_on: []
---

# Story 10.9: Add New Categories and Subcategories

## User Story

As a **user customizing my budget structure**,
I want **to add new categories and subcategories from within the budget view**,
So that **I can organize my budget to match my actual spending patterns**.

## Technical Context

**Bug refs:** Item 2l (add categories)

The budget view currently has no UI for adding categories. Users need a modal to create top-level categories (sections) or subcategories within existing sections. The category API already supports creation — this story adds the UI.

## Acceptance Criteria

### AC1: Add Category Button
**Given** the budget grid
**When** rendered
**Then**:
- An "Add Category" button is visible (e.g., below the grid or in a toolbar)
- Opens the CategoryManageModal

### AC2: Add Subcategory from Section
**Given** a section header (e.g., Housing)
**When** user clicks "+" or "Add subcategory" action
**Then**:
- Opens CategoryManageModal with parentId pre-set to that section
- New subcategory will appear under that section

### AC3: Category Manage Modal
**Given** the CategoryManageModal
**When** creating a new category
**Then**:
- Form renders name, type, and parent category fields
- Name is required (validation error if empty)
- Creating top-level category sets parentId to null
- Creating subcategory sets parentId to selected section
- Submit dispatches create event
- API called with correct payload

### AC4: New Category Appears
**Given** a category is created successfully
**When** returning to the budget grid
**Then**:
- New category/subcategory appears in the correct section
- Budget cells for the new category are empty/zero
- Can immediately start entering budget amounts

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/CategoryManageModal.test.ts` — renders name, type, parent category fields
- [ ] `src/lib/__tests__/components/budget/CategoryManageModal.test.ts` — validates name required
- [ ] `src/lib/__tests__/components/budget/CategoryManageModal.test.ts` — creating top-level category sets parentId null
- [ ] `src/lib/__tests__/components/budget/CategoryManageModal.test.ts` — creating subcategory sets parentId to selected section
- [ ] `src/lib/__tests__/components/budget/CategoryManageModal.test.ts` — submit dispatches create event
- [ ] `src/lib/__tests__/components/budget/CategoryManageModal.test.ts` — API called with correct payload

### Component Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` — "Add Category" button visible
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` — "Add subcategory" option in section header
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` — section has "+" or "Add subcategory" action

## Implementation Notes

1. Create CategoryManageModal component with name, type (income|expense), parent select fields
2. Add "Add Category" button to BudgetGrid toolbar
3. Add "+" action to SectionHeader for adding subcategories
4. Wire API calls to create_category Tauri command
5. Refresh budget data after successful creation

## Files to Create/Modify

- `src/lib/components/budget/CategoryManageModal.svelte` — create new component
- `src/lib/components/budget/BudgetGrid.svelte` — add "Add Category" button
- `src/lib/components/budget/SectionHeader.svelte` — add "Add subcategory" action
