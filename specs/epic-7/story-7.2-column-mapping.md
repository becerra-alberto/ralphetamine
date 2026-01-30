---
id: "7.2"
epic: 7
title: "Implement Column Mapping"
status: done
priority: high
estimation: large
depends_on: ["7.1"]
---

# Story 7.2: Implement Column Mapping

## User Story

As a **user**,
I want **to map CSV columns to transaction fields**,
So that **my data imports correctly**.

## Technical Context

**Column Mapping:**
- Different banks have different CSV formats
- User maps columns to Stackz fields
- Auto-detection for common formats

## Acceptance Criteria

### AC1: Step 2 Display
**Given** user completes Step 1 (file selected)
**When** Step 2 displays
**Then** shows:
- Title: "Map Columns"
- Subtitle: "Tell us which columns contain which data"
- Step indicator: "Step 2 of 3"

### AC2: Column List
**Given** Step 2 renders
**When** CSV columns are displayed
**Then**:
- Lists all columns from CSV header
- Each column shows sample data (first row value)
- Dropdown for field mapping

### AC3: Mapping Options
**Given** a column dropdown is opened
**When** options display
**Then** mapping options are:
- Date (required)
- Payee (required)
- Amount (required) - single column
- Inflow (if separate columns)
- Outflow (if separate columns)
- Memo (optional)
- Category (optional)
- Skip this column

### AC4: Auto-Mapping
**Given** CSV columns have common names
**When** Step 2 initializes
**Then** attempts auto-mapping:
- "Date", "Datum", "Transaction Date" → Date
- "Description", "Payee", "Name", "Omschrijving" → Payee
- "Amount", "Bedrag", "Value" → Amount
- "Memo", "Notes", "Reference" → Memo

### AC5: Required Field Validation
**Given** mappings are configured
**When** user clicks "Next"
**Then**:
- Validates required fields mapped (Date, Payee, Amount or In/Out)
- Shows error if missing: "Please map the Date column"
- Prevents proceeding until valid

### AC6: Amount Column Options
**Given** mapping Amount field
**When** bank has separate In/Out columns
**Then**:
- Can map "Inflow" and "Outflow" separately
- Or: single "Amount" column (negative = out)
- Toggle between modes

### AC7: Preview Update
**Given** mappings are configured
**When** preview updates
**Then**:
- Shows how transactions will look
- Uses mapped columns
- First 3-5 rows previewed

### AC8: Save Mapping Template
**Given** valid mappings configured
**When** option is shown
**Then**:
- "Save this mapping for future imports" checkbox
- Names the template (e.g., "ING Export")
- Reusable in future imports

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/columnDetection.test.ts` - Test auto-mapping for English column names (Date, Description, Amount, Memo)
- [ ] `src/lib/__tests__/columnDetection.test.ts` - Test auto-mapping for Dutch column names (Datum, Omschrijving, Bedrag)
- [ ] `src/lib/__tests__/columnDetection.test.ts` - Test auto-mapping for German column names (Datum, Beschreibung, Betrag)
- [ ] `src/lib/__tests__/columnDetection.test.ts` - Test case-insensitive header matching ("DATE", "date", "Date")
- [ ] `src/lib/__tests__/columnDetection.test.ts` - Test no false positives for ambiguous column names
- [ ] `src/lib/__tests__/ColumnMapping.test.ts` - Test all CSV columns render with dropdowns
- [ ] `src/lib/__tests__/ColumnMapping.test.ts` - Test sample data (first row) displayed for each column
- [ ] `src/lib/__tests__/ColumnMapping.test.ts` - Test required field validation blocks Next (Date, Payee, Amount missing)
- [ ] `src/lib/__tests__/ColumnMapping.test.ts` - Test Amount vs Inflow/Outflow mode toggle
- [ ] `src/lib/__tests__/ColumnMapping.test.ts` - Test validation allows Inflow+Outflow as alternative to Amount
- [ ] `src/lib/__tests__/ColumnMapping.test.ts` - Test Skip column option excludes from mapping
- [ ] `src/lib/__tests__/MappingPreview.test.ts` - Test preview updates when mappings change
- [ ] `src/lib/__tests__/MappingPreview.test.ts` - Test preview shows 3-5 sample transactions with mapped fields
- [ ] `src/lib/__tests__/MappingPreview.test.ts` - Test date parsing with multiple formats after mapping
- [ ] `src/lib/__tests__/MappingPreview.test.ts` - Test amount conversion (negative values, comma decimals)

### Integration Tests
- [ ] `src-tauri/src/db/import_templates_test.rs` - Test saving mapping template to database
- [ ] `src-tauri/src/db/import_templates_test.rs` - Test loading saved mapping template
- [ ] `src-tauri/src/db/import_templates_test.rs` - Test template uniqueness constraint (same name overwrites)
- [ ] `src-tauri/src/commands/import_test.rs` - Test applying saved template to new CSV with matching structure

### E2E Tests
- [ ] `e2e/csv-import.spec.ts` - Test Step 2 displays after file selection with correct step indicator
- [ ] `e2e/csv-import.spec.ts` - Test column dropdown interaction and field selection
- [ ] `e2e/csv-import.spec.ts` - Test required field validation error messages display
- [ ] `e2e/csv-import.spec.ts` - Test save mapping template checkbox and naming
- [ ] `e2e/csv-import.spec.ts` - Test reusing saved template on subsequent import

## Implementation Notes

1. Create ColumnMapping component
2. Auto-detect common patterns
3. Store mapping templates in database
4. Handle various date formats
5. Handle different amount formats (comma vs period)

## Files to Create/Modify

- `src/lib/components/import/ColumnMapping.svelte`
- `src/lib/components/import/ColumnRow.svelte`
- `src/lib/components/import/MappingPreview.svelte`
- `src/lib/utils/columnDetection.ts` - auto-mapping
- `src-tauri/src/db/migrations/006_import_templates.sql`
