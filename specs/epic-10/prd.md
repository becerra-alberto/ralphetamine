# Epic 10: Budget View Overhaul

## Overview

Comprehensive overhaul of the Budget view covering number formatting, averages, sticky names, section interactions, the adjustment modal, collapsible categories, tooltips, expansion bugs, and category management.

## Goals

1. Smart K-unit formatting for budget amounts
2. Average-per-month column in totals
3. Sticky subcategory names during horizontal scroll
4. Section header hover tooltips and inline transaction expansion
5. Fix the Adjustment Modal (dropdown, input, preview, apply)
6. Collapsible categories in the adjust panel
7. Tooltip legibility and contrast improvements
8. Fix expanded category white box rendering bug
9. Add new categories and subcategories

## Stories

| ID | Title | Priority | Est |
|----|-------|----------|-----|
| 10.1 | Smart Number Formatting (K units) | high | M |
| 10.2 | Average-per-Month Column | medium | M |
| 10.3 | Sticky Subcategory Names | high | S |
| 10.4 | Section Header Hover + Inline Transactions | medium | M |
| 10.5 | Fix Adjustment Modal (Dropdown, Input, Preview, Apply) | critical | M |
| 10.6 | Collapsible Categories in Adjust Panel | medium | S |
| 10.7 | Tooltip Legibility/Contrast | medium | S |
| 10.8 | Fix Expanded Category White Box Bug | high | S |
| 10.9 | Add New Categories and Subcategories | high | L |

## Key Files

- `BudgetGrid.svelte`, `BudgetCell.svelte`, `SectionHeader.svelte`
- `CategoryRow.svelte`, `BudgetAdjustmentModal.svelte`, `AdjustmentPreview.svelte`
- `TotalsColumn.svelte`, `Tooltip.svelte`, `BudgetCellTooltip.svelte`
- `CellExpansion.svelte`
