---
id: "12.2"
epic: 12
title: "Import Sample Row Enrichment"
status: pending
priority: medium
estimation: medium
depends_on: ["11.8"]
---

# Story 12.2: Import Sample Row Enrichment

## User Story

As a **user mapping account values during import**,
I want **sample rows to show rich context including all CSV columns and expandable additional samples**,
So that **I can confidently map account values to the correct Stackz accounts**.

## Technical Context

**Bug refs:** Items 3l, 3m (refinement from 11.8)

Building on 11.8's sample row foundation, this story enriches the samples with: highlighting account-related fields (IBAN, account number), showing multiple samples per unique value, "Show more rows" expansion, and including all CSV columns for context.

## Acceptance Criteria

### AC1: Highlighted Fields
**Given** sample rows in AccountValueMapping
**When** rendered
**Then**:
- Account-related fields (IBAN, account number) are visually highlighted
- Easy to identify which fields relate to the account

### AC2: Multiple Samples
**Given** a unique account value
**When** sample rows display
**Then**:
- Multiple sample rows shown per unique value (not just one)
- Shows most representative/diverse samples

### AC3: Expand More Rows
**Given** sample rows for a value
**When** more rows are available than initially shown
**Then**:
- "Show more rows" button is available
- Clicking expands additional sample rows

### AC4: Full CSV Context
**Given** a sample row
**When** rendered
**Then**:
- Includes all CSV columns for context (not just account-related)
- Helps user identify the correct account mapping

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — sample row highlights account-related fields (IBAN, account number)
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — multiple sample rows shown per unique value
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — "Show more rows" expands additional samples
- [ ] `src/lib/__tests__/import/AccountValueMapping.test.ts` — sample row includes all CSV columns for context

## Implementation Notes

1. Enhance sample row rendering to highlight IBAN/accountNumber fields (bold, colored)
2. Store multiple sample rows per unique account value (up to 3 initially visible)
3. Add "Show more rows" toggle that reveals remaining samples
4. Display all CSV columns in sample rows as a mini-table or key-value pairs

## Files to Create/Modify

- `src/lib/components/import/AccountValueMapping.svelte` — enrich sample rows
