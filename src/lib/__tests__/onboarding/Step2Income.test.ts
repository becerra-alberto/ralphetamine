import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Step2Income from '../../components/onboarding/Step2Income.svelte';

describe('Step2Income', () => {
	it('should render title', () => {
		render(Step2Income, { props: {} });
		expect(screen.getByTestId('step2-income-title').textContent).toBe(
			"What's your monthly income?"
		);
	});

	it('should render subtitle', () => {
		render(Step2Income, { props: {} });
		expect(screen.getByTestId('step2-income-subtitle').textContent).toContain(
			'An estimate helps us suggest budgets'
		);
	});

	it('should render income input', () => {
		render(Step2Income, { props: {} });
		expect(screen.getByTestId('step2-income-input')).toBeTruthy();
	});

	it('should render preset buttons', () => {
		render(Step2Income, { props: {} });
		expect(screen.getByTestId('step2-income-presets')).toBeTruthy();
		expect(screen.getByTestId('step2-income-preset-200000')).toBeTruthy();
		expect(screen.getByTestId('step2-income-preset-350000')).toBeTruthy();
		expect(screen.getByTestId('step2-income-preset-500000')).toBeTruthy();
		expect(screen.getByTestId('step2-income-preset-750000')).toBeTruthy();
	});

	it('should dispatch setIncome on preset click', async () => {
		let incomeCents: number | null = null;

		render(Step2Income, {
			props: {},
			events: {
				setIncome: (event: CustomEvent) => {
					incomeCents = event.detail.incomeCents;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('step2-income-preset-350000'));
		expect(incomeCents).toBe(350000);
	});

	it('should populate input on preset click', async () => {
		render(Step2Income, { props: {} });

		await fireEvent.click(screen.getByTestId('step2-income-preset-500000'));

		const input = screen.getByTestId('step2-income-input') as HTMLInputElement;
		expect(input.value).toBe('5000.00');
	});

	it('should show error for empty input on Next click', async () => {
		render(Step2Income, { props: {} });

		await fireEvent.click(screen.getByTestId('step2-income-next'));

		expect(screen.getByTestId('step2-income-error')).toBeTruthy();
	});

	it('should have Back button', () => {
		render(Step2Income, { props: {} });
		expect(screen.getByTestId('step2-income-back')).toBeTruthy();
	});

	it('should dispatch back event', async () => {
		let backCalled = false;

		render(Step2Income, {
			props: {},
			events: {
				back: () => {
					backCalled = true;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('step2-income-back'));
		expect(backCalled).toBe(true);
	});

	it('should accept custom testId', () => {
		render(Step2Income, { props: { testId: 'custom-income' } });
		expect(screen.getByTestId('custom-income')).toBeTruthy();
	});
});
