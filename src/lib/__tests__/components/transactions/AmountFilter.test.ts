import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AmountFilter from '../../../components/transactions/AmountFilter.svelte';

describe('AmountFilter', () => {
	it('should render min and max inputs that accept currency-formatted values', () => {
		render(AmountFilter, {
			props: {
				minAmount: 1000,  // $10.00 in cents
				maxAmount: 50000  // $500.00 in cents
			}
		});

		const minInput = screen.getByTestId('amount-min') as HTMLInputElement;
		const maxInput = screen.getByTestId('amount-max') as HTMLInputElement;

		// Inputs exist and show dollar values
		expect(minInput).toBeTruthy();
		expect(maxInput).toBeTruthy();
		expect(minInput.value).toBe('10.00');
		expect(maxInput.value).toBe('500.00');

		// Inputs use decimal inputmode for currency entry
		expect(minInput.getAttribute('inputmode')).toBe('decimal');
		expect(maxInput.getAttribute('inputmode')).toBe('decimal');
	});

	it('should convert dollars to cents for filter values (display dollars, store cents)', async () => {
		let lastChange: { min: number | null; max: number | null } | null = null;
		render(AmountFilter, {
			props: {
				minAmount: null,
				maxAmount: null
			},
			events: {
				change: (event: CustomEvent<{ min: number | null; max: number | null }>) => {
					lastChange = event.detail;
				}
			}
		});

		// Type a dollar value into the min input
		const minInput = screen.getByTestId('amount-min') as HTMLInputElement;
		await fireEvent.change(minInput, { target: { value: '25.50' } });

		// The dispatched event should contain cents (25.50 * 100 = 2550)
		expect(lastChange).not.toBeNull();
		expect(lastChange!.min).toBe(2550);
		expect(lastChange!.max).toBeNull();

		// Type a dollar value into the max input
		const maxInput = screen.getByTestId('amount-max') as HTMLInputElement;
		await fireEvent.change(maxInput, { target: { value: '100.00' } });

		// The dispatched event should contain cents (100.00 * 100 = 10000)
		expect(lastChange!.max).toBe(10000);
	});

	it('should show validation error when min amount is greater than max amount', () => {
		render(AmountFilter, {
			props: {
				minAmount: 50000,  // $500.00 in cents
				maxAmount: 1000    // $10.00 in cents
			}
		});

		const error = screen.getByTestId('amount-validation-error');
		expect(error).toBeTruthy();
		expect(error.textContent).toContain('Min must be less than or equal to max');

		// Error element should have role="alert" for accessibility
		expect(error.getAttribute('role')).toBe('alert');
	});

	it('should render inputs with placeholder "0.00"', () => {
		render(AmountFilter, {
			props: {
				minAmount: null,
				maxAmount: null
			}
		});

		const minInput = screen.getByTestId('amount-min') as HTMLInputElement;
		const maxInput = screen.getByTestId('amount-max') as HTMLInputElement;

		expect(minInput.placeholder).toBe('0.00');
		expect(maxInput.placeholder).toBe('0.00');
	});

	it('should show empty inputs when values are null', () => {
		render(AmountFilter, {
			props: {
				minAmount: null,
				maxAmount: null
			}
		});

		const minInput = screen.getByTestId('amount-min') as HTMLInputElement;
		const maxInput = screen.getByTestId('amount-max') as HTMLInputElement;

		// Null values should result in empty string display
		expect(minInput.value).toBe('');
		expect(maxInput.value).toBe('');

		// No validation error should appear
		expect(screen.queryByTestId('amount-validation-error')).toBeNull();
	});
});
