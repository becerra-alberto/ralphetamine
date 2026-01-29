---
id: "1.5"
epic: 1
title: "Setup SvelteKit Routing for Main Views"
status: pending
priority: high
estimation: small
depends_on: ["1.4"]
---

# Story 1.5: Setup SvelteKit Routing for Main Views

## User Story

As a **developer**,
I want **routes configured for all main views**,
So that **deep linking and navigation work correctly**.

## Technical Context

**SvelteKit Routing:**
- File-based routing in `src/routes/`
- Each route gets its own `+page.svelte`
- Layout inheritance from `+layout.svelte`

**View Structure (from PRD Section 3):**
- Home/Dashboard: Onboarding or quick overview
- Budget: Spreadsheet-style monthly budget table
- Transactions: List-based transaction management
- Net Worth: Assets/liabilities tracker

## Acceptance Criteria

### AC1: Home Route
**Given** the SvelteKit app is running
**When** the user navigates to `/`
**Then** the Home component renders
**And** displays placeholder text "Home Dashboard"
**And** page title is "Stackz - Home"

### AC2: Budget Route
**Given** the SvelteKit app is running
**When** the user navigates to `/budget`
**Then** the Budget component renders
**And** displays placeholder text "Budget View"
**And** page title is "Stackz - Budget"

### AC3: Transactions Route
**Given** the SvelteKit app is running
**When** the user navigates to `/transactions`
**Then** the Transactions component renders
**And** displays placeholder text "Transactions View"
**And** page title is "Stackz - Transactions"

### AC4: Net Worth Route
**Given** the SvelteKit app is running
**When** the user navigates to `/net-worth`
**Then** the NetWorth component renders
**And** displays placeholder text "Net Worth View"
**And** page title is "Stackz - Net Worth"

### AC5: Browser Navigation Works
**Given** the user has navigated between views
**When** the browser back button is pressed
**Then** the previous view renders correctly
**And** the sidebar active state updates

### AC6: 404 Handling
**Given** the user navigates to an unknown route
**When** the route doesn't exist (e.g., `/unknown`)
**Then** a 404 page renders
**And** displays "Page not found"
**And** provides link back to Home

### AC7: Route Accessible from Sidebar
**Given** all routes are configured
**When** sidebar navigation is used
**Then** each route is reachable via sidebar click
**And** no page refresh occurs (SPA navigation)

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/routes/home.test.ts` - Test Home page component renders "Home Dashboard" text
- [ ] `src/lib/__tests__/routes/budget.test.ts` - Test Budget page component renders "Budget View" text
- [ ] `src/lib/__tests__/routes/transactions.test.ts` - Test Transactions page component renders "Transactions View" text
- [ ] `src/lib/__tests__/routes/net-worth.test.ts` - Test Net Worth page component renders "Net Worth View" text
- [ ] `src/lib/__tests__/routes/error.test.ts` - Test Error page component renders "Page not found" text
- [ ] `src/lib/__tests__/routes/error.test.ts` - Test Error page contains link to Home route

### Component Tests (Vitest + Testing Library)
- [ ] `src/lib/__tests__/routes/home.test.ts` - Test Home page sets document title to "Stackz - Home"
- [ ] `src/lib/__tests__/routes/budget.test.ts` - Test Budget page sets document title to "Stackz - Budget"
- [ ] `src/lib/__tests__/routes/transactions.test.ts` - Test Transactions page sets document title to "Stackz - Transactions"
- [ ] `src/lib/__tests__/routes/net-worth.test.ts` - Test Net Worth page sets document title to "Stackz - Net Worth"

### E2E Tests
- [ ] `e2e/routing.spec.ts` - Test navigating to `/` renders Home component with correct content
- [ ] `e2e/routing.spec.ts` - Test navigating to `/budget` renders Budget component with correct content
- [ ] `e2e/routing.spec.ts` - Test navigating to `/transactions` renders Transactions component with correct content
- [ ] `e2e/routing.spec.ts` - Test navigating to `/net-worth` renders Net Worth component with correct content
- [ ] `e2e/routing.spec.ts` - Test page title updates to "Stackz - Home" on Home route
- [ ] `e2e/routing.spec.ts` - Test page title updates to "Stackz - Budget" on Budget route
- [ ] `e2e/routing.spec.ts` - Test page title updates to "Stackz - Transactions" on Transactions route
- [ ] `e2e/routing.spec.ts` - Test page title updates to "Stackz - Net Worth" on Net Worth route
- [ ] `e2e/routing.spec.ts` - Test browser back button navigates to previous view
- [ ] `e2e/routing.spec.ts` - Test browser forward button navigates to next view in history
- [ ] `e2e/routing.spec.ts` - Test navigating to `/unknown` shows 404 page
- [ ] `e2e/routing.spec.ts` - Test 404 page "Home" link navigates back to `/`
- [ ] `e2e/routing.spec.ts` - Test SPA navigation does not trigger full page refresh (check for network request absence)
- [ ] `e2e/routing.spec.ts` - Test sidebar active state updates when route changes via direct URL

## Implementation Notes

1. Create route directories in `src/routes/`
2. Each view gets placeholder content initially
3. Use `<svelte:head>` for page titles
4. Create `+error.svelte` for 404 handling
5. Ensure prerendering is disabled (dynamic app)

## Files to Create/Modify

- `src/routes/+page.svelte` - Home view
- `src/routes/budget/+page.svelte` - Budget view
- `src/routes/transactions/+page.svelte` - Transactions view
- `src/routes/net-worth/+page.svelte` - Net Worth view
- `src/routes/+error.svelte` - Error/404 page
- `src/routes/+layout.ts` - disable prerendering
