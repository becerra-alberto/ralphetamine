---
id: "10.1"
epic: 10
title: "Smart Number Formatting (K units)"
status: pending
priority: high
estimation: medium
depends_on: []
---

# Story 10.1: Smart Number Formatting (K units)

## User Story

As a **user viewing budget cells**,
I want **amounts to display in a compact format with K suffix for thousands**,
So that **budget cells are readable without unnecessary decimal places or overflowing text**.

## Technical Context

**Bug refs:** Item 2a (number formatting)

Budget cells currently show amounts with ".00" suffixes and full numbers that overflow narrow cells. A `formatBudgetAmount` utility should format values: under 1000 as integers, 1000+ as "1.5K" style, with currency symbol prefix.

## Acceptance Criteria

### AC1: Compact Formatting
**Given** a budget amount in cents
**When** rendered in a budget cell
**Then**:
- 0 → "0"
- 50000 (500.00) → "500" (no decimals)
- 99999 (999.99) → "999"
- 100000 (1000.00) → "1K" (exact thousands, no decimal)
- 150000 (1500.00) → "1.5K"
- Negative values keep the minus sign: -150000 → "-1.5K"

### AC2: Currency Prefix
**Given** the formatted amount
**When** displayed
**Then**:
- Currency symbol prefixed (e.g., "$1.5K", "€500")

### AC3: Cell Display
**Given** a BudgetCell component
**When** rendering the amount
**Then**:
- No ".00" suffix visible
- Amounts over 1000 show K suffix
- Text fits within cell width

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(0) returns "0"
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(50000) returns "500" (no decimals)
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(150000) returns "1.5K"
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(-50000) returns "-500"
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(-150000) returns "-1.5K"
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(100000) returns "1K" (exact thousands no decimal)
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — formatBudgetAmount(99999) returns "999"
- [ ] `src/lib/__tests__/utils/budgetFormatting.test.ts` — includes currency symbol prefix

### Component Tests
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` — cell renders compact format (no ".00" suffix)
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` — amounts over 1000 show K suffix

## Implementation Notes

1. Create `src/lib/utils/budgetFormatting.ts` with `formatBudgetAmount(cents: number, currency?: string): string`
2. Logic: convert cents to dollars, if abs >= 1000 use K suffix with at most 1 decimal, else integer
3. Update BudgetCell to use formatBudgetAmount instead of raw number display

## Files to Create/Modify

- `src/lib/utils/budgetFormatting.ts` — create formatting utility
- `src/lib/components/budget/BudgetCell.svelte` — use new formatter
