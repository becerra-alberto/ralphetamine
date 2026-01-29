---
id: "6.1"
epic: 6
title: "Create Onboarding Wizard - Step 1: Goals"
status: pending
priority: medium
estimation: medium
depends_on: ["1.5"]
frs: ["FR27"]
---

# Story 6.1: Create Onboarding Wizard - Step 1: Goals

## User Story

As a **first-time user**,
I want **to set my financial goals during setup**,
So that **the app can be tailored to my needs**.

## Technical Context

**Onboarding (from PRD Section 3.4.1):**
- Four-step wizard
- Goals selection first
- Can skip entire setup

**Goals Options:**
- Emergency fund
- Debt payoff
- Save for goal
- Track spending
- Monitor net worth

## Acceptance Criteria

### AC1: First Launch Detection
**Given** the app launches
**When** checking for first-time user
**Then**:
- Check for user_preferences or onboarding_completed flag
- If not found: show onboarding
- If found: show returning user dashboard

### AC2: Wizard Container
**Given** onboarding should display
**When** the wizard renders
**Then**:
- Full-screen or modal wizard
- Step indicator (1/4, 2/4, etc.)
- Skip setup link visible

### AC3: Step 1 Content
**Given** Step 1 displays
**When** goals selection renders
**Then** shows:
- Title: "What are your financial goals?"
- Subtitle: "Select all that apply"
- Checkbox options for each goal

### AC4: Goal Options
**Given** goals are displayed
**When** options render
**Then** shows checkboxes for:
- [ ] Build emergency fund
- [ ] Pay off debt
- [ ] Save for a specific goal
- [ ] Track my spending
- [ ] Monitor my net worth
- Multiple selections allowed

### AC5: Selection Interaction
**Given** goal options are displayed
**When** user clicks a goal
**Then**:
- Checkbox toggles
- Visual feedback (highlight)
- No minimum selection required

### AC6: Next Button
**Given** Step 1 is displayed
**When** user clicks "Next"
**Then**:
- Selections saved to user preferences
- Navigate to Step 2
- Animate transition

### AC7: Progress Indicator
**Given** the wizard is displayed
**When** on Step 1
**Then**:
- Shows "Step 1 of 4"
- Progress bar at 25%
- Or: dot indicators with first active

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test wizard renders when onboarding_completed flag is false
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test wizard does NOT render when onboarding_completed flag is true
- [ ] `src/lib/__tests__/onboarding/Step1Goals.test.ts` - Test all 5 goal checkboxes render with correct labels
- [ ] `src/lib/__tests__/onboarding/Step1Goals.test.ts` - Test clicking checkbox toggles selection state
- [ ] `src/lib/__tests__/onboarding/Step1Goals.test.ts` - Test multiple checkboxes can be selected simultaneously
- [ ] `src/lib/__tests__/onboarding/Step1Goals.test.ts` - Test Next button is always enabled (no minimum selection)
- [ ] `src/lib/__tests__/onboarding/StepIndicator.test.ts` - Test indicator shows "Step 1 of 4" or 25% progress

### Integration Tests
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test check_first_launch returns true when no user_preferences exist
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test check_first_launch returns false after onboarding_completed is set
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test save_user_goals stores selected goals in database

### E2E Tests
- [ ] `e2e/onboarding.spec.ts` - Test fresh app launch shows onboarding wizard
- [ ] `e2e/onboarding.spec.ts` - Test selecting goals and clicking Next advances to Step 2
- [ ] `e2e/onboarding.spec.ts` - Test step progression animates smoothly

## Implementation Notes

1. Create OnboardingWizard component
2. Create user_preferences table
3. Store onboarding_completed flag
4. Create Step1Goals component
5. Use Svelte transitions for step changes

## Files to Create/Modify

- `src-tauri/src/db/migrations/005_user_preferences.sql`
- `src/lib/components/onboarding/OnboardingWizard.svelte`
- `src/lib/components/onboarding/Step1Goals.svelte`
- `src/lib/components/onboarding/StepIndicator.svelte`
- `src/lib/stores/onboarding.ts`
- `src/routes/+page.svelte` - check for onboarding
