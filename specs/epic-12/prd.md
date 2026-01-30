# Epic 12: Import Wizard Deep Fixes

## Overview

Deep fixes to the import wizard covering font consistency, enriched sample rows, and comprehensive error diagnostics with recovery flow.

## Goals

1. Make import wizard fonts consistent with the rest of the app
2. Enrich sample rows with additional context (all CSV columns, expand option)
3. Implement comprehensive error diagnostics with copy, navigation, and per-row validation

## Stories

| ID | Title | Priority | Est |
|----|-------|----------|-----|
| 12.1 | Import Font Consistency | low | S |
| 12.2 | Import Sample Row Enrichment | medium | M |
| 12.3 | Import Error Diagnostics + Recovery | critical | M |

## Key Files

- `ColumnRow.svelte`, `AccountValueMapping.svelte`
- `ImportWizard.svelte`, `ImportProgress.svelte`, `transactions.ts`

## Dependencies

- Stories 12.2 and 12.3 depend on 11.8 (import infrastructure)
