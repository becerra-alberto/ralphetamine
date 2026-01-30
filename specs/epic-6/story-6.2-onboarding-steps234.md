---
id: "6.2"
epic: 6
title: "Create Onboarding Wizard - Steps 2-4"
status: done
priority: medium
estimation: large
depends_on: ["6.1"]
frs: ["FR27"]
---

# Story 6.2: Create Onboarding Wizard - Steps 2-4

## User Story

As a **first-time user**,
I want **to complete basic setup through the wizard**,
So that **I can start using the app quickly**.

## Technical Context

**Remaining Steps (from PRD Section 3.4.1):**
- Step 2: Monthly income estimate
- Step 3: Account connection/setup
- Step 4: Category review

## Acceptance Criteria

### AC1: Step 2 - Monthly Income
**Given** user completes Step 1 and clicks Next
**When** Step 2 displays
**Then** shows:
- Title: "What's your monthly income?"
- Subtitle: "An estimate helps us suggest budgets"
- Currency input field (€)
- Common presets: €2,000 | €3,500 | €5,000 | €7,500
- "Next" button

### AC2: Income Input
**Given** Step 2 is displayed
**When** user enters income
**Then**:
- Accepts numeric input
- Currency formatting applied
- Preset buttons fill the input
- Validation: must be > 0

### AC3: Step 3 - Account Setup
**Given** user completes Step 2
**When** Step 3 displays
**Then** shows:
- Title: "Add your accounts"
- Subtitle: "Where do you keep your money?"
- Option to add accounts manually
- "Skip for now" option

### AC4: Manual Account Addition
**Given** Step 3 is displayed
**When** user clicks "Add account"
**Then**:
- Inline form appears
- Fields: Name, Type (dropdown), Balance
- "Add" button saves account
- Can add multiple accounts
- List shows added accounts

### AC5: Step 4 - Category Review
**Given** user completes Step 3
**When** Step 4 displays
**Then** shows:
- Title: "Review your budget categories"
- Subtitle: "Toggle categories you don't need"
- List of default categories by section
- Toggle switches to enable/disable

### AC6: Category Toggles
**Given** category list is displayed
**When** user toggles a category
**Then**:
- Category enabled/disabled
- Disabled categories won't appear in budget view
- Can re-enable later in settings

### AC7: Finish Wizard
**Given** Step 4 is displayed
**When** user clicks "Finish" button
**Then**:
- All preferences saved
- onboarding_completed flag set
- Navigate to Home dashboard
- Welcome toast: "Welcome to Stackz!"

### AC8: Back Navigation
**Given** any step after Step 1
**When** user clicks "Back"
**Then**:
- Navigate to previous step
- Previous selections preserved

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/onboarding/Step2Income.test.ts` - Test income input accepts numeric values only
- [ ] `src/lib/__tests__/onboarding/Step2Income.test.ts` - Test currency formatting applies correctly (EUR symbol, thousands separator)
- [ ] `src/lib/__tests__/onboarding/Step2Income.test.ts` - Test preset buttons (2000, 3500, 5000, 7500) populate input field
- [ ] `src/lib/__tests__/onboarding/Step2Income.test.ts` - Test validation shows error when income is 0 or negative
- [ ] `src/lib/__tests__/onboarding/Step3Accounts.test.ts` - Test "Add account" button reveals inline form
- [ ] `src/lib/__tests__/onboarding/Step3Accounts.test.ts` - Test account form has Name, Type dropdown, and Balance fields
- [ ] `src/lib/__tests__/onboarding/Step3Accounts.test.ts` - Test adding account appends to visible list
- [ ] `src/lib/__tests__/onboarding/Step3Accounts.test.ts` - Test "Skip for now" button advances to Step 4
- [ ] `src/lib/__tests__/onboarding/Step4Categories.test.ts` - Test default categories display grouped by section
- [ ] `src/lib/__tests__/onboarding/Step4Categories.test.ts` - Test toggle switch disables/enables category
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test Back button navigates to previous step
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test Back button preserves previous selections

### Integration Tests
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test save_monthly_income stores value as cents in database
- [ ] `src-tauri/src/commands/accounts_test.rs` - Test create_account_from_onboarding creates account record
- [ ] `src-tauri/src/commands/categories_test.rs` - Test update_category_visibility sets is_visible flag
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test complete_onboarding sets onboarding_completed to true

### E2E Tests
- [ ] `e2e/onboarding.spec.ts` - Test full wizard flow: Step 1 -> 2 -> 3 -> 4 -> Dashboard
- [ ] `e2e/onboarding.spec.ts` - Test Finish button shows "Welcome to Stackz!" toast
- [ ] `e2e/onboarding.spec.ts` - Test wizard data persists across step navigation

## Implementation Notes

1. Create Step2Income, Step3Accounts, Step4Categories components
2. Store preferences progressively
3. Create account from wizard
4. Update categories with is_visible flag
5. Set onboarding_completed on finish

## Files to Create/Modify

- `src/lib/components/onboarding/Step2Income.svelte`
- `src/lib/components/onboarding/Step3Accounts.svelte`
- `src/lib/components/onboarding/Step4Categories.svelte`
- `src/lib/components/onboarding/OnboardingWizard.svelte` - navigation
- `src-tauri/src/commands/preferences.rs`
