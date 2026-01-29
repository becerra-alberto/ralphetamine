---
id: "2.4"
epic: 2
title: "Add Date Range Selector"
status: pending
priority: high
estimation: medium
depends_on: ["2.2"]
frs: ["FR4"]
---

# Story 2.4: Add Date Range Selector

## User Story

As a **user**,
I want **to control which months are visible in my budget view**,
So that **I can focus on specific time periods**.

## Technical Context

**Default Range:** Rolling 12 months (current month + 11 previous)
**Presets:** Common date range selections
**Custom:** User-defined start/end months

## Acceptance Criteria

### AC1: Date Range Selector Renders
**Given** the budget view is displayed
**When** the header area renders
**Then** a date range selector is shown with:
- Current range displayed (e.g., "Feb 2024 - Jan 2025")
- Dropdown trigger button
- Clear visual indication of selected range

### AC2: Preset Options Available
**Given** the date range dropdown is opened
**When** preset options are displayed
**Then** the following presets are available:
- "Rolling 12 Months" (default)
- "This Year" (Jan-Dec of current year)
- "Last Year" (Jan-Dec of previous year)
- "This Quarter" (current 3 months)
- "Custom Range..."

### AC3: Rolling 12M Preset
**Given** the user selects "Rolling 12 Months"
**When** the selection is applied
**Then**:
- Grid shows current month + 11 previous months
- Most recent month is rightmost column
- Preset is marked as selected

### AC4: This Year Preset
**Given** the user selects "This Year"
**When** the selection is applied
**Then**:
- Grid shows Jan-Dec of current year
- Future months show budgets only (no actuals yet)
- Preset is marked as selected

### AC5: Last Year Preset
**Given** the user selects "Last Year"
**When** the selection is applied
**Then**:
- Grid shows Jan-Dec of previous year
- All months show historical data

### AC6: Custom Range Selection
**Given** the user selects "Custom Range..."
**When** the custom range UI appears
**Then**:
- Month/year picker for start date
- Month/year picker for end date
- "Apply" button to confirm
- Maximum range: 36 months

### AC7: Grid Updates on Selection
**Given** any date range is selected
**When** the selection is confirmed
**Then**:
- Grid immediately updates to show new range
- Year headers recalculate
- Budget/actual data loads for new months
- URL updates with range params (for bookmarking)

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.test.ts` - Test selector renders with current range text (e.g., "Feb 2024 - Jan 2025")
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.test.ts` - Test dropdown trigger button is visible
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.test.ts` - Test all 5 presets available: Rolling 12M, This Year, Last Year, This Quarter, Custom
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.test.ts` - Test selected preset is visually marked
- [ ] `src/lib/__tests__/components/shared/MonthPicker.test.ts` - Test month/year picker renders correctly
- [ ] `src/lib/__tests__/components/shared/MonthPicker.test.ts` - Test month selection updates value
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test "Rolling 12M" calculates current month + 11 previous
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test "This Year" calculates Jan-Dec of current year
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test "Last Year" calculates Jan-Dec of previous year
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test "This Quarter" calculates correct 3-month range
- [ ] `src/lib/__tests__/utils/dates.test.ts` - Test maximum 36 month range validation

### Integration Tests
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.integration.test.ts` - Test custom range picker start/end date selection
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.integration.test.ts` - Test "Apply" button confirms custom range
- [ ] `src/lib/__tests__/components/budget/DateRangeSelector.integration.test.ts` - Test range > 36 months shows validation error
- [ ] `src/lib/__tests__/stores/budget.test.ts` - Test budget store updates when date range changes

### E2E Tests
- [ ] `e2e/date-range-selector.spec.ts` - Test grid updates immediately when preset selected
- [ ] `e2e/date-range-selector.spec.ts` - Test URL updates with range params (for bookmarking)
- [ ] `e2e/date-range-selector.spec.ts` - Test year headers recalculate on range change
- [ ] `e2e/date-range-selector.spec.ts` - Test budget/actual data loads for new months
- [ ] `e2e/date-range-selector.spec.ts` - Test future months show budgets only (no actuals)

## Implementation Notes

1. Create DateRangeSelector component
2. Use month picker (not day picker)
3. Store selected range in URL search params
4. Update budget store when range changes
5. Debounce data loading on rapid changes

## Files to Create/Modify

- `src/lib/components/budget/DateRangeSelector.svelte`
- `src/lib/components/shared/MonthPicker.svelte`
- `src/lib/stores/budget.ts` - add date range state
- `src/routes/budget/+page.svelte` - handle URL params
