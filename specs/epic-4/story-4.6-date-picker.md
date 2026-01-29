---
id: "4.6"
epic: 4
title: "Add Date Picker with Auto-Fill"
status: pending
priority: medium
estimation: medium
depends_on: ["4.5"]
frs: ["FR19"]
---

# Story 4.6: Add Date Picker with Auto-Fill

## User Story

As a **user**,
I want **an easy date picker that defaults to today**,
So that **I can quickly enter transaction dates**.

## Technical Context

**Date Behavior (from PRD Section 3.2.2):**
- Auto-fills today by default
- Calendar picker for selection
- Natural language parsing (bonus)
- Display format: DD MMM YYYY

## Acceptance Criteria

### AC1: Auto-Fill Today
**Given** a date field is displayed (quick-add or edit)
**When** the field is empty/new
**Then**:
- Auto-fills with today's date
- Displayed in format: "28 Jan 2025"

### AC2: Calendar Picker
**Given** the date field is focused
**When** user clicks or presses Enter
**Then**:
- Calendar picker popup appears
- Current date highlighted
- Current month displayed
- Navigation to other months

### AC3: Date Selection
**Given** the calendar picker is open
**When** user clicks a date
**Then**:
- Date field updates with selected date
- Calendar closes
- Format: "DD MMM YYYY"

### AC4: Keyboard Navigation
**Given** the calendar picker is open
**When** user uses keyboard
**Then**:
- Arrow keys move date selection
- Enter confirms selection
- Escape closes without change

### AC5: Manual Entry
**Given** the date field is focused
**When** user types a date
**Then**:
- Accepts various formats: "28/01/2025", "2025-01-28", "28 Jan 2025"
- Parses and validates
- Shows error if invalid

### AC6: Natural Language (Bonus)
**Given** the date field is focused
**When** user types natural language
**Then** attempts to parse:
- "today" → today's date
- "yesterday" → yesterday
- "last friday" → most recent Friday
- Invalid phrases: show as-is or error

### AC7: Date Display Format
**Given** a date is selected/entered
**When** displayed in the field
**Then**:
- Consistent format: "DD MMM YYYY"
- Example: "28 Jan 2025"
- Stored internally as ISO: "2025-01-28"

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/DatePicker.test.ts` - Test empty/new field auto-fills with today's date
- [ ] `src/lib/__tests__/DatePicker.test.ts` - Test display format is "DD MMM YYYY" (e.g., "28 Jan 2025")
- [ ] `src/lib/__tests__/DatePicker.test.ts` - Test click on field opens calendar popup
- [ ] `src/lib/__tests__/DatePicker.test.ts` - Test Enter key on field opens calendar popup
- [ ] `src/lib/__tests__/DatePicker.test.ts` - Test Escape key closes calendar without changing value
- [ ] `src/lib/__tests__/Calendar.test.ts` - Test current date is highlighted in calendar view
- [ ] `src/lib/__tests__/Calendar.test.ts` - Test current month displays by default
- [ ] `src/lib/__tests__/Calendar.test.ts` - Test previous/next month navigation buttons work
- [ ] `src/lib/__tests__/Calendar.test.ts` - Test arrow keys move date selection (up/down/left/right)
- [ ] `src/lib/__tests__/Calendar.test.ts` - Test Enter key confirms selection and closes calendar
- [ ] `src/lib/__tests__/Calendar.test.ts` - Test clicking a date updates field and closes calendar
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test parsing "28/01/2025" (DD/MM/YYYY format)
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test parsing "2025-01-28" (ISO format)
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test parsing "28 Jan 2025" (display format)
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test parsing "today" returns current date
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test parsing "yesterday" returns previous date
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test parsing "last friday" returns most recent Friday
- [ ] `src/lib/__tests__/dateParser.test.ts` - Test invalid date string returns error/null
- [ ] `src/lib/__tests__/dates.test.ts` - Test formatDate outputs "DD MMM YYYY" format
- [ ] `src/lib/__tests__/dates.test.ts` - Test toISODate outputs "YYYY-MM-DD" for storage

### Integration Tests
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test transaction date stored as ISO format string "YYYY-MM-DD"
- [ ] `src-tauri/src/commands/transactions_test.rs` - Test date sorting works correctly with ISO date strings

### E2E Tests
- [ ] `e2e/date-picker.spec.ts` - Test clicking date field opens calendar popup
- [ ] `e2e/date-picker.spec.ts` - Test selecting date from calendar updates the field value
- [ ] `e2e/date-picker.spec.ts` - Test typing valid date manually is accepted and formatted
- [ ] `e2e/date-picker.spec.ts` - Test keyboard navigation within calendar (arrow keys, Enter, Escape)
- [ ] `e2e/date-picker.spec.ts` - Test natural language input "yesterday" is parsed correctly

## Implementation Notes

1. Create DatePicker component (reusable)
2. Use date-fns or similar for parsing/formatting
3. Handle timezone considerations (local dates)
4. Natural language parsing with chrono-node or similar
5. Accessible calendar (ARIA)

## Files to Create/Modify

- `src/lib/components/shared/DatePicker.svelte`
- `src/lib/components/shared/Calendar.svelte`
- `src/lib/utils/dateParser.ts` - parsing utilities
- `src/lib/utils/dates.ts` - formatting utilities
