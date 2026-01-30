---
id: "9.3"
epic: 9
title: "Account Row Column Layout"
status: pending
priority: medium
estimation: small
depends_on: []
---

# Story 9.3: Account Row Column Layout

## User Story

As a **user viewing accounts in Net Worth view**,
I want **account rows to display in a consistent three-column layout**,
So that **account info, balances, and actions are aligned across all rows**.

## Technical Context

**Bug refs:** Item 1d (column alignment)

Account rows currently have inconsistent widths. The layout should be a three-column flex layout: account info (flex:1), balance (right-aligned), and kebab menu (fixed width).

## Acceptance Criteria

### AC1: Three-Column Layout
**Given** an account row renders
**When** displayed in the category section
**Then**:
- Row uses flex layout with three columns
- Account info section uses `flex: 1` to fill available width
- Balance column aligns to the right end
- Kebab menu has fixed width

### AC2: Category Alignment
**Given** multiple account rows within a category
**When** displayed together
**Then**:
- All rows share consistent column alignment
- Balance values line up vertically
- Menu buttons line up vertically

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — account info section uses flex:1 to fill available width
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — balance column aligns to right end
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — row renders as three-column layout (info, balance, menu)
- [ ] `src/lib/__tests__/components/net-worth/AssetCategory.test.ts` — account rows within category display in column alignment

## Implementation Notes

1. Update AccountRow to use flex layout with three distinct sections
2. Set `flex: 1` on the account info container
3. Set `text-align: right` or `justify-content: flex-end` on balance column
4. Set fixed width on kebab menu column

## Files to Create/Modify

- `src/lib/components/net-worth/AccountRow.svelte` — restructure layout to three-column flex
- `src/lib/components/net-worth/AssetCategory.svelte` — verify container allows aligned rows
