---
id: "6.7"
epic: 6
title: "Implement Global Keyboard Shortcuts"
status: done
priority: high
estimation: medium
depends_on: ["1.4"]
nfrs: ["NFR3"]
---

# Story 6.7: Implement Global Keyboard Shortcuts

## User Story

As a **power user**,
I want **keyboard shortcuts to work anywhere in the app**,
So that **I never need to reach for the mouse**.

## Technical Context

**Keyboard Shortcuts (from PRD Section 4.1 & 4.2):**
- Global shortcuts work everywhere
- Context-aware shortcuts in specific views
- Modal focus trapping

**NFR3:** Keyboard-first - every action accessible via keyboard

## Acceptance Criteria

### AC1: Navigation Shortcuts
**Given** the app is running (no modal open)
**When** navigation shortcuts are pressed
**Then**:
| Shortcut | Action |
|----------|--------|
| ⌘1 | Navigate to Home |
| ⌘2 | Navigate to Budget |
| ⌘3 | Navigate to Transactions |
| ⌘4 | Navigate to Net Worth |
| ⌘U | Navigate to Budget |
| ⌘T | Navigate to Transactions |
| ⌘W | Navigate to Net Worth |

### AC2: Action Shortcuts
**Given** the app is running
**When** action shortcuts are pressed
**Then**:
| Shortcut | Action |
|----------|--------|
| ⌘K | Open command palette |
| ⌘N | New transaction (focus quick-add) |
| ⌘F | Focus search (context-aware) |
| ⌘S | Save (if pending changes) |
| ⌘⇧B | Open budget adjustment modal |

### AC3: Universal Shortcuts
**Given** any context in the app
**When** universal shortcuts are pressed
**Then**:
| Shortcut | Action |
|----------|--------|
| Escape | Close modal / Cancel edit / Deselect |
| Enter | Confirm / Submit / Edit cell |
| Tab | Move to next field |
| ⇧Tab | Move to previous field |

### AC4: Modal Focus Trapping
**Given** a modal is open
**When** navigation shortcuts are pressed (⌘1-4, ⌘T, etc.)
**Then**:
- Shortcuts are blocked/ignored
- Modal retains focus
- Only modal-specific shortcuts work
- Escape closes modal

### AC5: Context-Aware Search
**Given** ⌘F is pressed
**When** in different views
**Then**:
- Budget view: focus budget search (if exists)
- Transactions view: focus transaction search
- Other views: open command palette or no action

### AC6: Shortcut Help
**Given** user wants to see all shortcuts
**When** they press ⌘? or ⌘/
**Then**:
- Keyboard shortcuts help panel opens
- Lists all available shortcuts
- Grouped by category

### AC7: No Conflict with OS
**Given** shortcuts are registered
**When** checking for conflicts
**Then**:
- ⌘Q, ⌘W (close), ⌘H (hide) left to OS
- App shortcuts don't override critical OS shortcuts
- ⌘W repurposed carefully (Net Worth, not close)

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+1 triggers navigation to Home
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+2 triggers navigation to Budget
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+3 triggers navigation to Transactions
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+4 triggers navigation to Net Worth
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+U triggers navigation to Budget
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+T triggers navigation to Transactions
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+W triggers navigation to Net Worth (not browser close)
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+K triggers command palette open
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+N triggers new transaction focus
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+? or Cmd+/ opens shortcuts help panel
- [ ] `src/lib/__tests__/stores/modals.test.ts` - Test when modal is open, isModalOpen returns true
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test navigation shortcuts are blocked when modal is open
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Escape still works when modal is open
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+Q is NOT captured (left to OS)
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test Cmd+H is NOT captured (left to OS)

### Integration Tests
- [ ] `src/lib/__tests__/stores/shortcuts.test.ts` - Test shortcut registry contains all expected shortcuts
- [ ] `src/lib/__tests__/stores/shortcuts.test.ts` - Test registerShortcut adds new shortcut to registry
- [ ] `src/lib/__tests__/stores/shortcuts.test.ts` - Test context-aware Cmd+F behavior in different views

### E2E Tests
- [ ] `e2e/shortcuts.spec.ts` - Test Cmd+T from Home navigates to Transactions
- [ ] `e2e/shortcuts.spec.ts` - Test Cmd+U from Transactions navigates to Budget
- [ ] `e2e/shortcuts.spec.ts` - Test Cmd+K from any view opens command palette
- [ ] `e2e/shortcuts.spec.ts` - Test Cmd+T is blocked when command palette modal is open
- [ ] `e2e/shortcuts.spec.ts` - Test Escape closes any open modal
- [ ] `e2e/shortcuts.spec.ts` - Test shortcuts work correctly in Tauri app context (not just browser)

## Implementation Notes

1. Create global keyboard listener
2. Use Svelte action or window event
3. Check for modifier keys (⌘, ⇧)
4. Prevent default browser behavior
5. Create shortcut registry
6. Handle modal focus state

## Files to Create/Modify

- `src/lib/actions/shortcuts.ts` - global shortcut handler
- `src/lib/stores/shortcuts.ts` - shortcut registry
- `src/lib/stores/modals.ts` - modal state tracking
- `src/routes/+layout.svelte` - register global listener
- `src/lib/components/shared/ShortcutsHelp.svelte` - help panel
