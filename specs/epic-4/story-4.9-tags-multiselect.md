---
id: "4.9"
epic: 4
title: "Implement Tags Multi-Select"
status: done
priority: medium
estimation: medium
depends_on: ["4.5"]
frs: ["FR22"]
---

# Story 4.9: Implement Tags Multi-Select

## User Story

As a **user**,
I want **to add multiple tags to transactions**,
So that **I can organize transactions beyond categories**.

## Technical Context

**Tags (from PRD Section 3.2.2):**
- Multi-select chips interface
- Predefined tags: Personal, Business, Recurring, Tax-Deductible
- Custom tags supported
- Stored as JSON array in database

## Acceptance Criteria

### AC1: Tags Field Display
**Given** the tags field renders
**When** no tags selected
**Then**:
- Shows placeholder: "Add tags..."
- Click opens tag selector

### AC2: Tag Selector Dropdown
**Given** user clicks tags field
**When** dropdown opens
**Then**:
- Shows checkbox list of available tags
- Predefined: Personal, Business, Recurring, Tax-Deductible
- Previously used custom tags also shown

### AC3: Multi-Select
**Given** the tag selector is open
**When** user clicks multiple tags
**Then**:
- Each clicked tag toggles selection
- Multiple tags can be selected
- Dropdown stays open for multi-select

### AC4: Selected Tags as Chips
**Given** tags are selected
**When** field displays
**Then**:
- Selected tags shown as chips/pills
- Each chip shows tag name
- Each chip has X button to remove

### AC5: Remove Tag
**Given** a tag chip is displayed
**When** user clicks X on chip
**Then**:
- Tag removed from selection
- Chip disappears
- Tag available again in dropdown

### AC6: Create New Tag
**Given** the tag selector is open
**When** user types a new tag name and presses Enter
**Then**:
- New tag created
- Immediately selected
- Available for future transactions

### AC7: Tag Storage
**Given** transaction is saved with tags
**When** stored in database
**Then**:
- Tags stored as JSON array: '["Personal", "Recurring"]'
- Retrievable on load

### AC8: Keyboard Interaction
**Given** tags field is focused
**When** user uses keyboard
**Then**:
- Space/Enter opens dropdown
- Arrow keys navigate tags
- Space toggles tag selection
- Escape closes dropdown

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test field renders with placeholder "Add tags..." when empty
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test click on field opens multi-select dropdown
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test dropdown shows predefined tags: Personal, Business, Recurring, Tax-Deductible
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test dropdown shows previously used custom tags
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test each tag has checkbox for selection
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test clicking tag checkbox toggles selection state
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test multiple tags can be selected simultaneously
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test dropdown stays open during multi-select (doesn't close on each click)
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test selected tags render as chips in the field
- [ ] `src/lib/__tests__/Chip.test.ts` - Test chip displays tag name
- [ ] `src/lib/__tests__/Chip.test.ts` - Test chip has X button for removal
- [ ] `src/lib/__tests__/Chip.test.ts` - Test clicking X removes tag from selection
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test typing new tag name and pressing Enter creates new tag
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test new tag immediately selected after creation
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test Space/Enter on field opens dropdown
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test Arrow Down/Up navigates tag options
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test Space key toggles tag selection
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test Escape key closes dropdown
- [ ] `src/lib/__tests__/TagSelect.test.ts` - Test tags serialized to JSON array format: '["Personal", "Recurring"]'

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test transaction tags stored as JSON array string in database
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test transaction tags retrieved and parsed correctly from JSON
- [ ] `src-tauri/src/commands/tags_test.rs` - Test get_distinct_tags returns all unique tags from transactions
- [ ] `src-tauri/src/commands/tags_test.rs` - Test get_distinct_tags includes both predefined and custom tags

### E2E Tests
- [ ] `e2e/tags-multiselect.spec.ts` - Test clicking tags field opens multi-select dropdown
- [ ] `e2e/tags-multiselect.spec.ts` - Test selecting multiple tags displays them as chips
- [ ] `e2e/tags-multiselect.spec.ts` - Test removing tag via chip X button deselects it
- [ ] `e2e/tags-multiselect.spec.ts` - Test creating new custom tag and selecting it
- [ ] `e2e/tags-multiselect.spec.ts` - Test saved transaction preserves tag selections
- [ ] `e2e/tags-multiselect.spec.ts` - Test keyboard-only multi-selection workflow

## Implementation Notes

1. Create TagSelect component
2. Store tags as JSON array in transactions table
3. Query distinct tags for dropdown options
4. Chips component for selected display
5. Consider tag management UI (rename, delete)

## Files to Create/Modify

- `src/lib/components/shared/TagSelect.svelte`
- `src/lib/components/shared/Chip.svelte`
- `src/lib/components/transactions/TagsInput.svelte`
- `src/lib/api/tags.ts` - tag CRUD operations
