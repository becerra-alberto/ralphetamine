import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
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

	it('should show Step 2 Income when currentStep is 2', () => {
		render(OnboardingWizard, {
			props: { currentStep: 2, totalSteps: 4, selectedGoals: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-step2')).toBeTruthy();
		expect(screen.getByTestId('onboarding-wizard-step2-title').textContent).toBe(
			"What's your monthly income?"
		);
	});

	it('should show Step 3 Accounts when currentStep is 3', () => {
		render(OnboardingWizard, {
			props: { currentStep: 3, totalSteps: 4, selectedGoals: [], accounts: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-step3')).toBeTruthy();
		expect(screen.getByTestId('onboarding-wizard-step3-title').textContent).toBe(
			'Add your accounts'
		);
	});

	it('should show Step 4 Categories when currentStep is 4', () => {
		render(OnboardingWizard, {
			props: { currentStep: 4, totalSteps: 4, selectedGoals: [], disabledCategories: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-step4')).toBeTruthy();
		expect(screen.getByTestId('onboarding-wizard-step4-title').textContent).toBe(
			'Review your budget categories'
		);
	});

	it('should dispatch back event from Step 2 Back button', async () => {
		let backCalled = false;

		render(OnboardingWizard, {
			props: { currentStep: 2, totalSteps: 4, selectedGoals: [] },
			events: {
				back: () => {
					backCalled = true;
				}
			}
		} as any);

		const backBtn = screen.getByTestId('onboarding-wizard-step2-back');
		await fireEvent.click(backBtn);

		expect(backCalled).toBe(true);
	});

	it('should dispatch finish event from Step 4 Finish button', async () => {
		let finishCalled = false;

		render(OnboardingWizard, {
			props: { currentStep: 4, totalSteps: 4, selectedGoals: [], disabledCategories: [] },
			events: {
				finish: () => {
					finishCalled = true;
				}
			}
		} as any);

		const finishBtn = screen.getByTestId('onboarding-wizard-step4-finish');
		await fireEvent.click(finishBtn);

		expect(finishCalled).toBe(true);
	});

	it('should show skip confirmation dialog when Skip setup is clicked', async () => {
		render(OnboardingWizard, { props: {} });

		await fireEvent.click(screen.getByTestId('onboarding-wizard-skip'));

		expect(screen.getByText('Skip setup?')).toBeTruthy();
		expect(
			screen.getByText('You can configure these options later in Settings.')
		).toBeTruthy();
	});

	it('should dispatch skip event after confirming skip dialog', async () => {
		let skipCalled = false;

		render(OnboardingWizard, {
			props: {},
			events: {
				skip: () => {
					skipCalled = true;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('onboarding-wizard-skip'));
		await fireEvent.click(screen.getByTestId('onboarding-wizard-skip-confirm-confirm'));

		expect(skipCalled).toBe(true);
	});

	it('should close skip dialog when Continue setup is clicked', async () => {
		render(OnboardingWizard, { props: {} });

		await fireEvent.click(screen.getByTestId('onboarding-wizard-skip'));
		expect(screen.getByText('Skip setup?')).toBeTruthy();

		await fireEvent.click(screen.getByTestId('onboarding-wizard-skip-confirm-cancel'));

		await waitFor(() => {
			expect(screen.queryByTestId('onboarding-wizard-skip-confirm-message')).toBeNull();
		});
	});

	it('should show skip link on Step 2', () => {
		render(OnboardingWizard, {
			props: { currentStep: 2, totalSteps: 4, selectedGoals: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-skip')).toBeTruthy();
	});

	it('should show skip link on Step 3', () => {
		render(OnboardingWizard, {
			props: { currentStep: 3, totalSteps: 4, selectedGoals: [], accounts: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-skip')).toBeTruthy();
	});

	it('should show skip link on Step 4', () => {
		render(OnboardingWizard, {
			props: { currentStep: 4, totalSteps: 4, selectedGoals: [], disabledCategories: [] }
		});

		expect(screen.getByTestId('onboarding-wizard-skip')).toBeTruthy();
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

	it('should dispatch back event from Step 3 Back button', async () => {
		let backCalled = false;

		render(OnboardingWizard, {
			props: { currentStep: 3, totalSteps: 4, accounts: [] },
			events: {
				back: () => {
					backCalled = true;
				}
			}
		} as any);

		const backBtn = screen.getByTestId('onboarding-wizard-step3-back');
		await fireEvent.click(backBtn);

		expect(backCalled).toBe(true);
	});

	it('should dispatch back event from Step 4 Back button', async () => {
		let backCalled = false;

		render(OnboardingWizard, {
			props: { currentStep: 4, totalSteps: 4, disabledCategories: [] },
			events: {
				back: () => {
					backCalled = true;
				}
			}
		} as any);

		const backBtn = screen.getByTestId('onboarding-wizard-step4-back');
		await fireEvent.click(backBtn);

		expect(backCalled).toBe(true);
	});

	it('should preserve previous selections when navigating back to Step 1', () => {
		render(OnboardingWizard, {
			props: {
				currentStep: 1,
				selectedGoals: ['emergency_fund', 'track_spending']
			}
		});

		const checkbox1 = screen.getByTestId(
			'onboarding-wizard-step1-checkbox-emergency_fund'
		) as HTMLInputElement;
		const checkbox2 = screen.getByTestId(
			'onboarding-wizard-step1-checkbox-track_spending'
		) as HTMLInputElement;

		expect(checkbox1.checked).toBe(true);
		expect(checkbox2.checked).toBe(true);
	});

	it('should preserve income when navigating back to Step 2', () => {
		render(OnboardingWizard, {
			props: {
				currentStep: 2,
				monthlyIncomeCents: 350000
			}
		});

		// Step 2 should be rendered with preserved income data
		expect(screen.getByTestId('onboarding-wizard-step2')).toBeTruthy();
		const input = screen.getByTestId('onboarding-wizard-step2-input') as HTMLInputElement;
		expect(input.value).toBeTruthy();
	});
});
