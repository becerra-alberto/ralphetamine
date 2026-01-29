---
id: "2.6"
epic: 2
title: "Add Color-Coded Spending Indicators"
status: pending
priority: high
estimation: small
depends_on: ["2.5"]
frs: ["FR7"]
---

# Story 2.6: Add Color-Coded Spending Indicators

## User Story

As a **user**,
I want **cells color-coded based on budget status**,
So that **I can quickly see where I'm over or under budget**.

## Technical Context

**Color Tokens (from PRD Section 6.1):**
- Success (under budget): #10B981
- Danger (over budget): #EF4444
- Warning (approaching): #F59E0B
- Neutral (on budget): #6B7280

**Thresholds:**
- Under budget: actual < budget
- On budget: actual within 1% of budget
- Approaching: actual between 90-100% of budget
- Over budget: actual > budget

## Acceptance Criteria

### AC1: Under Budget - Green
**Given** a budget cell is rendered
**When** actual < budget (for expense categories)
**Then**:
- Cell has subtle green background (--success at 10% opacity)
- Or left border indicator in green
- Actual amount text optionally green

### AC2: Over Budget - Red
**Given** a budget cell is rendered
**When** actual > budget (for expense categories)
**Then**:
- Cell has subtle red background (--danger at 10% opacity)
- Or left border indicator in red
- Clear visual warning of overspending

### AC3: On Budget - Neutral
**Given** a budget cell is rendered
**When** actual is within 1% of budget
**Then**:
- Cell has neutral styling (no color indicator)
- Or subtle gray indicator
- Visually distinct from under/over

### AC4: Approaching Limit - Warning
**Given** a budget cell is rendered
**When** actual is between 90-100% of budget
**Then**:
- Cell has subtle yellow/warning indicator
- Signals user is close to limit
- Different from over budget (red)

### AC5: No Budget Set - No Color
**Given** a budget cell is rendered
**When** budget amount is €0.00 (no budget set)
**Then**:
- No color coding applied
- Cell appears neutral
- Only actual amount shown prominently

### AC6: Income Categories - Inverted Logic
**Given** a category is type='income'
**When** color coding is applied
**Then**:
- Green when actual >= budget (income received)
- Red when actual < budget (income shortfall)
- Logic is inverted from expense categories

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test status returns "under" when actual < budget (cents comparison)
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test status returns "over" when actual > budget (cents comparison)
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test status returns "on-budget" when actual within 1% of budget
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test status returns "approaching" when actual between 90-100% of budget
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test status returns "none" when budget is 0 cents
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test income category inverted logic: green when actual >= budget
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test income category inverted logic: red when actual < budget
- [ ] `src/lib/__tests__/utils/budgetStatus.test.ts` - Test threshold calculations use cents to avoid floating point errors
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test under budget cell has green background (#10B981 at 10% opacity)
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test over budget cell has red background (#EF4444 at 10% opacity)
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test on-budget cell has neutral styling (#6B7280)
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test approaching limit cell has warning indicator (#F59E0B)
- [ ] `src/lib/__tests__/components/budget/BudgetCell.test.ts` - Test no budget set = no color coding applied

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test CSS classes applied based on budget status
- [ ] `src/lib/__tests__/components/budget/BudgetCell.integration.test.ts` - Test color coding updates when transactions change

### E2E Tests
- [ ] `e2e/color-coding.spec.ts` - Test visual verification of color tokens match design spec
- [ ] `e2e/color-coding.spec.ts` - Test text remains readable on colored backgrounds
- [ ] `e2e/color-coding.spec.ts` - Test colors are subtle (10-15% opacity backgrounds)

## Implementation Notes

1. Calculate budget status in BudgetCell
2. Use CSS classes for color states
3. Consider color-blind friendly alternatives (borders, icons)
4. Keep colors subtle (10-15% opacity backgrounds)
5. Ensure text remains readable on colored backgrounds

## Files to Create/Modify

- `src/lib/components/budget/BudgetCell.svelte` - add color logic
- `src/lib/utils/budgetStatus.ts` - status calculation helper
- `src/app.css` - color state CSS classes
