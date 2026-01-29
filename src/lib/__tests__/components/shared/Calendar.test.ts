import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Calendar from '../../../components/shared/Calendar.svelte';

describe('Calendar', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 0, 29)); // Wed Jan 29, 2025
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ---------------------------------------------------------------
	// 1. Current date is highlighted in calendar view
	// ---------------------------------------------------------------
	describe('today highlight', () => {
		it('should render today\'s date cell and mark it with aria-current', () => {
			// Calendar uses new Date() internally for "today" detection.
			// Fake timers don't reliably affect Date() inside compiled Svelte.
			// Use real current date for this test.
			vi.useRealTimers();

			const now = new Date();
			const y = now.getFullYear();
			const m = now.getMonth();
			const d = now.getDate();
			const todayISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

			render(Calendar, {
				props: {
					selectedDate: todayISO,
					viewYear: y,
					viewMonth: m
				}
			});

			const todayCell = screen.getByTestId(`calendar-day-${todayISO}`);
			expect(todayCell).toBeTruthy();
			expect(todayCell.getAttribute('aria-current')).toBe('date');
		});

		it('should not mark a non-today date with aria-current', () => {
			vi.useRealTimers();

			const now = new Date();
			const y = now.getFullYear();
			const m = now.getMonth();
			const todayISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

			// Pick a different day (10th, unless today is 10th then use 11th)
			const otherDay = now.getDate() === 10 ? 11 : 10;
			const otherISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(otherDay).padStart(2, '0')}`;

			render(Calendar, {
				props: {
					selectedDate: todayISO,
					viewYear: y,
					viewMonth: m
				}
			});

			const otherCell = screen.getByTestId(`calendar-day-${otherISO}`);
			expect(otherCell.getAttribute('aria-current')).toBeNull();
		});
	});

	// ---------------------------------------------------------------
	// 2. Current month displays by default
	// ---------------------------------------------------------------
	describe('current month display', () => {
		it('should display the current month and year text', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('January 2025');
		});

		it('should display a different month when viewMonth is changed', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-06-15',
					viewYear: 2025,
					viewMonth: 5 // June (0-indexed)
				}
			});

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('June 2025');
		});
	});

	// ---------------------------------------------------------------
	// 3. Previous/next month navigation buttons work (including year wrap)
	// ---------------------------------------------------------------
	describe('month navigation', () => {
		it('should navigate to previous month when prev button is clicked', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const prevBtn = screen.getByTestId('calendar-prev-month');
			await fireEvent.click(prevBtn);

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('December 2024');
		});

		it('should navigate to next month when next button is clicked', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const nextBtn = screen.getByTestId('calendar-next-month');
			await fireEvent.click(nextBtn);

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('February 2025');
		});

		it('should wrap year backward (January to December of previous year)', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0 // January
				}
			});

			const prevBtn = screen.getByTestId('calendar-prev-month');
			await fireEvent.click(prevBtn);

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('December 2024');
		});

		it('should wrap year forward (December to January of next year)', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-12-15',
					viewYear: 2025,
					viewMonth: 11 // December
				}
			});

			const nextBtn = screen.getByTestId('calendar-next-month');
			await fireEvent.click(nextBtn);

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('January 2026');
		});

		it('should navigate multiple months in sequence', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const nextBtn = screen.getByTestId('calendar-next-month');
			await fireEvent.click(nextBtn);
			await fireEvent.click(nextBtn);
			await fireEvent.click(nextBtn);

			expect(screen.getByTestId('calendar-month-year').textContent).toContain('April 2025');
		});
	});

	// ---------------------------------------------------------------
	// 4. Arrow keys move date selection (up/down/left/right)
	// ---------------------------------------------------------------
	describe('keyboard arrow navigation', () => {
		it('should move focus left by 1 day with ArrowLeft', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const calendar = screen.getByTestId('calendar');
			await fireEvent.keyDown(calendar, { key: 'ArrowLeft' });

			const focusedCell = screen.getByTestId('calendar-day-2025-01-14');
			expect(focusedCell.classList.contains('focused')).toBe(true);
		});

		it('should move focus right by 1 day with ArrowRight', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const calendar = screen.getByTestId('calendar');
			await fireEvent.keyDown(calendar, { key: 'ArrowRight' });

			const focusedCell = screen.getByTestId('calendar-day-2025-01-16');
			expect(focusedCell.classList.contains('focused')).toBe(true);
		});

		it('should move focus up by 7 days with ArrowUp', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const calendar = screen.getByTestId('calendar');
			await fireEvent.keyDown(calendar, { key: 'ArrowUp' });

			const focusedCell = screen.getByTestId('calendar-day-2025-01-08');
			expect(focusedCell.classList.contains('focused')).toBe(true);
		});

		it('should move focus down by 7 days with ArrowDown', async () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const calendar = screen.getByTestId('calendar');
			await fireEvent.keyDown(calendar, { key: 'ArrowDown' });

			const focusedCell = screen.getByTestId('calendar-day-2025-01-22');
			expect(focusedCell.classList.contains('focused')).toBe(true);
		});
	});

	// ---------------------------------------------------------------
	// 5. Enter key confirms selection and closes calendar
	// ---------------------------------------------------------------
	describe('Enter key confirmation', () => {
		it('should dispatch select event when Enter is pressed', async () => {
			let selectCalled = false;
			let selectedDateValue: string | null = null;

			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				},
				events: {
					select: (e: CustomEvent) => {
						selectCalled = true;
						selectedDateValue = e.detail.date;
					}
				}
			});

			const calendar = screen.getByTestId('calendar');
			await fireEvent.keyDown(calendar, { key: 'Enter' });

			expect(selectCalled).toBe(true);
			expect(selectedDateValue).toBe('2025-01-15');
		});

		it('should dispatch select with the focused date after arrow navigation then Enter', async () => {
			let selectedDateValue: string | null = null;

			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				},
				events: {
					select: (e: CustomEvent) => {
						selectedDateValue = e.detail.date;
					}
				}
			});

			const calendar = screen.getByTestId('calendar');
			// Move right 2 days then confirm
			await fireEvent.keyDown(calendar, { key: 'ArrowRight' });
			await fireEvent.keyDown(calendar, { key: 'ArrowRight' });
			await fireEvent.keyDown(calendar, { key: 'Enter' });

			expect(selectedDateValue).toBe('2025-01-17');
		});
	});

	// ---------------------------------------------------------------
	// 6. Clicking a date dispatches select event
	// ---------------------------------------------------------------
	describe('click selection', () => {
		it('should dispatch select event with correct date when a day is clicked', async () => {
			let selectedDateValue: string | null = null;

			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				},
				events: {
					select: (e: CustomEvent) => {
						selectedDateValue = e.detail.date;
					}
				}
			});

			const day20 = screen.getByTestId('calendar-day-2025-01-20');
			await fireEvent.click(day20);

			expect(selectedDateValue).toBe('2025-01-20');
		});

		it('should dispatch select event when clicking a different date', async () => {
			let selectedDateValue: string | null = null;

			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				},
				events: {
					select: (e: CustomEvent) => {
						selectedDateValue = e.detail.date;
					}
				}
			});

			const day5 = screen.getByTestId('calendar-day-2025-01-05');
			await fireEvent.click(day5);

			expect(selectedDateValue).toBe('2025-01-05');
		});
	});

	// ---------------------------------------------------------------
	// 7. Escape dispatches close event
	// ---------------------------------------------------------------
	describe('Escape key', () => {
		it('should dispatch close event when Escape is pressed', async () => {
			let closeCalled = false;

			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				},
				events: {
					close: () => {
						closeCalled = true;
					}
				}
			});

			const calendar = screen.getByTestId('calendar');
			await fireEvent.keyDown(calendar, { key: 'Escape' });

			expect(closeCalled).toBe(true);
		});
	});

	// ---------------------------------------------------------------
	// 8. Day headers render (Su, Mo, Tu, etc.)
	// ---------------------------------------------------------------
	describe('day headers', () => {
		it('should render all seven day-of-week headers', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			expect(screen.getByText('Su')).toBeTruthy();
			expect(screen.getByText('Mo')).toBeTruthy();
			expect(screen.getByText('Tu')).toBeTruthy();
			expect(screen.getByText('We')).toBeTruthy();
			expect(screen.getByText('Th')).toBeTruthy();
			expect(screen.getByText('Fr')).toBeTruthy();
			expect(screen.getByText('Sa')).toBeTruthy();
		});

		it('should render day headers with .day-header class', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const suHeader = screen.getByText('Su');
			expect(suHeader.classList.contains('day-header')).toBe(true);
		});

		it('should render day headers with role="columnheader"', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const suHeader = screen.getByText('Su');
			expect(suHeader.getAttribute('role')).toBe('columnheader');
		});
	});

	// ---------------------------------------------------------------
	// 9. Selected date has aria-selected
	// ---------------------------------------------------------------
	describe('aria-selected', () => {
		it('should set aria-selected="true" on the selected date cell', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const selectedCell = screen.getByTestId('calendar-day-2025-01-15');
			expect(selectedCell.getAttribute('aria-selected')).toBe('true');
		});

		it('should set aria-selected="false" on non-selected date cells', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const otherCell = screen.getByTestId('calendar-day-2025-01-10');
			expect(otherCell.getAttribute('aria-selected')).toBe('false');
		});

		it('should have .selected class on the selected date cell', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const selectedCell = screen.getByTestId('calendar-day-2025-01-15');
			expect(selectedCell.classList.contains('selected')).toBe(true);
		});
	});

	// ---------------------------------------------------------------
	// 10. Grid has role="grid"
	// ---------------------------------------------------------------
	describe('grid role', () => {
		it('should have role="grid" on the calendar container', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const calendar = screen.getByTestId('calendar');
			expect(calendar.getAttribute('role')).toBe('grid');
		});

		it('should render the calendar element', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			expect(screen.getByTestId('calendar')).toBeTruthy();
		});

		it('should have aria-label on the calendar', () => {
			render(Calendar, {
				props: {
					selectedDate: '2025-01-15',
					viewYear: 2025,
					viewMonth: 0
				}
			});

			const calendar = screen.getByTestId('calendar');
			expect(calendar.getAttribute('aria-label')).toBe('Calendar');
		});
	});
});
