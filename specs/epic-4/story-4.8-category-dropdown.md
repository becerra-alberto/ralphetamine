---
id: "4.8"
epic: 4
title: "Create Hierarchical Category Dropdown"
status: done
priority: high
estimation: medium
depends_on: ["4.5"]
frs: ["FR21"]
---

# Story 4.8: Create Hierarchical Category Dropdown

## User Story

As a **user**,
I want **to select categories from an organized dropdown**,
So that **I can accurately categorize transactions**.

## Technical Context

**Category Structure (from PRD Section 5.1.2):**
- Parent categories (sections): Income, Housing, Essential, Lifestyle, Savings
- Child categories nested under parents
- Type: income | expense | transfer

## Acceptance Criteria

### AC1: Dropdown Structure
**Given** the category field is focused
**When** the dropdown opens
**Then** categories display hierarchically:
- Section headers (bold, non-selectable)
- Child categories indented under sections
- Visual hierarchy clear

### AC2: Section Headers
**Given** the dropdown is open
**When** sections display
**Then**:
- Section names: Income, Housing, Essential, Lifestyle, Savings
- Headers are visually distinct (bold, background)
- Headers are NOT selectable (clicking does nothing)

### AC3: Category Selection
**Given** the dropdown is open
**When** user clicks a category (not header)
**Then**:
- Category is selected
- Dropdown closes
- Field shows category name

### AC4: Search/Filter
**Given** the dropdown is open
**When** user types in search field
**Then**:
- Categories filtered by name match
- Section headers remain visible if children match
- Matching text highlighted (optional)

### AC5: Keyboard Navigation
**Given** the dropdown is open
**When** user uses keyboard
**Then**:
- Arrow down/up skips headers
- Only navigates selectable categories
- Enter selects highlighted category
- Escape closes

### AC6: No Category Option
**Given** the dropdown is open
**When** options display
**Then**:
- "Uncategorized" option available at top
- Allows explicitly removing category
- Or: clear button to remove selection

### AC7: Category Icons/Colors
**Given** categories have icons/colors defined
**When** displayed in dropdown
**Then**:
- Icon shown before category name
- Color indicator (dot or background)
- Matches category settings

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test dropdown renders hierarchical structure with sections and children
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test section headers rendered: Income, Housing, Essential, Lifestyle, Savings
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test section headers have bold/distinct styling
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test section headers are NOT selectable (click does nothing)
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test child categories visually indented under parent section
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test clicking child category selects it and closes dropdown
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test selected category name displayed in field after selection
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test "Uncategorized" option available at top of list
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test clear button removes category selection
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test category icons render before category name
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test category color indicator (dot) displays correctly
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test Arrow Down/Up navigation skips section headers
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test Enter key selects highlighted category
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test Escape key closes dropdown without selection
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test search/filter input filters categories by name
- [ ] `src/lib/__tests__/CategoryDropdown.test.ts` - Test search preserves section headers when children match
- [ ] `src/lib/__tests__/categoryGroups.test.ts` - Test groupCategoriesByParent correctly nests children under parent_id

### Integration Tests
- [ ] `src-tauri/src/commands/categories_test.rs` - Test get_categories returns all categories with parent_id relationships
- [ ] `src-tauri/src/commands/categories_test.rs` - Test categories include type (income|expense|transfer), icon, and color fields
- [ ] `src-tauri/src/commands/categories_test.rs` - Test categories sorted by sort_order within each parent group

### E2E Tests
- [ ] `e2e/category-dropdown.spec.ts` - Test clicking category field opens hierarchical dropdown
- [ ] `e2e/category-dropdown.spec.ts` - Test all section headers (Income, Housing, Essential, Lifestyle, Savings) visible
- [ ] `e2e/category-dropdown.spec.ts` - Test selecting category updates transaction and closes dropdown
- [ ] `e2e/category-dropdown.spec.ts` - Test typing to search filters visible categories
- [ ] `e2e/category-dropdown.spec.ts` - Test keyboard-only navigation and selection works

## Implementation Notes

1. Create CategoryDropdown component
2. Group categories by parent_id
3. Filter preserves hierarchy (show parent if child matches)
4. Use CSS for indentation and styling
5. Consider virtualization for many categories

## Files to Create/Modify

- `src/lib/components/shared/CategoryDropdown.svelte`
- `src/lib/components/transactions/CategorySelect.svelte`
- `src/lib/utils/categoryGroups.ts` - grouping utility
