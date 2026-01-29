---
id: "2.2"
epic: 2
title: "Create Budget Grid Component with Month Columns"
status: pending
priority: critical
estimation: large
depends_on: ["2.1"]
frs: ["FR1", "FR3"]
---

# Story 2.2: Create Budget Grid Component with Month Columns

## User Story

As a **user**,
I want **to see my budget in a spreadsheet-style grid with months as columns**,
So that **I can view my financial plan across time**.

## Technical Context

**Layout Requirements (from PRD Section 3.1.1):**
- Rows = budget categories
- Columns = months with year headers
- Horizontal scroll for months
- Fixed first column (category names)
- Default: rolling 12 months

**Design Tokens:**
- Font: Inter/SF Pro, tabular figures for numbers
- Cell padding: 12px
- Border: 1px solid --bg-secondary

## Acceptance Criteria

### AC1: Grid Structure Renders
**Given** the user navigates to /budget
**When** the Budget View renders
**Then** a grid displays with:
- First column: Category names (fixed/sticky)
- Subsequent columns: One per month
- Header row: Month labels (e.g., "Jan", "Feb")
- Year headers spanning months (e.g., "2024" over Jan-Dec 2024)

### AC2: Default Date Range
**Given** the budget view loads
**When** no date range is specified
**Then** the grid shows 12 months:
- Current month
- 11 previous months
- Ordered chronologically (oldest left, newest right)

### AC3: Year Headers Display
**Given** the date range spans multiple years
**When** the grid renders
**Then** year headers appear:
- Spanning all months in that year
- Visually distinct from month headers
- Example: "2024" spans Jan-Dec 2024

### AC4: Horizontal Scroll Works
**Given** there are more months than viewport width
**When** the user scrolls horizontally
**Then**:
- Month columns scroll left/right
- Category column remains fixed (sticky)
- Year headers scroll with months
- Scroll position is smooth

### AC5: Category Rows Display
**Given** categories exist in database
**When** the grid renders
**Then**:
- One row per category
- Categories grouped by section (handled in next story)
- Row height consistent (min 48px)

### AC6: Empty State
**Given** no budgets or transactions exist
**When** the grid renders
**Then**:
- Grid structure still displays
- Cells show €0.00 for both actual and budget
- "Add your first budget" prompt appears

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` - Test grid renders with category rows from store
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` - Test grid structure has correct number of columns
- [ ] `src/lib/__tests__/components/budget/MonthHeader.test.ts` - Test month header displays abbreviated month names
- [ ] `src/lib/__tests__/components/budget/YearHeader.test.ts` - Test year header spans correct number of months
- [ ] `src/lib/__tests__/components/budget/YearHeader.test.ts` - Test year headers recalculate when range spans multiple years
- [ ] `src/lib/__tests__/components/budget/CategoryRow.test.ts` - Test row renders with category name and cells
- [ ] `src/lib/__tests__/components/budget/CategoryRow.test.ts` - Test minimum row height is 48px
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test default range calculation (current month + 11 previous)
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test months ordered chronologically (oldest left, newest right)
- [ ] `src/lib/__tests__/stores/budget.test.ts` - Test budget store initializes with default 12-month range

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test grid displays €0.00 when no budgets/transactions exist
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test "Add your first budget" prompt appears on empty state
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test grid fetches data from Tauri backend

### E2E Tests
- [ ] `e2e/budget-grid.spec.ts` - Test horizontal scroll works and category column stays fixed (sticky)
- [ ] `e2e/budget-grid.spec.ts` - Test grid renders in < 100ms with performance API
- [ ] `e2e/budget-grid.spec.ts` - Test navigation to /budget displays grid structure
- [ ] `e2e/budget-grid.spec.ts` - Test year headers scroll with months while category column stays fixed

## Implementation Notes

1. Use CSS Grid or Table with sticky positioning
2. Create virtualized rendering for large date ranges
3. Month/year calculations use date-fns or similar
4. Store scroll position in component state
5. Use Svelte reactive statements for data binding

## Files to Create/Modify

- `src/routes/budget/+page.svelte` - main budget view
- `src/lib/components/budget/BudgetGrid.svelte` - grid container
- `src/lib/components/budget/MonthHeader.svelte` - month column header
- `src/lib/components/budget/YearHeader.svelte` - year spanning header
- `src/lib/components/budget/CategoryRow.svelte` - category row
- `src/lib/stores/budget.ts` - budget data store
- `src/lib/utils/dates.ts` - date range utilities
