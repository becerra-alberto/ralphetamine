import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MonthPicker from '../../../components/shared/MonthPicker.svelte';

describe('MonthPicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render month/year picker correctly', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			expect(screen.getByTestId('month-picker')).toBeTruthy();
		});

		it('should render month select with correct value', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i });
			expect(monthSelect).toBeTruthy();
			expect((monthSelect as HTMLSelectElement).value).toBe('6');
		});

		it('should render year select with correct value', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const yearSelect = screen.getByRole('combobox', { name: /year/i });
			expect(yearSelect).toBeTruthy();
			expect((yearSelect as HTMLSelectElement).value).toBe('2025');
		});

		it('should render label when provided', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06',
					label: 'Start Date'
				}
			});

			expect(screen.getByText('Start Date')).toBeTruthy();
		});

		it('should not render label when not provided', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			// Should not have any label elements
			expect(screen.queryByText('Start Date')).toBeFalsy();
		});
	});

	describe('month options', () => {
		it('should display all 12 months', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i });
			const options = monthSelect.querySelectorAll('option');

			expect(options.length).toBe(12);
		});

		it('should display abbreviated month names', () => {
			render(MonthPicker, {
				props: {
					value: '2025-01'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i });

			expect(monthSelect.innerHTML).toContain('Jan');
			expect(monthSelect.innerHTML).toContain('Feb');
			expect(monthSelect.innerHTML).toContain('Dec');
		});
	});

	describe('year options', () => {
		it('should display years from minYear to maxYear', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06',
					minYear: 2020,
					maxYear: 2027
				}
			});

			const yearSelect = screen.getByRole('combobox', { name: /year/i });
			const options = yearSelect.querySelectorAll('option');

			expect(options.length).toBe(8); // 2020-2027 inclusive
		});

		it('should include default year range', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const yearSelect = screen.getByRole('combobox', { name: /year/i });

			expect(yearSelect.innerHTML).toContain('2020');
			expect(yearSelect.innerHTML).toContain('2025');
		});
	});

	describe('selection', () => {
		it('should update month select value when changed', async () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i }) as HTMLSelectElement;
			await fireEvent.change(monthSelect, { target: { value: '3' } });

			// Select element should show the new month value
			expect(monthSelect.value).toBe('3');
		});

		it('should update year select value when changed', async () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const yearSelect = screen.getByRole('combobox', { name: /year/i }) as HTMLSelectElement;
			await fireEvent.change(yearSelect, { target: { value: '2024' } });

			// Select element should show the new year value
			expect(yearSelect.value).toBe('2024');
		});

		it('should handle January correctly (no leading zero issues)', async () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i }) as HTMLSelectElement;
			await fireEvent.change(monthSelect, { target: { value: '1' } });

			// Select element should show January
			expect(monthSelect.value).toBe('1');
		});

		it('should handle December correctly', async () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i }) as HTMLSelectElement;
			await fireEvent.change(monthSelect, { target: { value: '12' } });

			// Select element should show December
			expect(monthSelect.value).toBe('12');
		});
	});

	describe('accessibility', () => {
		it('should have aria-label on month select', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i });
			expect(monthSelect.getAttribute('aria-label')).toBe('Month');
		});

		it('should have aria-label on year select', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06'
				}
			});

			const yearSelect = screen.getByRole('combobox', { name: /year/i });
			expect(yearSelect.getAttribute('aria-label')).toBe('Year');
		});

		it('should associate label with month select via id', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06',
					label: 'Start',
					id: 'start-month'
				}
			});

			const label = screen.getByText('Start');
			expect(label.getAttribute('for')).toBe('start-month-month');
		});
	});

	describe('props', () => {
		it('should use custom id when provided', () => {
			render(MonthPicker, {
				props: {
					value: '2025-06',
					id: 'custom-picker'
				}
			});

			const monthSelect = screen.getByRole('combobox', { name: /month/i });
			const yearSelect = screen.getByRole('combobox', { name: /year/i });

			expect(monthSelect.getAttribute('id')).toBe('custom-picker-month');
			expect(yearSelect.getAttribute('id')).toBe('custom-picker-year');
		});
	});
});
