---
id: "1.4"
epic: 1
title: "Implement App Shell with Sidebar Navigation"
status: pending
priority: high
estimation: medium
depends_on: ["1.1"]
---

# Story 1.4: Implement App Shell with Sidebar Navigation

## User Story

As a **user**,
I want **a sidebar navigation with main view icons**,
So that **I can navigate between Budget, Transactions, Net Worth, and Home views**.

## Technical Context

**Design System (from PRD Section 6):**
- Typography: Inter / SF Pro Display
- Spacing: 4px base unit (8, 12, 16, 24, 32px increments)
- Component padding: 12-16px
- Colors: Use design tokens from Story 1.1

**Keyboard Navigation (from PRD Section 4):**
- Cmd+1: Home
- Cmd+2: Budget
- Cmd+3: Transactions
- Cmd+4: Net Worth

## Acceptance Criteria

### AC1: App Shell Layout
**Given** the app is running
**When** the main window renders
**Then** the layout displays:
- Fixed sidebar on the left (width: 64px collapsed, 200px expanded)
- Main content area filling remaining space
- Proper spacing using design system tokens

### AC2: Sidebar Navigation Items
**Given** the sidebar renders
**When** navigation items are displayed
**Then** the sidebar shows:
- Stackz logo/icon at top (clickable, goes to Home)
- Home navigation item with icon
- Budget navigation item with icon
- Transactions navigation item with icon
- Net Worth navigation item with icon
- Each item has tooltip on hover (when collapsed)

### AC3: Active State Indication
**Given** the user is on a specific view
**When** the sidebar renders
**Then** the active navigation item is visually highlighted:
- Background color change (accent color with low opacity)
- Icon/text color change
- Left border indicator

### AC4: Click Navigation Works
**Given** a navigation item is displayed
**When** the user clicks the item
**Then** the URL updates to the corresponding route
**And** the main content area shows the selected view
**And** the sidebar item becomes highlighted

### AC5: Keyboard Navigation Works
**Given** the app is running
**When** the user presses Cmd+1 through Cmd+4
**Then** navigation switches to:
- Cmd+1: Home (/)
- Cmd+2: Budget (/budget)
- Cmd+3: Transactions (/transactions)
- Cmd+4: Net Worth (/net-worth)

### AC6: Responsive Behavior
**Given** the window is resized
**When** width < 800px
**Then** sidebar collapses to icon-only mode (64px)
**And** navigation still works via icons

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/components/Sidebar.test.ts` - Test Sidebar renders 4 navigation items (Home, Budget, Transactions, Net Worth)
- [ ] `src/lib/__tests__/components/Sidebar.test.ts` - Test Sidebar renders Stackz logo at top
- [ ] `src/lib/__tests__/components/NavItem.test.ts` - Test NavItem renders icon and label
- [ ] `src/lib/__tests__/components/NavItem.test.ts` - Test NavItem applies active class when `active` prop is true
- [ ] `src/lib/__tests__/components/NavItem.test.ts` - Test NavItem emits click event with correct route
- [ ] `src/lib/__tests__/stores/navigation.test.ts` - Test navigation store tracks current route
- [ ] `src/lib/__tests__/stores/navigation.test.ts` - Test navigation store updates when route changes
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test shortcuts action registers keyboard listeners
- [ ] `src/lib/__tests__/actions/shortcuts.test.ts` - Test shortcuts action cleans up listeners on destroy

### Component Tests (Vitest + Testing Library)
- [ ] `src/lib/__tests__/components/AppShell.test.ts` - Test AppShell renders sidebar and main content area
- [ ] `src/lib/__tests__/components/AppShell.test.ts` - Test AppShell layout has correct flexbox structure
- [ ] `src/lib/__tests__/components/Sidebar.test.ts` - Test collapsed sidebar width is 64px
- [ ] `src/lib/__tests__/components/Sidebar.test.ts` - Test expanded sidebar width is 200px
- [ ] `src/lib/__tests__/components/Sidebar.test.ts` - Test active nav item has accent background color
- [ ] `src/lib/__tests__/components/Sidebar.test.ts` - Test active nav item has left border indicator

### E2E Tests
- [ ] `e2e/navigation.spec.ts` - Test clicking Home nav item navigates to `/`
- [ ] `e2e/navigation.spec.ts` - Test clicking Budget nav item navigates to `/budget`
- [ ] `e2e/navigation.spec.ts` - Test clicking Transactions nav item navigates to `/transactions`
- [ ] `e2e/navigation.spec.ts` - Test clicking Net Worth nav item navigates to `/net-worth`
- [ ] `e2e/navigation.spec.ts` - Test clicking Stackz logo navigates to Home
- [ ] `e2e/navigation.spec.ts` - Test Cmd+1 keyboard shortcut navigates to Home
- [ ] `e2e/navigation.spec.ts` - Test Cmd+2 keyboard shortcut navigates to Budget
- [ ] `e2e/navigation.spec.ts` - Test Cmd+3 keyboard shortcut navigates to Transactions
- [ ] `e2e/navigation.spec.ts` - Test Cmd+4 keyboard shortcut navigates to Net Worth
- [ ] `e2e/navigation.spec.ts` - Test sidebar collapses when window width < 800px
- [ ] `e2e/navigation.spec.ts` - Test tooltip appears on hover when sidebar is collapsed

## Implementation Notes

1. Create `AppShell.svelte` as root layout component
2. Create `Sidebar.svelte` component
3. Use Svelte stores for active route tracking
4. Register global keyboard shortcuts in root layout
5. Use CSS transitions for collapse animation

## Files to Create/Modify

- `src/routes/+layout.svelte` - root layout with app shell
- `src/lib/components/AppShell.svelte` - shell wrapper
- `src/lib/components/Sidebar.svelte` - navigation sidebar
- `src/lib/components/NavItem.svelte` - individual nav item
- `src/lib/stores/navigation.ts` - navigation state
- `src/lib/actions/shortcuts.ts` - keyboard shortcut action
