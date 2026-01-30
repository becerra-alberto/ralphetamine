---
id: "10.3"
epic: 10
title: "Sticky Subcategory Names"
status: pending
priority: high
estimation: small
depends_on: []
---

# Story 10.3: Sticky Subcategory Names

## User Story

As a **user scrolling horizontally through the budget grid**,
I want **subcategory names to remain sticky on the left**,
So that **I always know which category row I'm looking at when viewing distant months**.

## Technical Context

**Bug refs:** Item 2c (sticky names)

The budget grid scrolls horizontally to show all 12 months. Section headers already have `position: sticky; left: 0`. Subcategory name cells in CategoryRow need the same treatment with an opaque background to prevent content showing through.

## Acceptance Criteria

### AC1: Sticky Position
**Given** user scrolls the budget grid horizontally
**When** subcategory rows are visible
**Then**:
- The subcategory name cell stays fixed on the left edge
- Uses `position: sticky; left: 0`

### AC2: Opaque Background
**Given** the sticky subcategory name cell
**When** overlapping scrolled content
**Then**:
- Background is opaque (not transparent)
- Matches the row background color

### AC3: Z-Index Matching
**Given** the sticky subcategory cell
**When** rendered alongside sticky section headers
**Then**:
- Uses the same z-index as section header sticky column
- No visual layering conflicts

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/budget/CategoryRow.test.ts` — subcategory name cell has position:sticky and left:0
- [ ] `src/lib/__tests__/components/budget/CategoryRow.test.ts` — subcategory name has opaque background
- [ ] `src/lib/__tests__/components/budget/CategoryRow.test.ts` — z-index matches section header sticky column

## Implementation Notes

1. Add `position: sticky; left: 0` to the CategoryRow name cell
2. Set opaque background color (match row bg or `var(--bg-primary)`)
3. Match z-index with SectionHeader sticky cells
4. Ensure no overflow issues with the sticky cell

## Files to Create/Modify

- `src/lib/components/budget/CategoryRow.svelte` — add sticky positioning to name cell
