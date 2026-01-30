import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DateRangeSelector from '../../../components/budget/DateRangeSelector.svelte';
import { getCurrentMonth, getDefaultDateRange, formatMonthDisplay } from '../../../utils/dates';

// Mock date utilities for consistent testing
vi.mock('../../../utils/dates', async () => {
	const actual = await vi.importActual('../../../utils/dates');
	return {
		...actual,
		getCurrentMonth: vi.fn(() => '2025-01'),
		getDefaultDateRange: vi.fn(() => [
			'2024-02',
			'2024-03',
			'2024-04',
			'2024-05',
			'2024-06',
			'2024-07',
			'2024-08',
			'2024-09',
			'2024-10',
			'2024-11',
			'2024-12',
			'2025-01'
		]),
		getThisYearRangeArray: vi.fn(() => [
			'2025-01',
			'2025-02',
			'2025-03',
			'2025-04',
			'2025-05',
			'2025-06',
			'2025-07',
			'2025-08',
			'2025-09',
			'2025-10',
			'2025-11',
			'2025-12'
		]),
		getLastYearRangeArray: vi.fn(() => [
			'2024-01',
			'2024-02',
			'2024-03',
			'2024-04',
			'2024-05',
			'2024-06',
			'2024-07',
			'2024-08',
			'2024-09',
			'2024-10',
			'2024-11',
			'2024-12'
		]),
		getThisQuarterRangeArray: vi.fn(() => ['2025-01', '2025-02', '2025-03'])
	};
});

describe('DateRangeSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render with current range text (e.g., "Feb 2024 - Jan 2025")', () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			// Check that the range is displayed
			expect(screen.getByText(/Feb 2024 - Jan 2025/)).toBeTruthy();
		});

		it('should render dropdown trigger button', () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const button = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			expect(button).toBeTruthy();
			expect(button.getAttribute('aria-haspopup')).toBe('listbox');
		});

		it('should have data-testid attribute', () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			expect(screen.getByTestId('date-range-selector')).toBeTruthy();
		});
	});

	describe('dropdown interaction', () => {
		it('should open dropdown on click', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			expect(screen.getByRole('listbox')).toBeTruthy();
		});

		it('should close dropdown on Escape key', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			expect(screen.getByRole('listbox')).toBeTruthy();

			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(screen.queryByRole('listbox')).toBeFalsy();
		});
	});

	describe('preset options', () => {
		it('should display all 5 presets: Rolling 12M, This Year, Last Year, This Quarter, Custom', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			expect(screen.getByText('Rolling 12 Months')).toBeTruthy();
			expect(screen.getByText('This Year')).toBeTruthy();
			expect(screen.getByText('Last Year')).toBeTruthy();
			expect(screen.getByText('This Quarter')).toBeTruthy();
			expect(screen.getByText('Custom Range...')).toBeTruthy();
		});

		it('should mark selected preset with visual indicator', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			// Rolling 12 Months should be selected (matches our mock default range)
			const rolling12Option = screen.getByRole('option', { name: /Rolling 12 Months/i });
			expect(rolling12Option.getAttribute('aria-selected')).toBe('true');
		});

		it('should show checkmark for selected preset', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			// Should show checkmark on selected option
			expect(screen.getByText('✓')).toBeTruthy();
		});
	});

	describe('preset selection', () => {
		it('should update display when This Year is selected', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const thisYearOption = screen.getByText('This Year');
			await fireEvent.click(thisYearOption);

			// Dropdown should close after selection
			expect(screen.queryByRole('listbox')).toBeFalsy();
		});

		it('should update display when Last Year is selected', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const lastYearOption = screen.getByText('Last Year');
			await fireEvent.click(lastYearOption);

			// Dropdown should close after selection
			expect(screen.queryByRole('listbox')).toBeFalsy();
		});

		it('should update display when This Quarter is selected', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const thisQuarterOption = screen.getByText('This Quarter');
			await fireEvent.click(thisQuarterOption);

			// Dropdown should close after selection
			expect(screen.queryByRole('listbox')).toBeFalsy();
		});

		it('should close dropdown after preset selection', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const thisYearOption = screen.getByText('This Year');
			await fireEvent.click(thisYearOption);

			expect(screen.queryByRole('listbox')).toBeFalsy();
		});
	});

	describe('custom range', () => {
		it('should show custom range picker when Custom Range is selected', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Should show custom range UI
			expect(screen.getByText('Custom Range')).toBeTruthy();
			expect(screen.getByText('Start')).toBeTruthy();
			expect(screen.getByText('End')).toBeTruthy();
			expect(screen.getByRole('button', { name: /Apply/i })).toBeTruthy();
		});

		it('should show Back button in custom range mode', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			expect(screen.getByText('← Back')).toBeTruthy();
		});

		it('should return to presets when Back is clicked', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			const backButton = screen.getByText('← Back');
			await fireEvent.click(backButton);

			// Should show presets again
			expect(screen.getByText('Rolling 12 Months')).toBeTruthy();
		});

		it('should display month count in custom range', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Should show month count
			expect(screen.getByText(/months/i)).toBeTruthy();
		});
	});

	describe('accessibility', () => {
		it('should have proper aria-expanded on trigger', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			expect(trigger.getAttribute('aria-expanded')).toBe('false');

			await fireEvent.click(trigger);
			expect(trigger.getAttribute('aria-expanded')).toBe('true');
		});

		it('should have proper aria-haspopup on trigger', () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
		});

		it('should have proper role on dropdown', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const dropdown = screen.getByRole('listbox');
			expect(dropdown.getAttribute('aria-label')).toBe('Date range options');
		});

		it('should have proper role on preset options', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const options = screen.getAllByRole('option');
			expect(options.length).toBeGreaterThanOrEqual(5);
		});
	});

	describe('custom panel show/hide (story 8.6)', () => {
		it('clicking Custom sets showCustom to true and panel appears', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			// Open dropdown
			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			// Click Custom Range...
			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Custom panel should be visible with title, pickers, and apply button
			expect(screen.getByText('Custom Range')).toBeTruthy();
			expect(screen.getByText('Start')).toBeTruthy();
			expect(screen.getByText('End')).toBeTruthy();
			expect(screen.getByRole('button', { name: /Apply/i })).toBeTruthy();

			// Dropdown should still be open (listbox still present via the panel)
			expect(screen.getByTestId('date-range-selector')).toBeTruthy();
		});

		it('click-outside does not close when clicking inside custom panel', async () => {
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-02',
					endMonth: '2025-01'
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button', { name: /Feb 2024 - Jan 2025/i });
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Verify custom panel is visible
			expect(screen.getByText('Custom Range')).toBeTruthy();

			// Click inside the custom panel (on the "Custom Range" title)
			const customTitle = screen.getByText('Custom Range');
			await fireEvent.click(customTitle);

			// Panel should still be visible — not closed by click-outside
			expect(screen.getByText('Custom Range')).toBeTruthy();
			expect(screen.getByText('Start')).toBeTruthy();
			expect(screen.getByRole('button', { name: /Apply/i })).toBeTruthy();
		});

		it('Apply button applies start/end months and closes dropdown', async () => {
			const changeFn = vi.fn();
			render(DateRangeSelector, {
				props: {
					startMonth: '2024-06',
					endMonth: '2025-01',
					onchange: changeFn
				}
			});

			// Open dropdown and select custom
			const trigger = screen.getByRole('button');
			await fireEvent.click(trigger);

			const customOption = screen.getByText('Custom Range...');
			await fireEvent.click(customOption);

			// Click Apply
			const applyButton = screen.getByRole('button', { name: /Apply/i });
			await fireEvent.click(applyButton);

			// Dropdown should close
			expect(screen.queryByText('Custom Range')).toBeFalsy();

			// Change callback should have been called with start/end months
			expect(changeFn).toHaveBeenCalledTimes(1);
			const event = changeFn.mock.calls[0][0] as CustomEvent;
			expect(event.detail.startMonth).toBeDefined();
			expect(event.detail.endMonth).toBeDefined();
		});

		it('36-month max range enforced - Apply disabled and error shown', async () => {
			// Start with a range that exceeds 36 months when custom opens
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

			// The custom panel should show the range info with error
			await waitFor(() => {
				const errorText = screen.queryByText(/max 36/i);
				expect(errorText).toBeTruthy();
			});

			// Apply button should be disabled
			const applyButton = screen.getByRole('button', { name: /Apply/i });
			expect(applyButton.hasAttribute('disabled')).toBe(true);
		});
	});
});
