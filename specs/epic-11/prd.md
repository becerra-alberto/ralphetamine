# Epic 11: Transaction View Enhancements

## Overview

Enhance the Transaction view with full-field search, bank columns, direct edit on click, extended edit fields, category search in filters, batch entry, import label fixes, and import target/sample/error improvements.

## Goals

1. Search across all transaction columns (payee, memo, account, category, amount, tags)
2. Add bank/institution column to transaction table
3. Direct edit mode on pencil click and double-click
4. Extended edit fields (tags, bank, currency)
5. Category/subcategory search in filter panel
6. Batch transaction entry with "+" button
7. Improve import field labels
8. Expand import targets, samples, country support, and error handling

## Stories

| ID | Title | Priority | Est |
|----|-------|----------|-----|
| 11.1 | Full-Field Search (all columns) | high | M |
| 11.2 | Bank/Institution Columns | medium | S |
| 11.3 | Direct Edit on Pencil Click + Double-Click | high | S |
| 11.4 | Extended Edit Fields (tags, bank, currency) | medium | M |
| 11.5 | Category/Subcategory Search in Filter | medium | S |
| 11.6 | Batch Transaction Entry "+" Button | low | M |
| 11.7 | Import Label Improvements | medium | S |
| 11.8 | Import: New Targets + Samples + Country + Errors | high | M |

## Key Files

- `TransactionRow.svelte`, `TransactionTable.svelte`, `SearchBar.svelte`
- `FilterPanel.svelte`, `CategoryFilter.svelte`, `QuickAddRow.svelte`
- `columnDetection.ts`, `AccountValueMapping.svelte`
- `ImportWizard.svelte`, `ImportProgress.svelte`
