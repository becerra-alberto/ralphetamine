---
id: "6.3"
epic: 6
title: "Add Skip Onboarding Option"
status: pending
priority: medium
estimation: small
depends_on: ["6.1"]
frs: ["FR28"]
---

# Story 6.3: Add Skip Onboarding Option

## User Story

As a **first-time user**,
I want **to skip the onboarding wizard**,
So that **I can configure things manually later**.

## Technical Context

**Skip Behavior (from PRD Section 3.4.1):**
- Option to skip entire setup
- Can configure later
- Use defaults

## Acceptance Criteria

### AC1: Skip Link Visibility
**Given** the onboarding wizard is displayed
**When** any step is shown
**Then**:
- "Skip setup" link visible at bottom
- Styled as secondary action (muted text)
- Consistent position across all steps

### AC2: Skip Confirmation
**Given** user clicks "Skip setup"
**When** the action is triggered
**Then**:
- Confirmation dialog appears
- Title: "Skip setup?"
- Message: "You can configure these options later in Settings."
- Buttons: "Skip" and "Continue setup"

### AC3: Confirm Skip
**Given** confirmation dialog is shown
**When** user clicks "Skip"
**Then**:
- Wizard is dismissed
- onboarding_completed flag set to true
- User taken to Home dashboard
- Default settings applied

### AC4: Cancel Skip
**Given** confirmation dialog is shown
**When** user clicks "Continue setup"
**Then**:
- Dialog closes
- Wizard remains on current step
- No changes made

### AC5: Default Settings Applied
**Given** user skips setup
**When** defaults are applied
**Then**:
- All default categories enabled
- No accounts created
- No income set
- User can add everything manually later

### AC6: Settings Access
**Given** user skipped onboarding
**When** they want to configure later
**Then**:
- Settings accessible from sidebar (future)
- Or: prompt on dashboard to complete setup

## Test Definition

### Unit Tests
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test "Skip setup" link renders on Step 1
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test "Skip setup" link renders on Step 2
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test "Skip setup" link renders on Step 3
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test "Skip setup" link renders on Step 4
- [ ] `src/lib/__tests__/shared/ConfirmDialog.test.ts` - Test dialog renders with correct title and message
- [ ] `src/lib/__tests__/shared/ConfirmDialog.test.ts` - Test "Skip" button calls onConfirm callback
- [ ] `src/lib/__tests__/shared/ConfirmDialog.test.ts` - Test "Continue setup" button calls onCancel callback
- [ ] `src/lib/__tests__/onboarding/OnboardingWizard.test.ts` - Test clicking "Skip setup" opens confirmation dialog

### Integration Tests
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test skip_onboarding sets onboarding_completed to true
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test skip_onboarding applies default category settings
- [ ] `src-tauri/src/commands/preferences_test.rs` - Test skip_onboarding does not create any accounts

### E2E Tests
- [ ] `e2e/onboarding.spec.ts` - Test skip flow: Click "Skip setup" -> Confirm -> Dashboard displayed
- [ ] `e2e/onboarding.spec.ts` - Test cancel skip flow: Click "Skip setup" -> "Continue setup" -> Wizard remains
- [ ] `e2e/onboarding.spec.ts` - Test after skip, reopening app shows dashboard not wizard

## Implementation Notes

1. Add skip link to OnboardingWizard
2. Create confirmation dialog component
3. Apply sensible defaults on skip
4. Track that user skipped (for future prompts)

## Files to Create/Modify

- `src/lib/components/onboarding/OnboardingWizard.svelte` - add skip
- `src/lib/components/shared/ConfirmDialog.svelte`
- `src/lib/stores/onboarding.ts` - skip handling
