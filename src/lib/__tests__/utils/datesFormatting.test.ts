import { describe, it, expect } from 'vitest';
import { formatDate, formatDateDisplay, toISODate } from '../../utils/dates';

describe('Date Formatting Utilities (Story 4.6)', () => {
	describe('formatDate / formatDateDisplay', () => {
		it('should output "DD MMM YYYY" format', () => {
			expect(formatDate('2025-01-28')).toBe('28 Jan 2025');
		});

		it('should format single-digit day without leading zero', () => {
			expect(formatDate('2025-03-05')).toBe('5 Mar 2025');
		});

		it('should format December correctly', () => {
			expect(formatDate('2024-12-25')).toBe('25 Dec 2024');
		});

		it('should handle all months', () => {
			const expected = [
				['2025-01-15', '15 Jan 2025'],
				['2025-02-15', '15 Feb 2025'],
				['2025-03-15', '15 Mar 2025'],
				['2025-04-15', '15 Apr 2025'],
				['2025-05-15', '15 May 2025'],
				['2025-06-15', '15 Jun 2025'],
				['2025-07-15', '15 Jul 2025'],
				['2025-08-15', '15 Aug 2025'],
				['2025-09-15', '15 Sep 2025'],
				['2025-10-15', '15 Oct 2025'],
				['2025-11-15', '15 Nov 2025'],
				['2025-12-15', '15 Dec 2025']
			];

			for (const [iso, display] of expected) {
				expect(formatDate(iso)).toBe(display);
			}
		});

		it('should return input for invalid format', () => {
			expect(formatDate('not-a-date')).toBe('not-a-date');
		});

		it('formatDate and formatDateDisplay should be equivalent', () => {
			expect(formatDate('2025-01-28')).toBe(formatDateDisplay('2025-01-28'));
		});
	});

	describe('toISODate', () => {
		it('should output "YYYY-MM-DD" for storage', () => {
			const date = new Date(2025, 0, 28); // Jan 28, 2025
			expect(toISODate(date)).toBe('2025-01-28');
		});

		it('should pad month and day with leading zeros', () => {
			const date = new Date(2025, 2, 5); // Mar 5, 2025
			expect(toISODate(date)).toBe('2025-03-05');
		});

		it('should handle December 31', () => {
			const date = new Date(2024, 11, 31);
			expect(toISODate(date)).toBe('2024-12-31');
		});

		it('should return today when no argument given', () => {
			const result = toISODate();
			// Should match YYYY-MM-DD pattern
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});
});
