# Epic 9: Net Worth View Polish

## Overview

Polish the Net Worth view with improved UX for editing accounts, deleting accounts, layout consistency, balance editing reliability, and keyboard navigation across all views.

## Goals

1. Add form labels and full country names to edit/add account forms
2. Add confirmation dialog before deleting accounts
3. Fix account row column alignment (info, balance, menu)
4. Fix balance edit click-to-edit and z-index layering issues
5. Add Cmd+[ / Cmd+] view navigation and ensure Cmd+F works in all views

## Stories

| ID | Title | Priority | Est |
|----|-------|----------|-----|
| 9.1 | Edit Form Labels + Country Names | high | S |
| 9.2 | Delete Account Confirmation Dialog | high | S |
| 9.3 | Account Row Column Layout | medium | S |
| 9.4 | Fix Balance Edit + Edit Z-Index | critical | M |
| 9.5 | Keyboard Nav: Cmd+F All Views, Cmd+[/] | medium | S |

## Key Files

- `AccountRow.svelte`, `BalanceEdit.svelte`, `AddAccountModal.svelte`
- `bankIdentifiers.ts`, `+layout.svelte`, `shortcuts.ts`
