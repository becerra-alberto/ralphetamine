---
id: "9.2"
epic: 9
title: "Delete Account Confirmation Dialog"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 9.2: Delete Account Confirmation Dialog

## User Story

As a **user managing accounts in Net Worth view**,
I want **a confirmation dialog before deleting an account**,
So that **I don't accidentally lose account data with a misclick**.

## Technical Context

**Bug refs:** Item 1c (delete confirmation)

Currently clicking "Delete" in the kebab menu immediately dispatches the delete event. This should instead open a ConfirmDialog component showing the account name and requiring explicit confirmation.

## Acceptance Criteria

### AC1: Confirmation Dialog on Delete
**Given** user clicks "Delete" in the account kebab menu
**When** the action triggers
**Then**:
- A ConfirmDialog opens (delete is NOT dispatched immediately)
- The dialog shows the account name in the confirmation message
- Dialog has "Cancel" and "Delete" buttons

### AC2: Confirm Dispatches Delete
**Given** the confirmation dialog is open
**When** user clicks "Delete" (confirm)
**Then**:
- The delete event is dispatched
- The dialog closes

### AC3: Cancel Closes Dialog
**Given** the confirmation dialog is open
**When** user clicks "Cancel"
**Then**:
- The dialog closes
- No delete event is dispatched
- The account remains unchanged

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — clicking Delete in kebab menu opens ConfirmDialog (not immediate dispatch)
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — confirming dialog dispatches delete event
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — canceling dialog closes without dispatch
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — dialog shows account name in message

## Implementation Notes

1. Add local state `showDeleteConfirm = false` to AccountRow
2. Change kebab menu Delete action to set `showDeleteConfirm = true`
3. Render ConfirmDialog conditionally with account name in message
4. On confirm, dispatch the existing delete event; on cancel, close dialog

## Files to Create/Modify

- `src/lib/components/net-worth/AccountRow.svelte` — add confirmation dialog flow
