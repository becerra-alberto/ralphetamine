---
id: "12.1"
epic: 12
title: "Import Font Consistency"
status: pending
priority: low
estimation: small
depends_on: []
---

# Story 12.1: Import Font Consistency

## User Story

As a **user using the import wizard**,
I want **all form elements to use the same font as the rest of the app**,
So that **the import wizard feels consistent and polished**.

## Technical Context

**Bug refs:** Item 3k (font consistency)

Select elements in the import wizard (ColumnMapping and AccountValueMapping steps) use the browser's default system font instead of the app's font family (Inter/SF Pro). All select elements should inherit the app font.

## Acceptance Criteria

### AC1: Column Mapping Fonts
**Given** the column mapping step
**When** select dropdowns render
**Then**:
- All select elements use `font-family: inherit`
- Dropdown text matches the app font

### AC2: Account Mapping Fonts
**Given** the account value mapping step
**When** select dropdowns render
**Then**:
- All select elements use `font-family: inherit`
- Consistent with column mapping fonts

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/import/ColumnMapping.test.ts` — all select elements in column mapping use font-family:inherit
- [ ] `src/lib/__tests__/import/ColumnMapping.test.ts` — dropdown text matches app font
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — all select elements in account mapping use font-family:inherit

## Implementation Notes

1. Add `font-family: inherit` to all `<select>` elements in ColumnRow.svelte
2. Add `font-family: inherit` to all `<select>` elements in AccountValueMapping.svelte
3. Consider adding a global CSS rule for select elements within the import wizard

## Files to Create/Modify

- `src/lib/components/import/ColumnRow.svelte` — add font-family:inherit to selects
- `src/lib/components/import/AccountValueMapping.svelte` — add font-family:inherit to selects
