---
id: "4.7"
epic: 4
title: "Implement Payee Autocomplete"
status: pending
priority: high
estimation: medium
depends_on: ["4.5"]
frs: ["FR20"]
---

# Story 4.7: Implement Payee Autocomplete

## User Story

As a **user**,
I want **payee suggestions based on my history**,
So that **I can quickly enter recurring payees**.

## Technical Context

**Autocomplete Behavior (from PRD Section 3.2.2):**
- Suggests from transaction history
- Sorted by frequency
- Auto-fills category from history

## Acceptance Criteria

### AC1: Suggestions Appear
**Given** the payee field is focused
**When** user types 2+ characters
**Then**:
- Dropdown shows matching payees
- Matches from transaction history
- Case-insensitive matching

### AC2: Frequency Sorting
**Given** suggestions are displayed
**When** multiple matches exist
**Then**:
- Sorted by frequency (most common first)
- Shows usage count (optional): "Albert Heijn (15)"

### AC3: Maximum Suggestions
**Given** many matches exist
**When** suggestions display
**Then**:
- Maximum 10 suggestions shown
- Scroll if more exist
- Or: "Show more..." link

### AC4: Selection by Click
**Given** suggestions are displayed
**When** user clicks a suggestion
**Then**:
- Payee field filled with selected value
- Dropdown closes
- Focus moves to next field

### AC5: Selection by Keyboard
**Given** suggestions are displayed
**When** user uses keyboard
**Then**:
- Arrow down/up navigates suggestions
- Enter selects highlighted suggestion
- Escape closes without selection

### AC6: Category Auto-Fill
**Given** a payee is selected from suggestions
**When** that payee has a common category
**Then**:
- Category field auto-fills with most used category
- User can still change category
- Example: "Albert Heijn" → "Groceries"

### AC7: New Payee
**Given** user types a new payee (no matches)
**When** no suggestions appear
**Then**:
- Dropdown shows "No matches - press Enter to use as new payee"
- Or: just allows the new value
- New payee saved when transaction saved

### AC8: Performance
**Given** 10,000+ transactions exist
**When** searching payees
**Then**:
- Suggestions appear within 100ms
- Debounce typing (100-150ms)

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test no suggestions shown for 0-1 character input
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test suggestions dropdown appears after 2+ characters typed
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test case-insensitive matching ("albert" matches "Albert Heijn")
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test maximum 10 suggestions displayed
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test scroll behavior when more than 10 matches exist
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test click on suggestion fills input and closes dropdown
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test Arrow Down/Up navigates through suggestions
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test Enter key selects highlighted suggestion
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test Escape key closes dropdown without selection
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test focus moves to next field after selection
- [ ] `src/lib/__tests__/Autocomplete.test.ts` - Test input debounces at 100-150ms
- [ ] `src/lib/__tests__/PayeeInput.test.ts` - Test suggestions sorted by frequency (most common first)
- [ ] `src/lib/__tests__/PayeeInput.test.ts` - Test usage count display: "Albert Heijn (15)"
- [ ] `src/lib/__tests__/PayeeInput.test.ts` - Test category auto-fills when payee with common category selected
- [ ] `src/lib/__tests__/PayeeInput.test.ts` - Test "No matches - press Enter to use as new payee" shown for novel input
- [ ] `src/lib/__tests__/PayeeInput.test.ts` - Test new payee value accepted on Enter when no matches

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test get_payee_suggestions returns distinct payees with frequency count
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test get_payee_suggestions sorted by frequency DESC
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test get_payee_suggestions filters by search term (LIKE query)
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test get_payee_category_association returns most-used category for payee
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test performance: get_payee_suggestions with 10,000+ transactions under 100ms

### E2E Tests
- [ ] `e2e/payee-autocomplete.spec.ts` - Test typing in payee field shows suggestions dropdown
- [ ] `e2e/payee-autocomplete.spec.ts` - Test selecting suggestion via click fills payee and category fields
- [ ] `e2e/payee-autocomplete.spec.ts` - Test keyboard selection (arrows + Enter) works correctly
- [ ] `e2e/payee-autocomplete.spec.ts` - Test entering new payee not in history is accepted
- [ ] `e2e/payee-autocomplete.spec.ts` - Test new payee appears in future suggestions after transaction saved

## Implementation Notes

1. Create Autocomplete component (reusable)
2. Query distinct payees with frequency count
3. Cache payee list for performance
4. Track category associations per payee
5. Consider fuzzy matching for typo tolerance

## Files to Create/Modify

- `src/lib/components/shared/Autocomplete.svelte`
- `src/lib/components/transactions/PayeeInput.svelte`
- `src-tauri/src/commands/transactions.rs` - payee suggestions query
- `src/lib/api/transactions.ts` - get payee suggestions
