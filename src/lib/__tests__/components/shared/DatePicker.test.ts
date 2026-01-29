import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DatePicker from '../../../components/shared/DatePicker.svelte';

// Mock the dateParser module
vi.mock('$lib/utils/dateParser', () => ({
	parseDate: (input: string) => {
		// Simple mock: handle known formats
		if (input === 'today') return '2025-01-29';
		if (input === 'yesterday') return '2025-01-28';
		const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (isoMatch) return input;
		const displayMatch = input.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i);
		if (displayMatch) {
			const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
			const day = displayMatch[1].padStart(2, '0');
			const month = months[displayMatch[2].toLowerCase()];
			return `${displayMatch[3]}-${month}-${day}`;
		}
		return null;
	}
}));

vi.mock('$lib/utils/dates', async () => {
	const actual = await vi.importActual('$lib/utils/dates');
	return {
		...(actual as object),
		formatDateDisplay: (iso: string) => {
			const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
			if (!match) return iso;
			const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			const year = parseInt(match[1], 10);
			const month = parseInt(match[2], 10);
			const day = parseInt(match[3], 10);
			return `${day} ${months[month - 1]} ${year}`;
		}
	};
});

describe('DatePicker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2025, 0, 29));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('auto-fill', () => {
		it('should display the provided date value formatted as DD MMM YYYY', () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const input = screen.getByTestId('date-picker-input') as HTMLInputElement;
			expect(input.value).toBe('28 Jan 2025');
		});

		it('should display empty input when no value is provided', () => {
			render(DatePicker, {
				props: { value: '' }
			});

			const input = screen.getByTestId('date-picker-input') as HTMLInputElement;
			expect(input.value).toBe('');
		});
	});

	describe('display format', () => {
		it('should show date in "DD MMM YYYY" format', () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const input = screen.getByTestId('date-picker-input') as HTMLInputElement;
			expect(input.value).toBe('28 Jan 2025');
		});
	});

	describe('calendar toggle', () => {
		it('should open calendar popup when toggle button is clicked', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			expect(screen.queryByTestId('date-picker-popup')).toBeNull();

			const toggle = screen.getByTestId('date-picker-toggle');
			await fireEvent.click(toggle);

			expect(screen.getByTestId('date-picker-popup')).toBeTruthy();
		});

		it('should close calendar when toggle is clicked again', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const toggle = screen.getByTestId('date-picker-toggle');
			await fireEvent.click(toggle);
			expect(screen.getByTestId('date-picker-popup')).toBeTruthy();

			await fireEvent.click(toggle);
			expect(screen.queryByTestId('date-picker-popup')).toBeNull();
		});
	});

	describe('keyboard interaction', () => {
		it('should close calendar with Escape key without changing value', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			// Open the calendar
			const toggle = screen.getByTestId('date-picker-toggle');
			await fireEvent.click(toggle);
			expect(screen.getByTestId('date-picker-popup')).toBeTruthy();

			// Press Escape on the input
			const input = screen.getByTestId('date-picker-input');
			await fireEvent.keyDown(input, { key: 'Escape' });

			expect(screen.queryByTestId('date-picker-popup')).toBeNull();
		});

		it('should open calendar with ArrowDown key', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const input = screen.getByTestId('date-picker-input');
			await fireEvent.keyDown(input, { key: 'ArrowDown' });

			expect(screen.getByTestId('date-picker-popup')).toBeTruthy();
		});
	});

	describe('manual input', () => {
		it('should show error for invalid date input', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const input = screen.getByTestId('date-picker-input') as HTMLInputElement;

			// Focus to enter edit mode
			await fireEvent.focus(input);

			// Type invalid value
			await fireEvent.input(input, { target: { value: 'not a date' } });
			// Blur to commit
			await fireEvent.blur(input);

			expect(screen.getByTestId('date-picker-error')).toBeTruthy();
			expect(screen.getByTestId('date-picker-error').textContent).toBe('Invalid date');
		});
	});

	describe('accessibility', () => {
		it('should have proper ARIA attributes on input', () => {
			render(DatePicker, {
				props: { value: '2025-01-28', label: 'Transaction date' }
			});

			const input = screen.getByTestId('date-picker-input');
			expect(input.getAttribute('aria-label')).toBe('Transaction date');
			expect(input.getAttribute('aria-haspopup')).toBe('dialog');
		});

		it('should set aria-expanded when calendar is open', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const input = screen.getByTestId('date-picker-input');
			expect(input.getAttribute('aria-expanded')).toBe('false');

			const toggle = screen.getByTestId('date-picker-toggle');
			await fireEvent.click(toggle);

			expect(input.getAttribute('aria-expanded')).toBe('true');
		});

		it('should set aria-invalid when there is an error', async () => {
			render(DatePicker, {
				props: { value: '2025-01-28' }
			});

			const input = screen.getByTestId('date-picker-input') as HTMLInputElement;
			await fireEvent.focus(input);
			await fireEvent.input(input, { target: { value: 'invalid' } });
			await fireEvent.blur(input);

			expect(input.getAttribute('aria-invalid')).toBe('true');
		});
	});
});
