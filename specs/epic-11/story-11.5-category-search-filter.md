---
id: "11.5"
epic: 11
title: "Category/Subcategory Search in Filter"
status: pending
priority: medium
estimation: small
depends_on: []
---

# Story 11.5: Category/Subcategory Search in Filter

## User Story

As a **user filtering transactions by category**,
I want **a search input in the category filter to quickly find categories**,
So that **I don't have to scroll through a long list of categories**.

## Technical Context

**Bug refs:** Item 3f (category search)

The category filter panel shows all categories in a flat or grouped list. With many categories, finding the right one is slow. A search input at the top should filter the displayed categories. When a subcategory matches, its parent section should remain visible.

## Acceptance Criteria

### AC1: Search Input
**Given** the category filter panel
**When** rendered
**Then**:
- A search input appears at the top of the category list

### AC2: Filter on Type
**Given** user types in the search input
**When** typing a search term
**Then**:
- Displayed categories are filtered to match
- Case-insensitive matching

### AC3: Parent Visibility
**Given** a subcategory matches the search
**When** filtered
**Then**:
- The matching subcategory's parent section remains visible
- Provides context for the match

### AC4: Clear Search
**Given** the search has text
**When** user clears the search
**Then**:
- Full category list is restored
- All sections visible

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/transactions/CategoryFilter.test.ts` — renders search input at top
- [ ] `src/lib/__tests__/components/transactions/CategoryFilter.test.ts` — typing filters displayed categories
- [ ] `src/lib/__tests__/components/transactions/CategoryFilter.test.ts` — matching subcategory shows its parent
- [ ] `src/lib/__tests__/components/transactions/CategoryFilter.test.ts` — clearing search restores full list
- [ ] `src/lib/__tests__/components/transactions/CategoryFilter.test.ts` — empty search shows all categories

## Implementation Notes

1. Add search input to CategoryFilter component header
2. Add `searchQuery` state variable
3. Filter categories by name match, keeping parent visible if child matches
4. Use `toLowerCase()` for case-insensitive matching

## Files to Create/Modify

- `src/lib/components/transactions/CategoryFilter.svelte` — add search input and filter logic
