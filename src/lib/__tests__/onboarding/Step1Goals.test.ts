import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Step1Goals from '../../components/onboarding/Step1Goals.svelte';

describe('Step1Goals', () => {
	it('should render title "What are your financial goals?"', () => {
		render(Step1Goals, { props: {} });

		const title = screen.getByTestId('step1-goals-title');
		expect(title.textContent).toBe('What are your financial goals?');
	});

	it('should render subtitle "Select all that apply"', () => {
		render(Step1Goals, { props: {} });

		const subtitle = screen.getByTestId('step1-goals-subtitle');
		expect(subtitle.textContent).toBe('Select all that apply');
	});

	it('should render all 5 goal checkboxes', () => {
		render(Step1Goals, { props: {} });

		expect(screen.getByTestId('step1-goals-option-emergency_fund')).toBeTruthy();
		expect(screen.getByTestId('step1-goals-option-debt_payoff')).toBeTruthy();
		expect(screen.getByTestId('step1-goals-option-save_goal')).toBeTruthy();
		expect(screen.getByTestId('step1-goals-option-track_spending')).toBeTruthy();
		expect(screen.getByTestId('step1-goals-option-monitor_net_worth')).toBeTruthy();
	});

	it('should render correct labels for each goal', () => {
		render(Step1Goals, { props: {} });

		expect(screen.getByTestId('step1-goals-option-emergency_fund').textContent).toContain(
			'Build emergency fund'
		);
		expect(screen.getByTestId('step1-goals-option-debt_payoff').textContent).toContain(
			'Pay off debt'
		);
		expect(screen.getByTestId('step1-goals-option-save_goal').textContent).toContain(
			'Save for a specific goal'
		);
		expect(screen.getByTestId('step1-goals-option-track_spending').textContent).toContain(
			'Track my spending'
		);
		expect(screen.getByTestId('step1-goals-option-monitor_net_worth').textContent).toContain(
			'Monitor my net worth'
		);
	});

	it('should dispatch toggleGoal event when checkbox clicked', async () => {
		let toggledGoalId: string | null = null;

		render(Step1Goals, {
			props: {},
			events: {
				toggleGoal: (event: CustomEvent) => {
					toggledGoalId = event.detail.goalId;
				}
			}
		} as any);

		const checkbox = screen.getByTestId('step1-goals-checkbox-emergency_fund');
		await fireEvent.click(checkbox);

		expect(toggledGoalId).toBe('emergency_fund');
	});

	it('should allow multiple checkboxes to be selected', () => {
		render(Step1Goals, {
			props: { selectedGoals: ['emergency_fund', 'track_spending'] }
		});

		const checkbox1 = screen.getByTestId(
			'step1-goals-checkbox-emergency_fund'
		) as HTMLInputElement;
		const checkbox2 = screen.getByTestId(
			'step1-goals-checkbox-track_spending'
		) as HTMLInputElement;

		expect(checkbox1.checked).toBe(true);
		expect(checkbox2.checked).toBe(true);
	});

	it('should have Next button always enabled', () => {
		render(Step1Goals, { props: {} });

		const nextBtn = screen.getByTestId('step1-goals-next');
		expect(nextBtn).toBeTruthy();
		expect((nextBtn as HTMLButtonElement).disabled).toBe(false);
	});

	it('should dispatch next event when Next is clicked', async () => {
		let nextCalled = false;

		render(Step1Goals, {
			props: {},
			events: {
				next: () => {
					nextCalled = true;
				}
			}
		} as any);

		const nextBtn = screen.getByTestId('step1-goals-next');
		await fireEvent.click(nextBtn);

		expect(nextCalled).toBe(true);
	});

	it('should show selected state for goals in selectedGoals array', () => {
		render(Step1Goals, {
			props: { selectedGoals: ['debt_payoff'] }
		});

		const option = screen.getByTestId('step1-goals-option-debt_payoff');
		expect(option.classList.contains('selected')).toBe(true);
	});

	it('should accept custom testId', () => {
		render(Step1Goals, {
			props: { testId: 'custom-goals' }
		});

		expect(screen.getByTestId('custom-goals')).toBeTruthy();
		expect(screen.getByTestId('custom-goals-title')).toBeTruthy();
	});
});
