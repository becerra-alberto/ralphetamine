---
id: "6.4"
epic: 6
title: "Create Returning User Dashboard"
status: done
priority: high
estimation: medium
depends_on: ["6.1"]
frs: ["FR29", "FR30", "FR31"]
---

# Story 6.4: Create Returning User Dashboard

## User Story

As a **returning user**,
I want **a quick overview when I open the app**,
So that **I can see my current financial status**.

## Technical Context

**Dashboard (from PRD Section 3.4.2):**
- Command palette prompt
- Quick navigation shortcuts
- Current month summary cards

## Acceptance Criteria

### AC1: Dashboard Display
**Given** user has completed onboarding
**When** they navigate to / (home)
**Then**:
- Dashboard view displays
- Not the onboarding wizard

### AC2: Command Palette Prompt
**Given** the dashboard displays
**When** the header area renders
**Then** shows:
- Prominent text: "Press ⌘K to get started"
- Styled as call-to-action
- Keyboard hint visible

### AC3: Quick Shortcuts Display
**Given** the dashboard displays
**When** shortcuts section renders
**Then** shows:
- "Quick shortcuts" label
- ⌘T - Transactions
- ⌘U - Budget
- ⌘W - Net Worth
- Clickable (navigate on click)

### AC4: Current Month Summary
**Given** the dashboard displays
**When** summary cards render
**Then** shows three cards:
- Income this month: €X,XXX
- Expenses this month: €X,XXX
- Balance: €X,XXX (Income - Expenses)

### AC5: Income Card
**Given** transactions exist for current month
**When** Income card calculates
**Then**:
- Sum of all positive transactions
- Or: sum of income category transactions
- Green color theme
- Formatted as currency

### AC6: Expenses Card
**Given** transactions exist for current month
**When** Expenses card calculates
**Then**:
- Sum of all negative transactions (absolute value)
- Or: sum of expense category transactions
- Red color theme
- Formatted as currency

### AC7: Balance Card
**Given** income and expenses calculated
**When** Balance card renders
**Then**:
- Value: Income - Expenses
- Green if positive (surplus)
- Red if negative (deficit)
- Larger/prominent styling

### AC8: Empty State
**Given** no transactions exist
**When** dashboard renders
**Then**:
- Cards show €0.00
- Prompt: "Add your first transaction"
- Quick-add link

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/dashboard/Dashboard.test.ts` - Test dashboard component renders when onboarding_completed is true
- [ ] `src/lib/__tests__/dashboard/Dashboard.test.ts` - Test "Press Cmd+K to get started" prompt is visible
- [ ] `src/lib/__tests__/dashboard/QuickShortcuts.test.ts` - Test all three shortcuts render (Cmd+T, Cmd+U, Cmd+W)
- [ ] `src/lib/__tests__/dashboard/QuickShortcuts.test.ts` - Test clicking shortcut triggers navigation callback
- [ ] `src/lib/__tests__/dashboard/SummaryCards.test.ts` - Test Income card displays formatted currency value
- [ ] `src/lib/__tests__/dashboard/SummaryCards.test.ts` - Test Expenses card displays formatted currency value
- [ ] `src/lib/__tests__/dashboard/SummaryCards.test.ts` - Test Balance card calculates Income minus Expenses
- [ ] `src/lib/__tests__/dashboard/SummaryCards.test.ts` - Test Balance card shows green color when positive
- [ ] `src/lib/__tests__/dashboard/SummaryCards.test.ts` - Test Balance card shows red color when negative
- [ ] `src/lib/__tests__/dashboard/SummaryCards.test.ts` - Test empty state shows €0.00 and "Add your first transaction" prompt

### Integration Tests
- [ ] `src-tauri/src/commands/dashboard_test.rs` - Test get_current_month_income sums positive transactions correctly
- [ ] `src-tauri/src/commands/dashboard_test.rs` - Test get_current_month_expenses sums negative transactions (absolute value)
- [ ] `src-tauri/src/commands/dashboard_test.rs` - Test calculations filter to current YYYY-MM only

### E2E Tests
- [ ] `e2e/dashboard.spec.ts` - Test returning user sees dashboard on app launch
- [ ] `e2e/dashboard.spec.ts` - Test clicking "Cmd+T" shortcut navigates to Transactions view
- [ ] `e2e/dashboard.spec.ts` - Test clicking "Cmd+U" shortcut navigates to Budget view
- [ ] `e2e/dashboard.spec.ts` - Test summary cards update after adding a transaction

## Implementation Notes

1. Create Dashboard component
2. Create SummaryCards component
3. Calculate current month totals
4. Make shortcuts clickable
5. Style command palette prompt

## Files to Create/Modify

- `src/routes/+page.svelte` - dashboard vs onboarding
- `src/lib/components/dashboard/Dashboard.svelte`
- `src/lib/components/dashboard/SummaryCards.svelte`
- `src/lib/components/dashboard/QuickShortcuts.svelte`
- `src/lib/stores/dashboard.ts` - current month calculations
