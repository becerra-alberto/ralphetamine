---
id: "9.4"
epic: 9
title: "Fix Balance Edit + Edit Z-Index"
status: pending
priority: critical
estimation: medium
depends_on: []
---

# Story 9.4: Fix Balance Edit + Edit Z-Index

## User Story

As a **user editing account balances in Net Worth view**,
I want **click-to-edit to work reliably and the edit form to appear above other rows**,
So that **I can update balances without UI glitches or clipping**.

## Technical Context

**Bug refs:** Item 1e (balance edit), Item 1f (z-index)

Two related issues: (1) BalanceEdit component's click-to-edit sometimes fails — clicking the balance doesn't open the input, or blur immediately cancels the edit. (2) When a row is in edit mode, the edit form can be clipped by adjacent rows due to `overflow: hidden` on parent containers or insufficient z-index.

## Acceptance Criteria

### AC1: Click-to-Edit Works
**Given** user clicks on a balance value
**When** the click event fires
**Then**:
- The balance text is replaced with an input field
- The input is focused and ready for typing
- The input is pre-filled with the current balance value

### AC2: Keyboard Save/Cancel
**Given** the balance input is visible
**When** user presses Enter
**Then** the new value is saved
**When** user presses Escape
**Then** the edit is cancelled and original value restored

### AC3: Blur Handling
**Given** the balance input is active
**When** focus moves to a related element (e.g., currency select)
**Then** the edit is NOT cancelled
**When** focus moves to an unrelated element
**Then** the edit is saved or cancelled gracefully

### AC4: Edit Z-Index
**Given** a row is in edit mode
**When** the edit form renders
**Then**:
- The editing row has a z-index above sibling rows
- The edit form is visible and not clipped by overflow

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/net-worth/BalanceEdit.test.ts` — clicking balance shows input field
- [ ] `src/lib/__tests__/components/net-worth/BalanceEdit.test.ts` — input accepts typing
- [ ] `src/lib/__tests__/components/net-worth/BalanceEdit.test.ts` — Enter key saves new value
- [ ] `src/lib/__tests__/components/net-worth/BalanceEdit.test.ts` — Escape cancels edit
- [ ] `src/lib/__tests__/components/net-worth/BalanceEdit.test.ts` — blur does not immediately cancel if focus moves to related element
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — editing row has z-index above sibling rows
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — edit form is visible (not clipped by overflow)

## Implementation Notes

1. Review BalanceEdit event handling — ensure `click` sets editing state before `blur` can fire
2. Use `relatedTarget` in blur handler to detect focus moving to sibling elements
3. Add `z-index: 10` (or similar) to AccountRow when in edit mode
4. Remove or adjust `overflow: hidden` on parent containers that clip the edit form
5. Consider using `requestAnimationFrame` or microtask to sequence click → focus

## Files to Create/Modify

- `src/lib/components/net-worth/BalanceEdit.svelte` — fix click-to-edit and blur handling
- `src/lib/components/net-worth/AccountRow.svelte` — add z-index when editing
- `src/lib/components/net-worth/AssetCategory.svelte` — verify overflow not clipping
- `src/lib/components/net-worth/LiabilityCategory.svelte` — verify overflow not clipping
