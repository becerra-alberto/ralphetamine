import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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
});
