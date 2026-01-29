---
id: "5.2"
epic: 5
title: "Add Month-over-Month Change Indicator"
status: pending
priority: high
estimation: medium
depends_on: ["5.1"]
frs: ["FR24"]
---

# Story 5.2: Add Month-over-Month Change Indicator

## User Story

As a **user**,
I want **to see how my net worth changed from last month**,
So that **I can track my financial progress**.

## Technical Context

**MoM Change (from PRD Section 3.3.1):**
- Shows change from previous month
- Absolute and percentage
- Color coded (green/red)

**Data Requirements:**
- Historical net worth snapshots
- Stored monthly for comparison

## Acceptance Criteria

### AC1: Change Display
**Given** the net worth summary displays
**When** historical data exists
**Then** shows month-over-month change:
- Below net worth amount
- Format: "+€X,XXX (+X.X%)" or "-€X,XXX (-X.X%)"

### AC2: Positive Change Styling
**Given** net worth increased from last month
**When** change indicator renders
**Then**:
- Shows "+" prefix
- Green color text
- Upward arrow icon (optional)

### AC3: Negative Change Styling
**Given** net worth decreased from last month
**When** change indicator renders
**Then**:
- Shows "-" prefix
- Red color text
- Downward arrow icon (optional)

### AC4: No Change
**Given** net worth is same as last month
**When** change indicator renders
**Then**:
- Shows "€0 (0%)"
- Neutral color
- No arrow

### AC5: First Month Handling
**Given** this is the first month of data
**When** no previous month exists
**Then**:
- Shows "First month - no comparison"
- Or: hides change indicator
- No error thrown

### AC6: Tooltip Detail
**Given** the change indicator is displayed
**When** user hovers over it
**Then** tooltip shows:
- "Compared to [Previous Month]"
- Previous value: €XX,XXX
- Current value: €XX,XXX
- Change: €X,XXX (X.X%)

### AC7: Historical Snapshot Storage
**Given** the app records net worth
**When** a month ends (or manually triggered)
**Then**:
- Net worth snapshot saved to history table
- Includes: month, total_assets, total_liabilities, net_worth

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test positive change: +€1,500 (+5.2%) displays green with upward arrow
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test negative change: -€800 (-3.1%) displays red with downward arrow
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test zero change: €0 (0%) displays neutral color, no arrow
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test percentage calculation: (current - previous) / previous * 100
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test percentage with previous=0 handles division by zero gracefully
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test first month: displays "First month - no comparison" message
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test cents arithmetic: (15000 - 10000) = 5000 cents change
- [ ] `src/lib/__tests__/MoMChange.test.ts` - Test tooltip content includes previous/current values and change

### Integration Tests
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test save_net_worth_snapshot stores month, total_assets, total_liabilities, net_worth
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test get_previous_month_snapshot returns correct YYYY-MM record
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test snapshot query with no previous month returns None
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test MoM calculation with large positive change (edge case: 1000% increase)
- [ ] `src-tauri/src/commands/net_worth_test.rs` - Test MoM calculation with large negative change (edge case: -90% decrease)

### E2E Tests
- [ ] `e2e/mom-change.spec.ts` - Test MoM indicator displays below net worth card
- [ ] `e2e/mom-change.spec.ts` - Test hovering over MoM shows tooltip with comparison details
- [ ] `e2e/mom-change.spec.ts` - Test first visit shows appropriate first-month message

## Implementation Notes

1. Create net_worth_history table
2. Store monthly snapshots
3. Query previous month for comparison
4. Calculate change and percentage
5. Consider auto-snapshot on month change

## Files to Create/Modify

- `src-tauri/src/db/migrations/003_net_worth_history.sql`
- `src/lib/components/net-worth/MoMChange.svelte`
- `src/lib/components/net-worth/NetWorthSummary.svelte` - add MoM
- `src-tauri/src/commands/net_worth.rs` - history commands
