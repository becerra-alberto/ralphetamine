---
id: "5.1"
epic: 5
title: "Create Net Worth Summary Section"
status: pending
priority: high
estimation: medium
depends_on: ["1.3"]
frs: ["FR23"]
---

# Story 5.1: Create Net Worth Summary Section

## User Story

As a **user**,
I want **to see my total assets and liabilities at a glance**,
So that **I understand my overall financial position**.

## Technical Context

**Net Worth Summary (from PRD Section 3.3.1):**
- Total Assets with visual progress bar
- Total Liabilities with visual progress bar
- Net Worth calculation

**Account Types:**
- Assets: checking, savings, investment, cash
- Liabilities: credit (when balance negative)

## Acceptance Criteria

### AC1: Summary Section Layout
**Given** user navigates to /net-worth
**When** the view renders
**Then** a summary section displays at top:
- Total Assets card
- Total Liabilities card
- Net Worth card (largest, prominent)
- Horizontal layout (3 cards)

### AC2: Total Assets Display
**Given** accounts exist with balances
**When** Total Assets card renders
**Then** shows:
- Label: "Total Assets"
- Amount: €XX,XXX.XX
- Progress bar (visual only, fills based on % of net worth)
- Green color theme

### AC3: Total Liabilities Display
**Given** accounts with liabilities exist
**When** Total Liabilities card renders
**Then** shows:
- Label: "Total Liabilities"
- Amount: €XX,XXX.XX
- Progress bar (visual)
- Red color theme

### AC4: Net Worth Calculation
**Given** assets and liabilities exist
**When** Net Worth card renders
**Then** shows:
- Label: "Net Worth"
- Amount: Total Assets - Total Liabilities
- Large font size (prominent)
- Color: green if positive, red if negative

### AC5: Account Filtering
**Given** accounts have include_in_net_worth flag
**When** totals are calculated
**Then**:
- Only accounts with include_in_net_worth = true counted
- Inactive accounts (is_active = false) excluded

### AC6: Multi-Currency Handling
**Given** accounts in different currencies exist
**When** totals are calculated
**Then**:
- Convert to base currency (EUR)
- Use stored exchange rates
- Show base currency in summary

### AC7: Empty State
**Given** no accounts exist
**When** summary renders
**Then**:
- All values show €0.00
- Prompt to add first account

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/NetWorthSummary.test.ts` - Test three-card layout renders correctly (assets, liabilities, net worth)
- [ ] `src/lib/__tests__/NetWorthSummary.test.ts` - Test total assets calculated correctly in cents (sum of checking, savings, investment, cash accounts)
- [ ] `src/lib/__tests__/NetWorthSummary.test.ts` - Test total liabilities calculated correctly in cents (credit accounts with negative balance)
- [ ] `src/lib/__tests__/NetWorthSummary.test.ts` - Test net worth = assets - liabilities using cents arithmetic (avoid floating point)
- [ ] `src/lib/__tests__/NetWorthSummary.test.ts` - Test positive net worth displays green, negative displays red
- [ ] `src/lib/__tests__/SummaryCard.test.ts` - Test progress bar percentage calculation (value/total * 100)
- [ ] `src/lib/__tests__/currency.test.ts` - Test EUR display formatting (tabular figures, thousand separators)
- [ ] `src/lib/__tests__/currency.test.ts` - Test multi-currency conversion to base EUR using exchange rates
- [ ] `src/lib/stores/__tests__/netWorth.test.ts` - Test account filtering: only include_in_net_worth=true accounts
- [ ] `src/lib/stores/__tests__/netWorth.test.ts` - Test inactive accounts (is_active=false) excluded from totals

### Integration Tests
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test get_net_worth_summary returns correct totals from SQLite
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test cents arithmetic: 10000 + 5000 = 15000 (not 150.00)
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test account type aggregation by asset vs liability classification
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test currency conversion with stored exchange rates

### E2E Tests
- [ ] `e2e/net-worth-summary.spec.ts` - Test navigating to /net-worth displays summary section
- [ ] `e2e/net-worth-summary.spec.ts` - Test empty state shows €0.00 and prompt to add account
- [ ] `e2e/net-worth-summary.spec.ts` - Test totals update reactively when account balances change

## Implementation Notes

1. Create NetWorthSummary component
2. Create SummaryCard component
3. Calculate totals from accounts table
4. Handle currency conversion
5. Use reactive statements for recalculation

## Files to Create/Modify

- `src/routes/net-worth/+page.svelte`
- `src/lib/components/net-worth/NetWorthSummary.svelte`
- `src/lib/components/net-worth/SummaryCard.svelte`
- `src/lib/stores/netWorth.ts`
- `src/lib/utils/currency.ts` - conversion utilities
