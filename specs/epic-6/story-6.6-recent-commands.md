---
id: "6.6"
epic: 6
title: "Add Recent Commands History"
status: pending
priority: medium
estimation: small
depends_on: ["6.5"]
frs: ["FR32"]
---

# Story 6.6: Add Recent Commands History

## User Story

As a **power user**,
I want **quick access to my recent commands**,
So that **I can repeat common actions quickly**.

## Technical Context

**Recent Commands (from PRD Section 4.3):**
- History for quick re-execution
- Most recent first
- Persists across sessions

## Acceptance Criteria

### AC1: Recent Commands Section
**Given** the command palette opens
**When** search input is empty
**Then**:
- "Recent" section shown at top
- Lists recently executed commands
- Maximum 5 recent commands

### AC2: Recent Command Display
**Given** recent commands exist
**When** displayed in palette
**Then**:
- Shows command name
- Shows keyboard shortcut
- "Recent" label/header above list

### AC3: Add to History
**Given** a command is executed
**When** saved to history
**Then**:
- Command added to recent list
- Appears at top (most recent)
- Duplicates removed (keep most recent)

### AC4: History Persistence
**Given** commands have been executed
**When** app is closed and reopened
**Then**:
- Recent commands still available
- Stored in localStorage or database
- Order preserved

### AC5: Clear History
**Given** the command palette is open
**When** recent commands are shown
**Then**:
- "Clear recent" option available
- Clicking clears all history
- Only default commands shown after

### AC6: Search Hides Recent
**Given** the palette is open with recent showing
**When** user types in search
**Then**:
- Recent section hides
- Only search results shown
- Recent reappears when search cleared

### AC7: Select Recent Command
**Given** recent commands are shown
**When** user selects a recent command
**Then**:
- Command executes
- Command moves to top of recent
- Same as selecting any command

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test "Recent" section header renders when search is empty
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test "Recent" section hidden when no recent commands exist
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test recent section displays maximum 5 commands
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test most recently executed command appears first
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test typing in search hides recent section
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test clearing search re-shows recent section
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test "Clear recent" button removes all recent commands
- [ ] `src/lib/__tests__/stores/commands.test.ts` - Test addToRecentCommands adds command to history
- [ ] `src/lib/__tests__/stores/commands.test.ts` - Test duplicate command is moved to top (not duplicated)
- [ ] `src/lib/__tests__/stores/commands.test.ts` - Test adding 6th command removes oldest from list

### Integration Tests
- [ ] `src/lib/__tests__/utils/storage.test.ts` - Test localStorage stores recent commands array
- [ ] `src/lib/__tests__/utils/storage.test.ts` - Test localStorage retrieves recent commands on init
- [ ] `src/lib/__tests__/utils/storage.test.ts` - Test localStorage clear removes recent commands key

### E2E Tests
- [ ] `e2e/command-palette.spec.ts` - Test execute command -> reopen palette -> command in recent
- [ ] `e2e/command-palette.spec.ts` - Test recent commands persist after page reload
- [ ] `e2e/command-palette.spec.ts` - Test clicking "Clear recent" empties the recent section
- [ ] `e2e/command-palette.spec.ts` - Test selecting recent command re-executes it

## Implementation Notes

1. Store recent commands in localStorage
2. Track command execution
3. Deduplicate (keep latest)
4. Limit to 5 items
5. Clear function

## Files to Create/Modify

- `src/lib/components/shared/CommandPalette.svelte` - add recent
- `src/lib/stores/commands.ts` - recent history
- `src/lib/utils/storage.ts` - localStorage helpers
