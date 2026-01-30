---
id: "9.1"
epic: 9
title: "Edit Form Labels + Country Names"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 9.1: Edit Form Labels + Country Names

## User Story

As a **user editing an account in Net Worth view**,
I want **form labels above each input field and country dropdowns showing full country names**,
So that **the edit form is clear and I can identify countries easily**.

## Technical Context

**Bug refs:** Item 1a (form labels), Item 1b (country names)

The AccountRow edit mode currently renders inputs without labels. The AddAccountModal has labels that should be mirrored. The country select dropdown shows only country codes (e.g., "NL") instead of full names (e.g., "Netherlands (NL)"). A `COUNTRY_NAMES` mapping is needed in `bankIdentifiers.ts`.

## Acceptance Criteria

### AC1: Edit Mode Labels
**Given** user clicks edit on an account row
**When** the edit form renders
**Then**:
- Each input field has a visible label element above it
- Labels match the AddAccountModal pattern (Name, Type, Institution, etc.)
- Labels are styled consistently with the rest of the form

### AC2: Country Name Display
**Given** the country select dropdown in edit mode or add modal
**When** the dropdown options render
**Then**:
- Each option shows full name + code (e.g., "Netherlands (NL)")
- `COUNTRY_NAMES` map covers every value in `COUNTRY_CODES`
- Unknown codes fall back to displaying the code itself

### AC3: AddAccountModal Consistency
**Given** the AddAccountModal country dropdown
**When** rendering country options
**Then**:
- Uses the same `COUNTRY_NAMES` map
- Shows full country names, not just codes

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — edit mode renders label elements above each input
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — country select shows full name + code (e.g., "Netherlands (NL)")
- [ ] `src/lib/__tests__/components/net-worth/AccountRow.test.ts` — labels match AddAccountModal pattern
- [ ] `src/lib/__tests__/utils/bankIdentifiers.test.ts` — COUNTRY_NAMES map has entry for every COUNTRY_CODES value
- [ ] `src/lib/__tests__/utils/bankIdentifiers.test.ts` — getCountryName returns full name for valid code
- [ ] `src/lib/__tests__/utils/bankIdentifiers.test.ts` — getCountryName returns code itself for unknown code
- [ ] `src/lib/__tests__/components/net-worth/AddAccountModal.test.ts` — country dropdown shows full names not just codes

## Implementation Notes

1. Add `COUNTRY_NAMES` map to `bankIdentifiers.ts` covering all `COUNTRY_CODES`
2. Add `getCountryName(code: string): string` utility function
3. Update AccountRow edit mode to render `<label>` elements above inputs
4. Update country `<select>` options to use `getCountryName()` in both AccountRow and AddAccountModal

## Files to Create/Modify

- `src/lib/utils/bankIdentifiers.ts` — add COUNTRY_NAMES map, getCountryName function
- `src/lib/components/net-worth/AccountRow.svelte` — add labels to edit mode, update country display
- `src/lib/components/net-worth/AddAccountModal.svelte` — update country dropdown to show full names
