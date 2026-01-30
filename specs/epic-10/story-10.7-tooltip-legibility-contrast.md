---
id: "10.7"
epic: 10
title: "Tooltip Legibility/Contrast"
status: pending
priority: medium
estimation: small
depends_on: []
---

# Story 10.7: Tooltip Legibility/Contrast

## User Story

As a **user viewing budget cell tooltips**,
I want **tooltip text to be legible with sufficient contrast**,
So that **I can read budget details without straining my eyes**.

## Technical Context

**Bug refs:** Item 2n (tooltip contrast)

Budget cell tooltips have low contrast — text blends into the background. The tooltip background needs sufficient contrast ratio (WCAG AA: 4.5:1 minimum for normal text). Secondary text should be lighter than primary but still readable.

## Acceptance Criteria

### AC1: Background Contrast
**Given** a tooltip renders
**When** displayed
**Then**:
- Background has sufficient contrast with surrounding content
- Clearly delineated from the page background

### AC2: Text Contrast
**Given** tooltip text
**When** displayed
**Then**:
- Primary text has contrast ratio >= 4.5:1 against tooltip background
- Font size is at least 0.9375rem (15px)

### AC3: Secondary Text
**Given** secondary/label text in tooltip
**When** displayed
**Then**:
- Lighter than primary text but still readable
- Meets WCAG AA contrast requirements

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/shared/Tooltip.test.ts` — tooltip background has sufficient contrast ratio
- [ ] `src/lib/__tests__/components/shared/Tooltip.test.ts` — secondary text color is lighter than primary but still readable
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` — label text has contrast ratio >= 4.5:1 against background
- [ ] `src/lib/__tests__/components/budget/BudgetCellTooltip.test.ts` — font size is at least 0.9375rem

## Implementation Notes

1. Update Tooltip component CSS: set dark background (#1a1a2e or similar) with white/light text
2. Update BudgetCellTooltip to use high-contrast color scheme
3. Set minimum font-size: 0.9375rem for tooltip content
4. Use `--tooltip-bg`, `--tooltip-text`, `--tooltip-secondary` CSS variables

## Files to Create/Modify

- `src/lib/components/shared/Tooltip.svelte` — update contrast colors
- `src/lib/components/budget/BudgetCellTooltip.svelte` — update text colors and font size
