import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DateRangeFilter from '../../../components/transactions/DateRangeFilter.svelte';

describe('DateRangeFilter', () => {
	describe('preset buttons', () => {
		it('should render all five preset buttons: Today, This week, This month, Last 30 days, This year', () => {
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				}
			});

			expect(screen.getByTestId('date-preset-today')).toBeTruthy();
			expect(screen.getByTestId('date-preset-today').textContent?.trim()).toBe('Today');

			expect(screen.getByTestId('date-preset-this-week')).toBeTruthy();
			expect(screen.getByTestId('date-preset-this-week').textContent?.trim()).toBe('This week');

			expect(screen.getByTestId('date-preset-this-month')).toBeTruthy();
			expect(screen.getByTestId('date-preset-this-month').textContent?.trim()).toBe('This month');

			expect(screen.getByTestId('date-preset-last-30-days')).toBeTruthy();
			expect(screen.getByTestId('date-preset-last-30-days').textContent?.trim()).toBe('Last 30 days');

			expect(screen.getByTestId('date-preset-this-year')).toBeTruthy();
			expect(screen.getByTestId('date-preset-this-year').textContent?.trim()).toBe('This year');
		});

		it('should render all presets inside the date-presets container', () => {
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				}
			});

			const presetsContainer = screen.getByTestId('date-presets');
			const buttons = presetsContainer.querySelectorAll('button');
			expect(buttons.length).toBe(5);
		});
	});

	describe('custom date range', () => {
		it('should render start and end date pickers', () => {
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				}
			});

			const startInput = screen.getByTestId('date-start');
			const endInput = screen.getByTestId('date-end');

			expect(startInput).toBeTruthy();
			expect(endInput).toBeTruthy();
			expect(startInput.getAttribute('type')).toBe('date');
			expect(endInput.getAttribute('type')).toBe('date');
		});

		it('should display provided start and end date values', () => {
			render(DateRangeFilter, {
				props: {
					startDate: '2025-03-01',
					endDate: '2025-03-31',
					activePreset: null
				}
			});

			const startInput = screen.getByTestId('date-start') as HTMLInputElement;
			const endInput = screen.getByTestId('date-end') as HTMLInputElement;

			expect(startInput.value).toBe('2025-03-01');
			expect(endInput.value).toBe('2025-03-31');
		});
	});

	describe('validation', () => {
		it('should show error message when end date is before start date', () => {
			render(DateRangeFilter, {
				props: {
					startDate: '2025-01-31',
					endDate: '2025-01-01',
					activePreset: null
				}
			});

			const error = screen.getByTestId('date-validation-error');
			expect(error).toBeTruthy();
			expect(error.textContent).toContain('End date must be after start date');
			expect(error.getAttribute('role')).toBe('alert');
		});

		it('should not show error when dates are valid', () => {
			render(DateRangeFilter, {
				props: {
					startDate: '2025-01-01',
					endDate: '2025-01-31',
					activePreset: null
				}
			});

			expect(screen.queryByTestId('date-validation-error')).toBeNull();
		});

		it('should not show error when no dates are set', () => {
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				}
			});

			expect(screen.queryByTestId('date-validation-error')).toBeNull();
		});
	});

	describe('preset event dispatch', () => {
		it('should dispatch preset event when a preset button is clicked', async () => {
			const presetHandler = vi.fn();
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				},
				events: {
					preset: presetHandler
				}
			});

			const todayBtn = screen.getByTestId('date-preset-today');
			await fireEvent.click(todayBtn);

			expect(presetHandler).toHaveBeenCalledTimes(1);
			expect(presetHandler.mock.calls[0][0].detail).toEqual({ preset: 'today' });
		});

		it('should dispatch preset event with correct id for each preset', async () => {
			const presetHandler = vi.fn();
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				},
				events: {
					preset: presetHandler
				}
			});

			const presetIds = ['today', 'this-week', 'this-month', 'last-30-days', 'this-year'];

			for (const id of presetIds) {
				await fireEvent.click(screen.getByTestId(`date-preset-${id}`));
			}

			expect(presetHandler).toHaveBeenCalledTimes(5);
			presetIds.forEach((id, index) => {
				expect(presetHandler.mock.calls[index][0].detail).toEqual({ preset: id });
			});
		});
	});

	describe('active preset highlighting', () => {
		it('should add active class to the active preset button', () => {
			render(DateRangeFilter, {
				props: {
					startDate: '2025-01-01',
					endDate: '2025-01-31',
					activePreset: 'this-month'
				}
			});

			const thisMonthBtn = screen.getByTestId('date-preset-this-month');
			expect(thisMonthBtn.classList.contains('active')).toBe(true);
		});

		it('should not apply active class to non-active preset buttons', () => {
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: 'today'
				}
			});

			const todayBtn = screen.getByTestId('date-preset-today');
			expect(todayBtn.classList.contains('active')).toBe(true);

			const otherPresets = ['this-week', 'this-month', 'last-30-days', 'this-year'];
			for (const id of otherPresets) {
				const btn = screen.getByTestId(`date-preset-${id}`);
				expect(btn.classList.contains('active')).toBe(false);
			}
		});

		it('should not highlight any preset when activePreset is null', () => {
			render(DateRangeFilter, {
				props: {
					startDate: null,
					endDate: null,
					activePreset: null
				}
			});

			const presetsContainer = screen.getByTestId('date-presets');
			const activeButtons = presetsContainer.querySelectorAll('.active');
			expect(activeButtons.length).toBe(0);
		});
	});
});
