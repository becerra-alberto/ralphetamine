---
id: "7.1"
epic: 7
title: "Create CSV Import Wizard - File Selection"
status: done
priority: high
estimation: medium
depends_on: ["4.1"]
---

# Story 7.1: Create CSV Import Wizard - File Selection

## User Story

As a **user**,
I want **to import transactions from a CSV file**,
So that **I can quickly load my transaction history**.

## Technical Context

**CSV Import (from PRD Section 7.3.1):**
- Tier 3: CSV Import for banks like Degiro, TD Canada
- Manual export from bank, import to Stackz
- Multi-step wizard for mapping

## Acceptance Criteria

### AC1: Import Button
**Given** user is in Transactions view
**When** looking at the header/toolbar
**Then**:
- "Import" button visible
- Or: in menu/dropdown

### AC2: Import Shortcut
**Given** user is in Transactions view
**When** ⌘I is pressed
**Then**:
- Import wizard opens

### AC3: Wizard Opens
**Given** user clicks Import or presses ⌘I
**When** the wizard initializes
**Then**:
- Modal wizard opens
- Step 1: File Selection displayed
- Step indicator shows "Step 1 of 3"

### AC4: File Selection UI
**Given** Step 1 is displayed
**When** the UI renders
**Then** shows:
- Title: "Import Transactions"
- Subtitle: "Select a CSV file from your bank"
- File drop zone with icon
- "Select File" button
- Supported formats note: "Supports .csv files"

### AC5: File Selection - Click
**Given** Step 1 is displayed
**When** user clicks "Select File"
**Then**:
- Native file picker opens
- Filters to CSV files only (.csv)
- Selected file name displayed after selection

### AC6: File Selection - Drag & Drop
**Given** Step 1 is displayed
**When** user drags a CSV file onto drop zone
**Then**:
- Drop zone highlights
- File accepted and name displayed
- Error if non-CSV file

### AC7: File Preview
**Given** a CSV file is selected
**When** file is parsed
**Then**:
- Shows preview of first 5 rows
- Displays as table
- Column headers visible
- "Next" button enabled

### AC8: Invalid File Handling
**Given** an invalid file is selected
**When** parsing fails
**Then**:
- Error message displayed
- "Please select a valid CSV file"
- Can select different file

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/csvParser.test.ts` - Test CSV parsing with various date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, ISO 8601)
- [ ] `src/lib/__tests__/csvParser.test.ts` - Test amount parsing with comma decimals (1.234,56), period decimals (1,234.56), and currency symbols
- [ ] `src/lib/__tests__/csvParser.test.ts` - Test encoding detection (UTF-8, UTF-16, ISO-8859-1, Windows-1252)
- [ ] `src/lib/__tests__/csvParser.test.ts` - Test malformed CSV handling (missing columns, inconsistent row lengths, unclosed quotes)
- [ ] `src/lib/__tests__/csvParser.test.ts` - Test large file parsing (1000+ rows) with chunked processing
- [ ] `src/lib/__tests__/FileDropZone.test.ts` - Test file type validation rejects non-CSV files (.xlsx, .pdf, .txt)
- [ ] `src/lib/__tests__/FileDropZone.test.ts` - Test drag-over visual state changes
- [ ] `src/lib/__tests__/FileDropZone.test.ts` - Test file drop event handling
- [ ] `src/lib/__tests__/ImportWizard.test.ts` - Test step indicator shows correct step (1 of 3)
- [ ] `src/lib/__tests__/ImportWizard.test.ts` - Test Next button disabled until valid file selected
- [ ] `src/lib/__tests__/CsvPreview.test.ts` - Test preview renders first 5 rows correctly
- [ ] `src/lib/__tests__/CsvPreview.test.ts` - Test column headers are displayed

### Integration Tests
- [ ] `src-tauri/src/commands/import_test.rs` - Test Tauri file dialog returns valid CSV path
- [ ] `src-tauri/src/commands/import_test.rs` - Test reading CSV file from disk with various encodings
- [ ] `src-tauri/src/commands/import_test.rs` - Test error response for unreadable/corrupt files

### E2E Tests
- [ ] `e2e/csv-import.spec.ts` - Test Import button visible in Transactions view toolbar
- [ ] `e2e/csv-import.spec.ts` - Test Cmd+I keyboard shortcut opens import wizard
- [ ] `e2e/csv-import.spec.ts` - Test selecting valid CSV file shows preview table
- [ ] `e2e/csv-import.spec.ts` - Test selecting invalid file displays error message
- [ ] `e2e/csv-import.spec.ts` - Test drag-and-drop CSV file onto drop zone

## Implementation Notes

1. Create ImportWizard component
2. Create FileDropZone component
3. Use Tauri file dialog for native picker
4. Parse CSV with PapaParse or similar
5. Handle various CSV encodings

## Files to Create/Modify

- `src/lib/components/import/ImportWizard.svelte`
- `src/lib/components/import/FileSelection.svelte`
- `src/lib/components/import/FileDropZone.svelte`
- `src/lib/components/import/CsvPreview.svelte`
- `src/lib/utils/csvParser.ts`
- `src/routes/transactions/+page.svelte` - add import button
