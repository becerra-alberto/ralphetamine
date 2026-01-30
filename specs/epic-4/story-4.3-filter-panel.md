---
id: "4.3"
epic: 4
title: "Create Filter Panel"
status: done
priority: high
estimation: large
depends_on: ["4.1"]
frs: ["FR15"]
---

# Story 4.3: Create Filter Panel

## User Story

As a **user**,
I want **to filter transactions by multiple criteria**,
So that **I can analyze specific subsets of my spending**.

## Technical Context

**Filter Options (from PRD Section 3.2.1):**
- Date range
- Accounts (multi-select)
- Categories (multi-select with hierarchy)
- Tags (multi-select)
- Amount range
- Type (income/expense)

## Acceptance Criteria

### AC1: Filter Panel Toggle
**Given** the transaction view is displayed
**When** user clicks filter icon OR presses /
**Then**:
- Filter panel slides open (sidebar or dropdown)
- Filter options visible
- Focus moves to first filter

### AC2: Date Range Filter
**Given** the filter panel is open
**When** date range is configured
**Then**:
- Start date picker
- End date picker
- Presets: "Today", "This week", "This month", "Last 30 days", "This year"
- Custom range supported

### AC3: Account Filter
**Given** the filter panel is open
**When** account filter renders
**Then**:
- Checkbox list of all accounts
- "Select all" / "Clear all" options
- Account names with currency indicator
- Multi-select supported

### AC4: Category Filter
**Given** the filter panel is open
**When** category filter renders
**Then**:
- Hierarchical checkbox tree
- Section headers expandable
- Child categories indented
- Multi-select supported

### AC5: Tags Filter
**Given** the filter panel is open
**When** tags filter renders
**Then**:
- Checkbox list of all used tags
- Multi-select supported
- Shows tag count per tag

### AC6: Amount Range Filter
**Given** the filter panel is open
**When** amount filter renders
**Then**:
- Min amount input
- Max amount input
- Currency formatted
- Validates min <= max

### AC7: Type Filter
**Given** the filter panel is open
**When** type filter renders
**Then**:
- Radio buttons: All, Income only, Expense only
- Default: All

### AC8: Filter Application
**Given** filters are selected
**When** "Apply" is clicked OR filters auto-apply
**Then**:
- Transaction list updates
- All filters combined with AND logic
- Count shows filtered results

### AC9: Active Filter Badge
**Given** filters are active
**When** filter icon displays
**Then**:
- Badge shows count of active filters
- Visual indication filters are applied

### AC10: Clear Filters
**Given** filters are active
**When** user clicks "Clear all filters"
**Then**:
- All filters reset to defaults
- Full transaction list shown

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/FilterPanel.test.ts` - Test panel renders all filter sections (Date, Account, Category, Tags, Amount, Type)
- [ ] `src/lib/__tests__/FilterPanel.test.ts` - Test focus moves to first filter when panel opens
- [ ] `src/lib/__tests__/FilterPanel.test.ts` - Test badge displays correct count of active filters (0 when none)
- [ ] `src/lib/__tests__/DateRangeFilter.test.ts` - Test preset buttons (Today, This week, This month, Last 30 days, This year)
- [ ] `src/lib/__tests__/DateRangeFilter.test.ts` - Test custom date range with start/end pickers
- [ ] `src/lib/__tests__/DateRangeFilter.test.ts` - Test validation prevents end date before start date
- [ ] `src/lib/__tests__/AccountFilter.test.ts` - Test checkbox list renders all accounts with currency indicator
- [ ] `src/lib/__tests__/AccountFilter.test.ts` - Test "Select all" and "Clear all" toggle buttons
- [ ] `src/lib/__tests__/AccountFilter.test.ts` - Test multi-select stores array of selected account IDs
- [ ] `src/lib/__tests__/CategoryFilter.test.ts` - Test hierarchical tree renders section headers (Income, Housing, Essential, Lifestyle, Savings)
- [ ] `src/lib/__tests__/CategoryFilter.test.ts` - Test child categories indented under parent sections
- [ ] `src/lib/__tests__/CategoryFilter.test.ts` - Test section headers expand/collapse children
- [ ] `src/lib/__tests__/CategoryFilter.test.ts` - Test parent selection selects/deselects all children
- [ ] `src/lib/__tests__/TagsFilter.test.ts` - Test checkbox list shows all used tags with count per tag
- [ ] `src/lib/__tests__/AmountFilter.test.ts` - Test min/max inputs accept currency-formatted values
- [ ] `src/lib/__tests__/AmountFilter.test.ts` - Test dollarsToCents conversion for filter values
- [ ] `src/lib/__tests__/AmountFilter.test.ts` - Test validation error when min > max
- [ ] `src/lib/__tests__/transactionFilters.store.test.ts` - Test combining multiple filters with AND logic
- [ ] `src/lib/__tests__/transactionFilters.store.test.ts` - Test clear all resets every filter to default state

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter_transactions with date range bounds
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter_transactions with multiple account IDs
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter_transactions with category hierarchy (parent includes children)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter_transactions with amount_cents range (min/max in cents)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter_transactions with type filter (income: positive, expense: negative)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test filter_transactions combining all filter types simultaneously

### E2E Tests
- [ ] `e2e/transaction-filters.spec.ts` - Test "/" keyboard shortcut opens filter panel
- [ ] `e2e/transaction-filters.spec.ts` - Test filter icon click toggles panel open/closed
- [ ] `e2e/transaction-filters.spec.ts` - Test applying date range filter updates transaction list
- [ ] `e2e/transaction-filters.spec.ts` - Test combining account + category + type filters shows correct results
- [ ] `e2e/transaction-filters.spec.ts` - Test clear all filters restores complete transaction list
- [ ] `e2e/transaction-filters.spec.ts` - Test filter state persists in URL params

## Implementation Notes

1. Create FilterPanel component
2. Each filter type as sub-component
3. Store filter state in URL params
4. Server-side filtering for performance
5. Debounce auto-apply if used

## Files to Create/Modify

- `src/lib/components/transactions/FilterPanel.svelte`
- `src/lib/components/transactions/DateRangeFilter.svelte`
- `src/lib/components/transactions/AccountFilter.svelte`
- `src/lib/components/transactions/CategoryFilter.svelte`
- `src/lib/components/transactions/TagsFilter.svelte`
- `src/lib/components/transactions/AmountFilter.svelte`
- `src/lib/stores/transactionFilters.ts`
