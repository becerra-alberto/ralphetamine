---
id: "11.4"
epic: 11
title: "Extended Edit Fields (tags, bank, currency)"
status: pending
priority: medium
estimation: medium
depends_on: []
---

# Story 11.4: Extended Edit Fields (tags, bank, currency)

## User Story

As a **user editing a transaction**,
I want **the edit form to include tags, bank/institution info, and currency display**,
So that **I can manage all transaction metadata in one place**.

## Technical Context

**Bug refs:** Item 3e (extended edit fields)

The transaction edit form currently lacks tags, bank info, and currency display. Tags should be editable via a TagSelect component. Bank/institution should be shown as read-only info (derived from account). Currency badge should appear next to the amount field.

## Acceptance Criteria

### AC1: Tags Field
**Given** the transaction edit form
**When** rendered
**Then**:
- A TagSelect component is rendered for tags
- Existing tags pre-populated
- Tags included in the update payload on save

### AC2: Bank Info
**Given** the transaction edit form
**When** rendered
**Then**:
- Bank/institution shown as read-only info
- Derived from the transaction's account

### AC3: Currency Badge
**Given** the amount field in edit form
**When** rendered
**Then**:
- Currency badge (e.g., "EUR", "USD") displayed next to the amount input
- Derived from the transaction's account currency

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — edit form renders tags field (TagSelect component)
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — edit form shows bank/institution as read-only info
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — edit form shows currency badge next to amount
- [ ] `src/lib/__tests__/components/transactions/TransactionRow.test.ts` — saving edit includes tags in update payload

## Implementation Notes

1. Add TagSelect component to the edit form
2. Display institution from account lookup as read-only text
3. Add currency badge (styled span) next to amount input
4. Include tags in the `updateTransaction` payload

## Files to Create/Modify

- `src/lib/components/transactions/TransactionRow.svelte` — add tags, bank, currency fields
