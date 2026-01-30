---
id: "6.5"
epic: 6
title: "Implement Command Palette"
status: done
priority: critical
estimation: large
depends_on: ["1.4"]
frs: ["FR32"]
---

# Story 6.5: Implement Command Palette

## User Story

As a **power user**,
I want **a command palette for quick navigation and actions**,
So that **I can use the app efficiently with my keyboard**.

## Technical Context

**Command Palette (from PRD Section 4.3):**
- Fuzzy search for commands
- Keyboard shortcut hints
- Recent commands history
- Central navigation hub

## Acceptance Criteria

### AC1: Open Command Palette
**Given** the app is running
**When** user presses ⌘K (Cmd+K)
**Then**:
- Command palette modal opens
- Centered on screen
- Background dimmed
- Search input auto-focused

### AC2: Palette Layout
**Given** the command palette is open
**When** it renders
**Then** shows:
- Search input at top with placeholder "Type a command..."
- List of commands below
- Keyboard shortcut hints on right side
- Recent commands section (if any)

### AC3: Available Commands
**Given** the palette is open
**When** default commands display
**Then** shows:
- Go to Home (⌘1)
- Go to Budget (⌘U)
- Go to Transactions (⌘T)
- Go to Net Worth (⌘W)
- New Transaction (⌘N)
- Search Transactions (⌘F)
- Adjust Budgets (⌘⇧B)

### AC4: Fuzzy Search
**Given** the palette is open
**When** user types in search
**Then**:
- Commands filtered by fuzzy match
- Best matches appear first
- Matches on command name
- "bud" matches "Go to Budget"

### AC5: Command Selection - Click
**Given** commands are displayed
**When** user clicks a command
**Then**:
- Command executes
- Palette closes

### AC6: Command Selection - Keyboard
**Given** commands are displayed
**When** user uses keyboard
**Then**:
- Arrow down/up navigates list
- Enter executes highlighted command
- First command highlighted by default

### AC7: Close Palette
**Given** the palette is open
**When** user presses Escape OR clicks outside
**Then**:
- Palette closes
- No command executed
- Focus returns to previous element

### AC8: Shortcut Hints
**Given** commands are displayed
**When** looking at command row
**Then**:
- Shortcut shown on right (e.g., "⌘T")
- Styled as keyboard key
- Helps learn shortcuts

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test palette modal renders with dimmed background
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test search input is auto-focused on open
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test placeholder text shows "Type a command..."
- [ ] `src/lib/__tests__/shared/CommandList.test.ts` - Test all navigation commands render (Home, Budget, Transactions, Net Worth)
- [ ] `src/lib/__tests__/shared/CommandList.test.ts` - Test all action commands render (New Transaction, Search, Adjust Budgets)
- [ ] `src/lib/__tests__/shared/CommandItem.test.ts` - Test keyboard shortcut hint displays on right side
- [ ] `src/lib/__tests__/utils/fuzzySearch.test.ts` - Test "bud" matches "Go to Budget"
- [ ] `src/lib/__tests__/utils/fuzzySearch.test.ts` - Test "trans" matches "Go to Transactions" and "New Transaction"
- [ ] `src/lib/__tests__/utils/fuzzySearch.test.ts` - Test empty search returns all commands
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test clicking command calls execute callback and closes palette
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test ArrowDown moves highlight to next command
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test ArrowUp moves highlight to previous command
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test Enter key executes highlighted command
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test first command is highlighted by default
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test Escape key closes palette without executing
- [ ] `src/lib/__tests__/shared/CommandPalette.test.ts` - Test clicking outside palette closes it

### Integration Tests
- [ ] `src/lib/__tests__/stores/commands.test.ts` - Test command registry returns all registered commands
- [ ] `src/lib/__tests__/stores/commands.test.ts` - Test executeCommand navigates to correct route

### E2E Tests
- [ ] `e2e/command-palette.spec.ts` - Test Cmd+K opens command palette from any view
- [ ] `e2e/command-palette.spec.ts` - Test typing "budget" and pressing Enter navigates to Budget view
- [ ] `e2e/command-palette.spec.ts` - Test full keyboard flow: Cmd+K -> type -> ArrowDown -> Enter
- [ ] `e2e/command-palette.spec.ts` - Test Escape closes palette and returns focus to previous element

## Implementation Notes

1. Create CommandPalette component
2. Use fuzzysort or similar for fuzzy matching
3. Register global ⌘K handler
4. Create command registry
5. Handle command execution

## Files to Create/Modify

- `src/lib/components/shared/CommandPalette.svelte`
- `src/lib/components/shared/CommandList.svelte`
- `src/lib/components/shared/CommandItem.svelte`
- `src/lib/stores/commands.ts` - command registry
- `src/lib/utils/fuzzySearch.ts`
- `src/routes/+layout.svelte` - global shortcut
