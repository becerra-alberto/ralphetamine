---
id: "2.5"
epic: 2
title: "Display Budget Cells with Actual vs Planned"
status: pending
priority: critical
estimation: medium
depends_on: ["2.2", "2.1"]
frs: ["FR7"]
---

# Story 2.5: Display Budget Cells with Actual vs Planned

## User Story

As a **user**,
I want **each budget cell to show actual spending versus my budget**,
So that **I can see how I'm tracking against my plan**.

## Technical Context

**Cell Display (from PRD Section 3.1.2):**
- Actual amount: top, larger font
- Budget amount: bottom, muted/smaller
- Amounts in user's currency (EUR default)

**Data Calculations:**
- Actual = SUM(transactions.amount_cents) WHERE category_id AND month
- Budget = budgets.amount_cents WHERE category_id AND month

**Currency Formatting:**
- Symbol: € (EUR), $ (USD/CAD)
- Thousands separator: comma
- Decimal: 2 places
- Format: €1,234.56

## Acceptance Criteria

### AC1: Cell Layout
**Given** a budget cell renders
**When** displayed to user
**Then** the cell shows:
- Actual amount on top (font-size: 14px, font-weight: 500)
- Budget amount below (font-size: 12px, color: --text-secondary)
- Proper vertical alignment
- Minimum cell width: 100px

### AC2: Actual Amount Calculated
**Given** transactions exist for a category/month
**When** the cell calculates actual
**Then**:
- SUM of all transaction amount_cents for that category + month
- Converted from cents to display (÷100)
- Formatted as currency

### AC3: Budget Amount Displayed
**Given** a budget is set for category/month
**When** the cell displays budget
**Then**:
- Shows the budgets.amount_cents value
- Converted from cents to display
- Formatted as currency

### AC4: No Data Handling
**Given** no transactions exist for a category/month
**When** the cell renders
**Then** actual shows €0.00

**Given** no budget is set for a category/month
**When** the cell renders
**Then** budget shows €0.00

### AC5: Currency Formatting
**Given** an amount is displayed
**When** formatted for display
**Then**:
- Uses correct currency symbol based on settings
- Thousands separator: 1,234
- Two decimal places: .00
- Negative amounts: -€100.00 or (€100.00)

### AC6: Income Category Display
**Given** a category is type='income'
**When** the cell displays amounts
**Then**:
- Positive amounts show as positive (income received)
- Display convention may differ (actuals are good when high)

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test cell layout: actual on top (14px, font-weight 500), budget below (12px, --text-secondary)
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test minimum cell width is 100px
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test proper vertical alignment of amounts
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test €0.00 shown when no transactions exist
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test €0.00 shown when no budget is set
- [ ] `src/lib/__tests__/utils/currency.test.ts` - Test cents to display conversion (divide by 100)
- [ ] `src/lib/__tests__/utils/currency.test.ts` - Test currency symbol based on settings (€, $)
- [ ] `src/lib/__tests__/utils/currency.test.ts` - Test thousands separator formatting (1,234)
- [ ] `src/lib/__tests__/utils/currency.test.ts` - Test two decimal places (.00)
- [ ] `src/lib/__tests__/utils/currency.test.ts` - Test negative amounts format: -€100.00 or (€100.00)
- [ ] `src/lib/__tests__/utils/currency.test.ts` - Test no floating point errors: 1999 cents = €19.99 exactly
- [ ] `src/lib/__tests__/stores/budget.test.ts` - Test actual computed as SUM(amount_cents) for category+month

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test actual = SUM(transactions.amount_cents) for category + month
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test budget = budgets.amount_cents for category + month
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test income category displays positive amounts correctly
- [ ] `src-tauri/src/commands/budgets_test.rs` - Test aggregation queries return cents (integer) values

### Performance Tests
- [ ] `src/lib/__tests__/components/budget/BudgetCell.perf.test.ts` - Test single cell renders in < 10ms
- [ ] `src/lib/__tests__/components/budget/BudgetCell.perf.test.ts` - Test memoization prevents unnecessary recalculations

## Implementation Notes

1. Create BudgetCell component
2. Use Intl.NumberFormat for currency formatting
3. Memoize calculations per cell
4. Consider virtual scrolling for many cells
5. Use CSS for visual hierarchy

## Files to Create/Modify

- `src/lib/components/budget/BudgetCell.svelte`
- `src/lib/utils/currency.ts` - formatting utilities
- `src/lib/stores/budget.ts` - computed actual values
