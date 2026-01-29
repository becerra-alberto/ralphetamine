---
id: "2.3"
epic: 2
title: "Implement Collapsible Category Sections"
status: pending
priority: high
estimation: medium
depends_on: ["2.2"]
frs: ["FR2"]
---

# Story 2.3: Implement Collapsible Category Sections

## User Story

As a **user**,
I want **budget categories organized in collapsible sections**,
So that **I can focus on specific areas of my budget**.

## Technical Context

**Section Structure (from PRD Section 3.1.1):**
1. Income (at top - shows positive amounts)
2. Housing
3. Essential
4. Lifestyle
5. Savings

**Section Behavior:**
- Section headers are clickable
- Collapsed sections show aggregate totals
- Expanded sections show all child categories

## Acceptance Criteria

### AC1: Sections Display in Order
**Given** the budget grid is displayed
**When** categories are rendered
**Then** they are grouped into 5 sections in order:
1. Income
2. Housing
3. Essential
4. Lifestyle
5. Savings

### AC2: Section Headers Render
**Given** a section is displayed
**When** the section header renders
**Then** it shows:
- Section name (bold)
- Expand/collapse indicator (▼ expanded, ▶ collapsed)
- Section total for each month column
- Distinct background color (--bg-secondary)

### AC3: Section Expand/Collapse
**Given** a section header is displayed
**When** the user clicks the header
**Then**:
- If expanded: collapses to hide child categories
- If collapsed: expands to show child categories
- Collapse indicator updates
- Transition is animated (200ms)

### AC4: Collapsed Section Shows Totals
**Given** a section is collapsed
**When** the section row displays
**Then** each month cell shows:
- Total actual: SUM of all child category actuals
- Total budget: SUM of all child category budgets
- Color coding based on total over/under

### AC5: Section State Persists in Session
**Given** the user collapses a section
**When** they navigate away and back to budget view
**Then** the section remains collapsed
**And** state is stored in session/local storage

### AC6: Keyboard Navigation
**Given** a section header is focused
**When** the user presses Enter or Space
**Then** the section toggles expand/collapse

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` - Test section header renders name and collapse indicator
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` - Test indicator shows ▼ when expanded
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` - Test indicator shows ▶ when collapsed
- [ ] `src/lib/__tests__/components/budget/SectionHeader.test.ts` - Test section header has distinct background (--bg-secondary)
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.test.ts` - Test 5 sections render in order: Income, Housing, Essential, Lifestyle, Savings
- [ ] `src/lib/__tests__/utils/categoryGroups.test.ts` - Test categories grouped correctly by parent section
- [ ] `src/lib/__tests__/utils/categoryGroups.test.ts` - Test section totals calculated from child categories in cents
- [ ] `src/lib/__tests__/stores/budgetUI.test.ts` - Test collapse state stored in store
- [ ] `src/lib/__tests__/stores/budgetUI.test.ts` - Test collapse state persists to localStorage

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/SectionHeader.integration.test.ts` - Test collapsed section shows aggregate totals (SUM in cents)
- [ ] `src/lib/__tests__/components/budget/SectionHeader.integration.test.ts` - Test collapsed section totals color-coded based on over/under budget
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test click toggles section expand/collapse state
- [ ] `src/lib/__tests__/components/budget/BudgetGrid.integration.test.ts` - Test expanded sections show all child category rows

### E2E Tests
- [ ] `e2e/collapsible-sections.spec.ts` - Test section expand/collapse animation completes in 200ms
- [ ] `e2e/collapsible-sections.spec.ts` - Test keyboard navigation: Enter/Space toggles section
- [ ] `e2e/collapsible-sections.spec.ts` - Test collapse state persists after navigating away and back
- [ ] `e2e/collapsible-sections.spec.ts` - Test section state persists in sessionStorage/localStorage

## Implementation Notes

1. Use parent_id=NULL categories as section headers
2. Group child categories by parent
3. Store collapse state in Svelte store or localStorage
4. Use CSS transitions for smooth animation
5. Calculate section totals reactively

## Files to Create/Modify

- `src/lib/components/budget/SectionHeader.svelte` - section row component
- `src/lib/components/budget/BudgetGrid.svelte` - update for sections
- `src/lib/stores/budgetUI.ts` - UI state (collapsed sections)
- `src/lib/utils/categoryGroups.ts` - group categories by section
