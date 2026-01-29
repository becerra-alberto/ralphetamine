---
id: "5.3"
epic: 5
title: "Display Asset Categories"
status: pending
priority: high
estimation: medium
depends_on: ["5.1"]
frs: ["FR25"]
---

# Story 5.3: Display Asset Categories

## User Story

As a **user**,
I want **my assets organized by category**,
So that **I can see the composition of my wealth**.

## Technical Context

**Asset Categories (from PRD Section 3.3.2):**
- Cash & Bank Accounts (checking, savings)
- Investments (brokerage portfolios)
- Retirement (pension funds)

**Account Types Mapping:**
- checking, savings, cash → Cash & Bank
- investment → Investments
- (Future: retirement type)

## Acceptance Criteria

### AC1: Assets Section Layout
**Given** the net worth view renders
**When** the assets section displays
**Then**:
- Section header: "Assets"
- Grouped by category
- Below summary section

### AC2: Cash & Bank Category
**Given** checking/savings/cash accounts exist
**When** Cash & Bank category renders
**Then** shows:
- Category header: "Cash & Bank Accounts"
- List of accounts (name, balance)
- Category total
- Currency shown if non-EUR

### AC3: Investments Category
**Given** investment accounts exist
**When** Investments category renders
**Then** shows:
- Category header: "Investments"
- List of investment accounts
- Balance for each
- YTD performance indicator (if available)

### AC4: Retirement Category
**Given** retirement accounts exist
**When** Retirement category renders
**Then** shows:
- Category header: "Retirement"
- List of pension/retirement accounts
- "Updated: [date]" indicator
- Balance for each

### AC5: Category Totals
**Given** a category has multiple accounts
**When** the category renders
**Then**:
- Shows category total at header level
- Sum of all accounts in category
- Percentage of total assets

### AC6: Account Details
**Given** an account is listed
**When** displayed in category
**Then** shows:
- Account name
- Institution (optional)
- Balance: €XX,XXX.XX
- Currency indicator if non-EUR

### AC7: Empty Category
**Given** a category has no accounts
**When** rendering
**Then**:
- Category is hidden
- Or: shows "No accounts" with add prompt

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/AssetsSection.test.ts` - Test three categories render: Cash & Bank, Investments, Retirement
- [ ] `src/lib/__tests__/AssetsSection.test.ts` - Test accounts grouped correctly: checking/savings/cash → Cash & Bank
- [ ] `src/lib/__tests__/AssetsSection.test.ts` - Test accounts grouped correctly: investment → Investments
- [ ] `src/lib/__tests__/AssetCategory.test.ts` - Test category total in cents: sum of all account balances
- [ ] `src/lib/__tests__/AssetCategory.test.ts` - Test percentage calculation: categoryTotal / totalAssets * 100
- [ ] `src/lib/__tests__/AssetCategory.test.ts` - Test percentage edge case: totalAssets=0 shows 0% not NaN
- [ ] `src/lib/__tests__/AssetCategory.test.ts` - Test empty category hidden or shows "No accounts" prompt
- [ ] `src/lib/__tests__/AccountRow.test.ts` - Test individual account displays name, institution, balance
- [ ] `src/lib/__tests__/AccountRow.test.ts` - Test non-EUR accounts show currency indicator (e.g., "$10,000 USD")
- [ ] `src/lib/utils/__tests__/accountGroups.test.ts` - Test groupByType utility correctly categorizes account types

### Integration Tests
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test get_accounts_by_type returns grouped accounts from SQLite
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test category aggregation: 5000 + 3000 + 2000 = 10000 cents
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test only is_active=true accounts included in grouping
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test multi-currency accounts returned with currency field

### E2E Tests
- [ ] `e2e/asset-categories.spec.ts` - Test /net-worth displays Assets section below summary
- [ ] `e2e/asset-categories.spec.ts` - Test clicking category header expands/collapses account list
- [ ] `e2e/asset-categories.spec.ts` - Test category totals update when account balance changes

## Implementation Notes

1. Group accounts by type
2. Create AssetCategory component
3. Create AccountRow component
4. Calculate category totals
5. Add percentage calculation

## Files to Create/Modify

- `src/lib/components/net-worth/AssetsSection.svelte`
- `src/lib/components/net-worth/AssetCategory.svelte`
- `src/lib/components/net-worth/AccountRow.svelte`
- `src/lib/utils/accountGroups.ts` - grouping utility
