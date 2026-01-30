---
id: "11.6"
epic: 11
title: "Batch Transaction Entry '+' Button"
status: pending
priority: low
estimation: medium
depends_on: []
---

# Story 11.6: Batch Transaction Entry "+" Button

## User Story

As a **user entering multiple transactions at once**,
I want **a "+" button that opens a batch entry area where saving one row automatically adds another**,
So that **I can quickly enter multiple transactions in sequence**.

## Technical Context

**Bug refs:** Item 3g (batch entry)

The QuickAddRow provides single transaction entry. A batch mode should allow entering multiple transactions sequentially. After saving one row, the form should reset for the next entry. A "+" button triggers this mode.

## Acceptance Criteria

### AC1: Batch Button Visible
**Given** the transactions page
**When** rendered
**Then**:
- A "+" batch add button is visible near the transaction list

### AC2: Batch Mode
**Given** user clicks the "+" button
**When** batch mode activates
**Then**:
- Opens a multi-row entry area
- Shows at least one empty entry row

### AC3: Auto-Add Next Row
**Given** user saves one batch entry row
**When** the save completes
**Then**:
- Saved row is added to the transaction list
- Form resets with a new empty row for next entry
- Focus moves to the new row's first field

### AC4: Cancel Batch Mode
**Given** batch mode is active
**When** user clicks cancel or presses Escape
**Then**:
- Batch entry area closes
- Returns to normal view

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/routes/transactions.test.ts` — "+" batch add button is visible
- [ ] `src/lib/__tests__/routes/transactions.test.ts` — clicking opens multi-row entry area
- [ ] `src/lib/__tests__/routes/transactions.test.ts` — saving one row auto-adds new empty row
- [ ] `src/lib/__tests__/routes/transactions.test.ts` — can cancel batch entry mode

### Component Tests
- [ ] `src/lib/__tests__/components/transactions/QuickAddRow.test.ts` — after successful save, form resets for next entry

## Implementation Notes

1. Add "+" button to transaction page toolbar
2. Toggle `batchMode` state on click
3. In batch mode, render QuickAddRow that resets on successful save
4. After save, keep batch mode open and create new empty row
5. Escape or Cancel button exits batch mode

## Files to Create/Modify

- `src/routes/transactions/+page.svelte` — add "+" button and batch mode state
- `src/lib/components/transactions/QuickAddRow.svelte` — add auto-reset after save in batch mode
