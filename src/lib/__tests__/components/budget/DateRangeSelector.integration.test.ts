import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DateRangeSelector from '../../../components/budget/DateRangeSelector.svelte';

describe('DateRangeSelector Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('custom range picker', () => {
		it('should allow start/end date selection', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01'
				}
			});

			// Open dropdown
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			// Select custom range
			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Should show month pickers
			const monthPickers = screen.getAllByTestId('month-picker');
			expect(monthPickers.length).toBe(2);

			// Should have Start and End labels
			expect(screen.getByText('Start')).toBeTruthy();
			expect(screen.getByText('End')).toBeTruthy();
		});

		it('should update custom start date when month/year changed', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Find start month picker selects
			const monthSelects = screen.getAllByRole('combobox', { name: /month/i });
			const startMonthSelect = monthSelects[0];

			// Change start month to March
			await fireEvent.change(startMonthSelect, { target: { value: '3' } });

			// The month count should update
			await waitFor(() => {
				const rangeInfo = screen.getByText(/months/i);
				expect(rangeInfo).toBeTruthy();
			});
		});

		it('should have Apply button that closes dropdown', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Click Apply button
			const applyButton = screen.getByRole('button', { name: /apply/i });
			await fireEvent.click(applyButton);

			// Dropdown should be closed
			expect(screen.queryByRole('listbox')).toBeFalsy();
		});
	});

	describe('range validation', () => {
		it('should show error when range exceeds 36 months', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2021-01',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Change dates to exceed 36 months
			const yearSelects = screen.getAllByRole('combobox', { name: /year/i });
			const startYearSelect = yearSelects[0];

			// Set start year to 2020 (will exceed 36 months with end of 2025-01)
			await fireEvent.change(startYearSelect, { target: { value: '2020' } });

			// Should show error message
			await waitFor(() => {
				const errorText = screen.queryByText(/max 36/i);
				expect(errorText).toBeTruthy();
			});
		});

		it('should disable Apply button when range exceeds 36 months', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2020-01',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Set dates that exceed 36 months
			const yearSelects = screen.getAllByRole('combobox', { name: /year/i });
			const startYearSelect = yearSelects[0];
			await fireEvent.change(startYearSelect, { target: { value: '2020' } });

			const monthSelects = screen.getAllByRole('combobox', { name: /month/i });
			const startMonthSelect = monthSelects[0];
			await fireEvent.change(startMonthSelect, { target: { value: '1' } });

			// Apply button should be disabled
			await waitFor(() => {
				const applyButton = screen.getByRole('button', { name: /apply/i });
				expect(applyButton.hasAttribute('disabled')).toBe(true);
			});
		});

		it('should enable Apply button for valid range', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Apply button should be enabled for valid range
			const applyButton = screen.getByRole('button', { name: /apply/i });
			expect(applyButton.hasAttribute('disabled')).toBe(false);
		});
	});

	describe('dropdown behavior', () => {
		it('should close dropdown after applying custom range', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Apply
			const applyButton = screen.getByRole('button', { name: /apply/i });
			await fireEvent.click(applyButton);

			// Dropdown should be closed
			expect(screen.queryByRole('listbox')).toBeFalsy();
			expect(screen.queryByText('Custom Range')).toBeFalsy();
		});

		it('should reset custom picker state when cancelled', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Change a value
			const yearSelects = screen.getAllByRole('combobox', { name: /year/i });
			const startYearSelect = yearSelects[0];
			await fireEvent.change(startYearSelect, { target: { value: '2023' } });

			// Click back
			const backButton = screen.getByText('← Back');
			await fireEvent.click(backButton);

			// Re-open custom
			const customOption2 = screen.getByText('Custom Range...');
			await fireEvent.click(customOption2);

			// Values should be reset to original
			const newYearSelects = screen.getAllByRole('combobox', { name: /year/i });
			expect((newYearSelects[0] as HTMLSelectElement).value).toBe('2024');
		});
	});

	describe('preset detection', () => {
		it('should detect "This Year" preset correctly', async () => {
			const currentYear = new Date().getFullYear();
			render(DateRangeSelector, {
				props: {
					startMonth: `${currentYear}-01`,
					endMonth: `${currentYear}-12`
				}
			});

			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const thisYearOption = screen.getByRole('option', { name: /This Year/i });
			expect(thisYearOption.getAttribute('aria-selected')).toBe('true');
		});

		it('should detect "Last Year" preset correctly', async () => {
			const lastYear = new Date().getFullYear() - 1;
			render(DateRangeSelector, {
				props: {
					startMonth: `${lastYear}-01`,
					endMonth: `${lastYear}-12`
				}
			});

			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const lastYearOption = screen.getByRole('option', { name: /Last Year/i });
			expect(lastYearOption.getAttribute('aria-selected')).toBe('true');
		});

		it('should show "custom" selected for non-preset ranges', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-03',
					endMonth: '2024-09'
				}
			});

			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByRole('option', { name: /Custom Range/i });
			expect(customOption.getAttribute('aria-selected')).toBe('true');
		});
	});
});
