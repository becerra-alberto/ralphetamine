---
id: "11.8"
epic: 11
title: "Import: New Targets + Samples + Country + Errors"
status: pending
priority: high
estimation: medium
depends_on: []
---

# Story 11.8: Import: New Targets + Samples + Country + Errors

## User Story

As a **user importing CSV transactions**,
I want **support for currency/accountNumber mapping, sample row context, country selection, and detailed error messages**,
So that **I can import from diverse bank formats and diagnose problems quickly**.

## Technical Context

**Bug refs:** Items 3i (new targets), 3j (samples), 3l (country), 3m (context), 3n (errors), 3o (error diagnostics)

Multiple import improvements: (1) Add "currency" and "accountNumber" to MappableField type and FIELD_LABELS. (2) HEADER_PATTERNS should match "currency", "iban", "clabe", "account number" headers. (3) AccountValueMapping should show sample rows with IBAN/bank number context. (4) Country field should be a select dropdown with full names. (5) Import errors should display backend error messages with row numbers.

## Acceptance Criteria

### AC1: New Mappable Fields
**Given** the column mapping step
**When** field options render
**Then**:
- MappableField type includes "currency" and "accountNumber"
- FIELD_LABELS has entries for currency and accountNumber
- HEADER_PATTERNS matches "currency", "iban", "clabe", "account number"

### AC2: Sample Rows in Account Mapping
**Given** the AccountValueMapping step
**When** rendered
**Then**:
- Shows a sample row for each unique account value
- Sample row includes IBAN/bank number for context

### AC3: Country Dropdown
**Given** the country field in AccountValueMapping
**When** rendered
**Then**:
- Country is a select dropdown (not free text)
- Options show full name + code (e.g., "Netherlands (NL)")

### AC4: Import Error Display
**Given** an import fails
**When** the error renders
**Then**:
- Displays the backend error message
- Includes row number if available

### AC5: Pre-Import Validation
**Given** the import wizard before import
**When** validation runs
**Then**:
- Catches missing required fields
- Shows detailed error reason

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/utils/columnDetection.test.ts` — MappableField type includes "currency" and "accountNumber"
- [ ] `src/lib/__tests__/utils/columnDetection.test.ts` — FIELD_LABELS has entries for currency and accountNumber
- [ ] `src/lib/__tests__/utils/columnDetection.test.ts` — HEADER_PATTERNS matches "currency", "iban", "clabe", "account number" headers

### Component Tests
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — renders sample row for each unique account value
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — sample row shows IBAN/bank number for context
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — country field is a select dropdown (not free text)
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — country options show full name + code
- [ ] `src/lib/__tests__/import/ImportPreview.test.ts` — import error displays backend error message
- [ ] `src/lib/__tests__/import/ImportPreview.test.ts` — error includes row number if available
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — failed import shows detailed error reason
- [ ] `src/lib/__tests__/import/ImportWizard.test.ts` — pre-import validation catches missing required fields

## Implementation Notes

1. Add "currency" and "accountNumber" to MappableField union type
2. Add FIELD_LABELS entries and HEADER_PATTERNS for new fields
3. Update AccountValueMapping to show sample CSV rows per unique value
4. Change country input to `<select>` with COUNTRY_NAMES data
5. Enhance error display in ImportPreview and ImportWizard with row context

## Files to Create/Modify

- `src/lib/utils/columnDetection.ts` — add new fields, labels, patterns
- `src/lib/components/import/AccountValueMapping.svelte` — sample rows, country dropdown
- `src/lib/components/import/ImportPreview.svelte` — error display improvements
- `src/lib/components/import/ImportWizard.svelte` — validation and error handling
