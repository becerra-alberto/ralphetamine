import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard.svelte';

describe('OnboardingWizard', () => {
	it('should render wizard overlay', () => {
		render(OnboardingWizard, { props: {} });

		expect(screen.getByTestId('onboarding-wizard')).toBeTruthy();
	});

	it('should show step indicator', () => {
		render(OnboardingWizard, { props: {} });

		expect(screen.getByTestId('onboarding-wizard-indicator')).toBeTruthy();
		expect(screen.getByTestId('onboarding-wizard-indicator-text').textContent).toBe(
			'Step 1 of 4'
		);
	});

	it('should show Skip setup link', () => {
		render(OnboardingWizard, { props: {} });

		const skipBtn = screen.getByTestId('onboarding-wizard-skip');
		expect(skipBtn).toBeTruthy();
		expect(skipBtn.textContent?.trim()).toBe('Skip setup');
	});

	it('should show Step 1 Goals when currentStep is 1', () => {
		render(OnboardingWizard, {
			props: { currentStep: 1, totalSteps: 4, selectedGoals: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-step1')).toBeTruthy();
	});

	it('should show Step 2 placeholder when currentStep is 2', () => {
		render(OnboardingWizard, {
			props: { currentStep: 2, totalSteps: 4, selectedGoals: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-step2')).toBeTruthy();
	});

	it('should dispatch skip event when Skip setup is clicked', async () => {
		let skipCalled = false;

		render(OnboardingWizard, {
			props: {},
			events: {
				skip: () => {
					skipCalled = true;
				}
			}
		} as any);

		const skipBtn = screen.getByTestId('onboarding-wizard-skip');
		await fireEvent.click(skipBtn);

		expect(skipCalled).toBe(true);
	});

	it('should dispatch toggleGoal event from Step1', async () => {
		let toggledGoalId: string | null = null;

		render(OnboardingWizard, {
			props: { currentStep: 1, selectedGoals: [] },
			events: {
				toggleGoal: (event: CustomEvent) => {
					toggledGoalId = event.detail.goalId;
				}
			}
		} as any);

		const checkbox = screen.getByTestId('onboarding-wizard-step1-checkbox-emergency_fund');
		await fireEvent.click(checkbox);

		expect(toggledGoalId).toBe('emergency_fund');
	});

	it('should dispatch next event from Step1 Next button', async () => {
		let nextCalled = false;

		render(OnboardingWizard, {
			props: { currentStep: 1, selectedGoals: [] },
			events: {
				next: () => {
					nextCalled = true;
				}
			}
		} as any);

		const nextBtn = screen.getByTestId('onboarding-wizard-step1-next');
		await fireEvent.click(nextBtn);

		expect(nextCalled).toBe(true);
	});

	it('should accept custom testId', () => {
		render(OnboardingWizard, {
			props: { testId: 'custom-wizard' }
		});

		expect(screen.getByTestId('custom-wizard')).toBeTruthy();
		expect(screen.getByTestId('custom-wizard-container')).toBeTruthy();
	});
});
