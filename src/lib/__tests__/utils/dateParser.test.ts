import { describe, it, expect } from 'vitest';
import { parseDate } from '../../utils/dateParser';

describe('dateParser', () => {
	// Use a fixed reference date: Wednesday, 29 Jan 2025
	const referenceDate = new Date(2025, 0, 29); // month is 0-indexed

	describe('ISO format (YYYY-MM-DD)', () => {
		it('should parse "2025-01-28" (ISO format)', () => {
			expect(parseDate('2025-01-28', referenceDate)).toBe('2025-01-28');
		});

		it('should parse ISO dates with single-digit month/day', () => {
			expect(parseDate('2025-1-5', referenceDate)).toBe('2025-01-05');
		});

		it('should return null for invalid ISO date (month 13)', () => {
			expect(parseDate('2025-13-01', referenceDate)).toBeNull();
		});

		it('should return null for invalid ISO date (day 32)', () => {
			expect(parseDate('2025-01-32', referenceDate)).toBeNull();
		});

		it('should return null for Feb 30', () => {
			expect(parseDate('2025-02-30', referenceDate)).toBeNull();
		});
	});

	describe('DD/MM/YYYY format', () => {
		it('should parse "28/01/2025" (DD/MM/YYYY format)', () => {
			expect(parseDate('28/01/2025', referenceDate)).toBe('2025-01-28');
		});

		it('should parse single-digit day and month', () => {
			expect(parseDate('5/3/2025', referenceDate)).toBe('2025-03-05');
		});

		it('should return null for invalid day in DD/MM/YYYY', () => {
			expect(parseDate('32/01/2025', referenceDate)).toBeNull();
		});
	});

	describe('display format (DD MMM YYYY)', () => {
		it('should parse "28 Jan 2025" (display format)', () => {
			expect(parseDate('28 Jan 2025', referenceDate)).toBe('2025-01-28');
		});

		it('should parse full month name "28 January 2025"', () => {
			expect(parseDate('28 January 2025', referenceDate)).toBe('2025-01-28');
		});

		it('should be case-insensitive for month names', () => {
			expect(parseDate('28 JAN 2025', referenceDate)).toBe('2025-01-28');
			expect(parseDate('28 jan 2025', referenceDate)).toBe('2025-01-28');
		});

		it('should return null for invalid month name', () => {
			expect(parseDate('28 Xyz 2025', referenceDate)).toBeNull();
		});
	});

	describe('natural language - "today"', () => {
		it('should parse "today" and return current date', () => {
			expect(parseDate('today', referenceDate)).toBe('2025-01-29');
		});

		it('should parse "Today" (case-insensitive)', () => {
			expect(parseDate('Today', referenceDate)).toBe('2025-01-29');
		});

		it('should parse "TODAY" (case-insensitive)', () => {
			expect(parseDate('TODAY', referenceDate)).toBe('2025-01-29');
		});
	});

	describe('natural language - "yesterday"', () => {
		it('should parse "yesterday" and return previous date', () => {
			expect(parseDate('yesterday', referenceDate)).toBe('2025-01-28');
		});

		it('should handle yesterday crossing month boundary', () => {
			const firstOfMonth = new Date(2025, 1, 1); // Feb 1
			expect(parseDate('yesterday', firstOfMonth)).toBe('2025-01-31');
		});
	});

	describe('natural language - "last <day>"', () => {
		it('should parse "last friday" and return most recent Friday', () => {
			// Reference is Wednesday Jan 29 2025 -> last Friday is Jan 24
			expect(parseDate('last friday', referenceDate)).toBe('2025-01-24');
		});

		it('should parse "last monday"', () => {
			// Reference is Wednesday Jan 29 -> last Monday is Jan 27
			expect(parseDate('last monday', referenceDate)).toBe('2025-01-27');
		});

		it('should go back 7 days if today is that day', () => {
			// Reference is Wednesday Jan 29 -> last wednesday is Jan 22
			expect(parseDate('last wednesday', referenceDate)).toBe('2025-01-22');
		});

		it('should parse "last sunday"', () => {
			// Reference is Wednesday Jan 29 -> last Sunday is Jan 26
			expect(parseDate('last sunday', referenceDate)).toBe('2025-01-26');
		});
	});

	describe('invalid inputs', () => {
		it('should return null for invalid date string', () => {
			expect(parseDate('not a date', referenceDate)).toBeNull();
		});

		it('should return null for empty string', () => {
			expect(parseDate('', referenceDate)).toBeNull();
		});

		it('should return null for whitespace only', () => {
			expect(parseDate('   ', referenceDate)).toBeNull();
		});

		it('should return null for partial date', () => {
			expect(parseDate('2025-01', referenceDate)).toBeNull();
		});

		it('should return null for invalid "last" input', () => {
			expect(parseDate('last xyzday', referenceDate)).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('should trim whitespace', () => {
			expect(parseDate('  2025-01-28  ', referenceDate)).toBe('2025-01-28');
		});

		it('should handle leap year dates', () => {
			expect(parseDate('29/02/2024', referenceDate)).toBe('2024-02-29');
		});

		it('should reject Feb 29 on non-leap year', () => {
			expect(parseDate('29/02/2025', referenceDate)).toBeNull();
		});
	});
});
