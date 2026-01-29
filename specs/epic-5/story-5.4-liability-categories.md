---
id: "5.4"
epic: 5
title: "Display Liability Categories"
status: pending
priority: high
estimation: medium
depends_on: ["5.1"]
frs: ["FR26"]
---

# Story 5.4: Display Liability Categories

## User Story

As a **user**,
I want **my liabilities organized by type**,
So that **I can understand my debt composition**.

## Technical Context

**Liability Categories (from PRD Section 3.3.3):**
- Loans (student, personal, auto)
- Mortgages
- Credit card balances

**Account Types:**
- credit → Credit Cards
- (Future: loan, mortgage types)

## Acceptance Criteria

### AC1: Liabilities Section Layout
**Given** the net worth view renders
**When** the liabilities section displays
**Then**:
- Section header: "Liabilities"
- Grouped by category
- Below assets section

### AC2: Loans Category
**Given** loan accounts exist
**When** Loans category renders
**Then** shows:
- Category header: "Loans"
- List of loan accounts
- Balance for each
- Interest rate if available (e.g., "€10,000 @ 4.5%")

### AC3: Mortgages Category
**Given** mortgage accounts exist
**When** Mortgages category renders
**Then** shows:
- Category header: "Mortgages"
- Property-related debt accounts
- Balance and interest rate
- Remaining term (optional)

### AC4: Credit Cards Category
**Given** credit accounts with balances exist
**When** Credit Cards category renders
**Then** shows:
- Category header: "Credit Cards"
- List of credit accounts
- Current balance (amount owed)
- Credit limit (optional)

### AC5: Interest Rate Display
**Given** a liability has interest rate metadata
**When** displayed in list
**Then**:
- Shows: "€X,XXX @ X.X%"
- Interest rate after balance
- Helps user prioritize payoff

### AC6: Category Totals
**Given** a category has multiple accounts
**When** the category renders
**Then**:
- Shows category total at header level
- Sum of all accounts in category
- Percentage of total liabilities

### AC7: Empty Liabilities
**Given** no liability accounts exist
**When** liabilities section renders
**Then**:
- Shows "No liabilities" message
- Or: section hidden
- Celebratory message (optional): "Debt-free! 🎉"

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/LiabilitiesSection.test.ts` - Test three categories render: Loans, Mortgages, Credit Cards
- [ ] `src/lib/__tests__/LiabilitiesSection.test.ts` - Test accounts grouped correctly: credit → Credit Cards
- [ ] `src/lib/__tests__/LiabilitiesSection.test.ts` - Test empty liabilities shows "No liabilities" or hidden section
- [ ] `src/lib/__tests__/LiabilityCategory.test.ts` - Test category total in cents: sum of all liability balances
- [ ] `src/lib/__tests__/LiabilityCategory.test.ts` - Test percentage calculation: categoryTotal / totalLiabilities * 100
- [ ] `src/lib/__tests__/LiabilityCategory.test.ts` - Test percentage edge case: totalLiabilities=0 shows 0% not NaN
- [ ] `src/lib/__tests__/AccountRow.test.ts` - Test interest rate display format: "€10,000 @ 4.5%"
- [ ] `src/lib/__tests__/AccountRow.test.ts` - Test liability balance shown as positive (amount owed)
- [ ] `src/lib/__tests__/AccountRow.test.ts` - Test optional credit limit display for credit cards

### Integration Tests
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test get_liabilities_by_type returns grouped liabilities from SQLite
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test liability aggregation: 8000 + 5000 + 2000 = 15000 cents
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test interest rate metadata retrieval for loan accounts
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test credit accounts with zero balance excluded from liabilities

### E2E Tests
- [ ] `e2e/liability-categories.spec.ts` - Test /net-worth displays Liabilities section below assets
- [ ] `e2e/liability-categories.spec.ts` - Test category totals and percentages display correctly
- [ ] `e2e/liability-categories.spec.ts` - Test debt-free state shows celebratory message

## Implementation Notes

1. Similar structure to assets
2. Create LiabilitiesSection component
3. Handle interest rate metadata
4. Liabilities shown as positive numbers (amount owed)
5. Consider debt-to-income calculations (future)

## Files to Create/Modify

- `src/lib/components/net-worth/LiabilitiesSection.svelte`
- `src/lib/components/net-worth/LiabilityCategory.svelte`
- `src/lib/components/net-worth/AccountRow.svelte` - reuse/extend
