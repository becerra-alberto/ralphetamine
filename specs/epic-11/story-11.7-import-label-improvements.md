---
id: "11.7"
epic: 11
title: "Import Label Improvements"
status: pending
priority: medium
estimation: small
depends_on: []
---

# Story 11.7: Import Label Improvements

## User Story

As a **user mapping CSV columns during import**,
I want **field labels to be clear and descriptive**,
So that **I can correctly identify what each mapping option refers to**.

## Technical Context

**Bug refs:** Item 3h (import labels)

The FIELD_LABELS in columnDetection.ts use abbreviated names (e.g., "Account" instead of "Account Name"). Auto-detection patterns should also match common CSV header variations like "account_friendly_name" and "account name".

## Acceptance Criteria

### AC1: Descriptive Labels
**Given** the column mapping dropdowns
**When** rendering field options
**Then**:
- FIELD_LABELS.account equals "Account Name" (not "Account")
- Other labels are similarly descriptive

### AC2: Header Pattern Matching
**Given** CSV headers during auto-detection
**When** matching headers to fields
**Then**:
- "account_friendly_name" maps to account field
- "account name" maps to account field
- Existing patterns still work

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/utils/columnDetection.test.ts` — FIELD_LABELS.account equals "Account Name" (not "Account")
- [ ] `src/lib/__tests__/utils/columnDetection.test.ts` — auto-detection matches "account_friendly_name" header to account field
- [ ] `src/lib/__tests__/utils/columnDetection.test.ts` — auto-detection matches "account name" header to account field

## Implementation Notes

1. Update FIELD_LABELS.account from "Account" to "Account Name"
2. Add "account_friendly_name" and "account name" to HEADER_PATTERNS for account field
3. Review other FIELD_LABELS for similar clarity improvements

## Files to Create/Modify

- `src/lib/utils/columnDetection.ts` — update labels and patterns
