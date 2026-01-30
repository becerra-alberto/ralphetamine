---
id: "12.3"
epic: 12
title: "Import Error Diagnostics + Recovery"
status: pending
priority: critical
estimation: medium
depends_on: ["11.8"]
---

# Story 12.3: Import Error Diagnostics + Recovery

## User Story

As a **user whose CSV import failed**,
I want **detailed error diagnostics, copy-to-clipboard, and the ability to navigate back to fix and retry**,
So that **I can understand what went wrong and recover without starting over**.

## Technical Context

**Bug refs:** Item 3o (deep fix from 11.8 foundation)

Building on 11.8's error improvements, this story adds: expandable error details section, "Copy Error" button, back navigation on error, pre-import per-row validation in preview step, and detailed API error reporting including field names and row indices.

## Acceptance Criteria

### AC1: Error Details Section
**Given** an import error occurs
**When** the error state renders
**Then**:
- Shows an "Error Details" expandable section
- Contains the full backend error message
- Includes error trace/stack if available

### AC2: Copy Error Button
**Given** the error details are visible
**When** user clicks "Copy Error"
**Then**:
- Error text copied to clipboard
- Button provides visual confirmation (e.g., "Copied!")

### AC3: Back Navigation on Error
**Given** an import error
**When** the error screen renders
**Then**:
- "Back" button remains accessible
- User can navigate to step 2 or 3 to fix settings and retry
- Previous settings preserved

### AC4: Pre-Import Validation
**Given** the preview step before import
**When** validation runs
**Then**:
- Catches invalid date format
- Catches empty payee
- Catches missing accountId
- Per-row validation errors shown in preview step

### AC5: API Error Detail
**Given** the import API fails
**When** the error response is processed
**Then**:
- `importTransactions` returns detailed error including field name and row index
- Error messages are human-readable

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/import/ImportProgress.test.ts` — error state shows "Error Details" expandable section
- [ ] `src/lib/__tests__/import/ImportProgress.test.ts` — "Copy Error" button copies error text
- [ ] `src/lib/__tests__/import/ImportProgress.test.ts` — error trace includes backend message

### Component Tests
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — on import error, Back button remains accessible
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — user can navigate to step 2/3 to fix and retry
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — pre-import validation catches invalid date format
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — validation catches empty payee
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — validation catches missing accountId
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — per-row validation errors shown in preview step

### API Tests
- [ ] `src/lib/__tests__/api/transactions.test.ts` — importTransactions returns detailed error on failure
- [ ] `src/lib/__tests__/api/transactions.test.ts` — error includes field name and row index

## Implementation Notes

1. Add expandable "Error Details" section to ImportProgress error state
2. Implement clipboard copy with `navigator.clipboard.writeText()` and visual feedback
3. Ensure ImportWizard preserves step state and allows back navigation on error
4. Add pre-import validation in preview step: validate date, payee, accountId per row
5. Enhance `importTransactions` error handling to include row/field context
6. Show per-row validation errors inline in the preview table

## Files to Create/Modify

- `src/lib/components/import/ImportProgress.svelte` — error details section, copy button
- `src/lib/components/import/ImportWizard.svelte` — back navigation, pre-import validation
- `src/lib/api/transactions.ts` — detailed error returns
