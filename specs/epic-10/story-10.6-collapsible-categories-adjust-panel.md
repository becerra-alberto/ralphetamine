---
id: "10.6"
epic: 10
title: "Collapsible Categories in Adjust Panel"
status: pending
priority: medium
estimation: small
depends_on: ["10.5"]
---

# Story 10.6: Collapsible Categories in Adjust Panel

## User Story

As a **user selecting categories for budget adjustment**,
I want **category sections to be collapsible in the adjust panel**,
So that **I can focus on the sections I'm adjusting without visual clutter**.

## Technical Context

**Bug refs:** Items 2e (collapsible sections), 2f (master toggle)

The BudgetAdjustmentModal's category selection panel shows all categories flat. Each section header (Income, Housing, etc.) should be collapsible, hiding its subcategory checkboxes. A master collapse button should collapse/expand all sections at once.

## Acceptance Criteria

### AC1: Section Collapse Toggle
**Given** the category selection panel
**When** user clicks a section header toggle
**Then**:
- Subcategory checkboxes below that section collapse/hide
- Toggle icon indicates collapsed state

### AC2: Collapsed Summary
**Given** a collapsed section
**When** rendered
**Then**:
- Shows "(N of M selected)" summary text
- Still indicates selection state without showing individual checkboxes

### AC3: Master Toggle
**Given** the category selection panel
**When** user clicks the master collapse/expand button
**Then**:
- All sections collapse or expand together
- Expanding restores full checkbox visibility

### AC4: Expand Restores
**Given** a collapsed section
**When** user expands it
**Then**:
- All subcategory checkboxes reappear
- Selection states preserved from before collapse

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — section header has collapse toggle
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — clicking toggle hides subcategory checkboxes
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — collapsed section shows "(N of M selected)" summary
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — master collapse button hides entire categories section
- [ ] `src/lib/__tests__/components/budget/BudgetAdjustmentModal.test.ts` — expanding restores checkbox visibility

## Implementation Notes

1. Add `collapsedSections: Set<string>` state to track which sections are collapsed
2. Add toggle icon (chevron) to each section header in the category list
3. When collapsed, hide subcategory checkboxes and show "(N of M selected)" text
4. Add master toggle button at top of category panel
5. Preserve checkbox selection state independently of collapse state

## Files to Create/Modify

- `src/lib/components/budget/BudgetAdjustmentModal.svelte` — add collapse logic and UI
