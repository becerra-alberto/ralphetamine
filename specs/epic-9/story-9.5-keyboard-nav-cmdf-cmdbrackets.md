---
id: "9.5"
epic: 9
title: "Keyboard Nav: Cmd+F All Views, Cmd+[/]"
status: pending
priority: medium
estimation: small
depends_on: []
---

# Story 9.5: Keyboard Nav: Cmd+F All Views, Cmd+[/]

## User Story

As a **power user navigating Stackz with keyboard shortcuts**,
I want **Cmd+F to work in all views and Cmd+[/] to navigate between views**,
So that **I can quickly search and navigate without reaching for the mouse**.

## Technical Context

**Bug refs:** Gen1 (Cmd+F blocked), Gen2 (Cmd+[/] navigation)

Cmd+F is being intercepted or blocked on some views (budget, transactions), preventing the search input from focusing. Additionally, Cmd+[ and Cmd+] should cycle through views (Home → Budget → Transactions → Net Worth) for quick navigation.

## Acceptance Criteria

### AC1: Cmd+F Works Everywhere
**Given** user presses Cmd+F on any view
**When** the shortcut fires
**Then**:
- The search/filter input for that view receives focus
- Default browser find dialog is prevented
- Works on Budget, Transactions, and Net Worth views

### AC2: Cmd+[ Previous View
**Given** user is on any view
**When** Cmd+[ is pressed
**Then**:
- Navigates to the previous view in order
- Wraps from the first view to the last

### AC3: Cmd+] Next View
**Given** user is on any view
**When** Cmd+] is pressed
**Then**:
- Navigates to the next view in order
- Wraps from the last view to the first

### AC4: View Order
**Given** the navigation cycle
**When** cycling through views
**Then**:
- Order is: Home → Budget → Transactions → Net Worth → Home
- Matches the sidebar/tab order

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` — Cmd+[ navigates to previous view
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` — Cmd+] navigates to next view
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` — navigation wraps around from last to first view
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` — Cmd+F does not get blocked on budget page
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` — Cmd+F does not get blocked on transactions page

## Implementation Notes

1. Add Cmd+[ and Cmd+] handlers to the global keyboard shortcut system
2. Define view order array: `['/', '/budget', '/transactions', '/net-worth']`
3. Use `goto()` from SvelteKit for navigation
4. Audit existing Cmd+F handlers — ensure `preventDefault` isn't blocking focus on budget/transactions views
5. Add or update `focusSearch()` dispatch on each view

## Files to Create/Modify

- `src/routes/+layout.svelte` — add Cmd+[/] handlers to global shortcuts
- `src/lib/actions/shortcuts.ts` — add view navigation logic (create if needed)
- `src/routes/budget/+page.svelte` — ensure Cmd+F focuses search
- `src/routes/transactions/+page.svelte` — ensure Cmd+F focuses search
