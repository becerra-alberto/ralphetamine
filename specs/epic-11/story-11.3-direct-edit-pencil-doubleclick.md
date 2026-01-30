---
id: "11.3"
epic: 11
title: "Direct Edit on Pencil Click + Double-Click"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 11.3: Direct Edit on Pencil Click + Double-Click

## User Story

As a **user editing transactions**,
I want **clicking the edit pencil or double-clicking a cell to immediately enter edit mode**,
So that **I can modify transactions with fewer clicks**.

## Technical Context

**Bug refs:** Items 3c (pencil click), 3d (double-click)

Currently clicking the edit pencil expands the row but requires a second click to enter edit mode. The pencil click should expand AND enter edit mode in one action. Additionally, double-clicking any table cell should also enter edit mode.

## Acceptance Criteria

### AC1: Pencil Click = Expand + Edit
**Given** a transaction row
**When** user clicks the edit pencil icon
**Then**:
- Row expands AND enters edit mode immediately
- No intermediate "view expanded" state
- Edit form fields are populated with current values

### AC2: Double-Click Cell
**Given** a transaction row cell
**When** user double-clicks
**Then**:
- Row enters edit mode
- Same behavior as pencil click

### AC3: Escape Closes
**Given** a row in edit mode
**When** user presses Escape
**Then**:
- Edit mode exits
- Row collapses back to normal state

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — clicking edit pencil expands row AND enters edit mode immediately (no intermediate button)
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — double-clicking a table cell enters edit mode
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — edit form fields are populated with current values on expand
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — Escape from edit mode collapses the row

## Implementation Notes

1. Modify pencil click handler to set both `expanded = true` and `editing = true` simultaneously
2. Add `dblclick` handler to row cells that triggers the same edit action
3. Ensure Escape key handler resets both `expanded` and `editing` states
4. Pre-populate form fields from current transaction data on edit

## Files to Create/Modify

- `src/lib/components/transactions/TransactionRow.svelte` — update click handlers
