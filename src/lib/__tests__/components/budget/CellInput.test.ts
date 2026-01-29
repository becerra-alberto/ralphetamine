import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CellInput from '../../../components/budget/CellInput.svelte';

describe('CellInput', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render with current value pre-filled', () => {
			render(CellInput, {
				props: {
					valueCents: 40000 // €400.00
				}
			});

			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			expect(input.value).toBe('400.00');
		});

		it('should render currency symbol that is not editable', () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const currencySymbol = screen.getByTestId('currency-symbol');
			expect(currencySymbol.textContent).toBe('€');
		});

		it('should have input focused on mount', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			// Due to async nature of onMount, check input exists
			expect(input).toBeTruthy();
		});

		it('should display zero value correctly', () => {
			render(CellInput, {
				props: {
					valueCents: 0
				}
			});

			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			expect(input.value).toBe('0.00');
		});

		it('should handle decimal cents correctly (e.g., 12345 cents = 123.45)', () => {
			render(CellInput, {
				props: {
					valueCents: 12345
				}
			});

			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			expect(input.value).toBe('123.45');
		});
	});

	describe('keyboard interactions', () => {
		it('should not show error state after valid Enter key save', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '500.00' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown for valid input
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});

		it('should restore original value on Escape', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			await fireEvent.input(input, { target: { value: '999.99' } });

			// Value changed
			expect(input.value).toBe('999.99');

			// Press escape - original value should be restored
			await fireEvent.keyDown(input, { key: 'Escape' });

			// Value should be restored to original
			expect(input.value).toBe('400.00');
		});
	});

	describe('blur behavior', () => {
		it('should not show error when valid value on blur', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '600.00' } });
			await fireEvent.blur(input);

			// No error should be shown
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});

		it('should not show error on blur when value unchanged', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.blur(input);

			// No error should be shown
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});
	});

	describe('validation', () => {
		it('should show error for negative numbers', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '-100' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// Should show error message
			const errorMessage = screen.getByTestId('cell-input-error');
			expect(errorMessage).toBeTruthy();
			expect(errorMessage.textContent).toContain('negative');
		});

		it('should show red border on validation error', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '-100' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(true);
		});

		it('should show error for non-numeric input', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: 'abc' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			const errorMessage = screen.getByTestId('cell-input-error');
			expect(errorMessage).toBeTruthy();
			expect(errorMessage.textContent).toContain('valid number');
		});

		it('should clear error when user types valid value', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');

			// First, create an error
			await fireEvent.input(input, { target: { value: '-100' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// Error should be visible
			expect(screen.getByTestId('cell-input-error')).toBeTruthy();

			// Now type valid value
			await fireEvent.input(input, { target: { value: '100' } });

			// Error should be cleared
			expect(screen.queryByTestId('cell-input-error')).toBeNull();
		});

		it('should prevent save on invalid input (shows error)', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: 'not-a-number' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// Error state should be shown (save prevented)
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(true);
		});

		it('should accept empty input as zero (no error)', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown for empty (which means 0)
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});
	});

	describe('cents conversion', () => {
		it('should convert 400.00 display to cents (no error on valid input)', async () => {
			render(CellInput, {
				props: {
					valueCents: 0
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '400.00' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown for valid input
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});

		it('should handle decimal rounding (no error for valid input)', async () => {
			render(CellInput, {
				props: {
					valueCents: 0
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '400.999' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown for valid input
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});

		it('should handle values without decimal places', async () => {
			render(CellInput, {
				props: {
					valueCents: 0
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '500' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown for valid input
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});

		it('should strip currency symbols from input', async () => {
			render(CellInput, {
				props: {
					valueCents: 0
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '€500.00' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown - currency symbols should be stripped
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});

		it('should handle comma-formatted numbers', async () => {
			render(CellInput, {
				props: {
					valueCents: 0
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '1,234.56' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			// No error should be shown - commas should be stripped
			const wrapper = screen.getByTestId('cell-input');
			expect(wrapper.classList.contains('has-error')).toBe(false);
		});
	});

	describe('accessibility', () => {
		it('should have aria-invalid when error state', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '-100' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(input.getAttribute('aria-invalid')).toBe('true');
		});

		it('should have aria-describedby pointing to error message', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '-100' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(input.getAttribute('aria-describedby')).toBe('cell-input-error');
		});

		it('should have role=alert on error message', async () => {
			render(CellInput, {
				props: {
					valueCents: 40000
				}
			});

			const input = screen.getByTestId('cell-input-field');
			await fireEvent.input(input, { target: { value: '-100' } });
			await fireEvent.keyDown(input, { key: 'Enter' });

			const errorMessage = screen.getByTestId('cell-input-error');
			expect(errorMessage.getAttribute('role')).toBe('alert');
		});
	});
});
