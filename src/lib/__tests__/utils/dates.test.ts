import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getCurrentMonth,
	getPreviousMonth,
	getNextMonth,
	getMonthRange,
	getDefaultDateRange,
	formatMonthShort,
	formatMonthFull,
	getYear,
	getMonthNumber,
	groupMonthsByYear,
	isValidMonth,
	compareMonths,
	isMonthInRange,
	getMonthCount,
	getRolling12MonthsRange,
	getThisYearRange,
	getLastYearRange,
	getThisQuarterRange,
	isValidDateRange,
	formatDateRange,
	DATE_RANGE_OPTIONS
} from '../../utils/dates';

describe('Date Utilities', () => {
	describe('getCurrentMonth', () => {
		it('should return current month in YYYY-MM format', () => {
			const result = getCurrentMonth();
			expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
		});
	});

	describe('getPreviousMonth', () => {
		it('should return previous month', () => {
			expect(getPreviousMonth('2025-06')).toBe('2025-05');
			expect(getPreviousMonth('2025-12')).toBe('2025-11');
		});

		it('should handle year boundary', () => {
			expect(getPreviousMonth('2025-01')).toBe('2024-12');
		});
	});

	describe('getNextMonth', () => {
		it('should return next month', () => {
			expect(getNextMonth('2025-06')).toBe('2025-07');
			expect(getNextMonth('2025-01')).toBe('2025-02');
		});

		it('should handle year boundary', () => {
			expect(getNextMonth('2025-12')).toBe('2026-01');
		});
	});

	describe('getMonthRange', () => {
		it('should return array of months in range', () => {
			const range = getMonthRange('2025-01', '2025-03');
			expect(range).toEqual(['2025-01', '2025-02', '2025-03']);
		});

		it('should handle cross-year range', () => {
			const range = getMonthRange('2024-11', '2025-02');
			expect(range).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
		});

		it('should return single month for same start/end', () => {
			const range = getMonthRange('2025-06', '2025-06');
			expect(range).toEqual(['2025-06']);
		});
	});

	describe('getDefaultDateRange', () => {
		it('should return 12 months', () => {
			const range = getDefaultDateRange();
			expect(range).toHaveLength(12);
		});

		it('should be ordered chronologically (oldest first)', () => {
			const range = getDefaultDateRange();
			for (let i = 0; i < range.length - 1; i++) {
				expect(range[i] < range[i + 1]).toBe(true);
			}
		});

		it('should end with current month', () => {
			const range = getDefaultDateRange();
			expect(range[range.length - 1]).toBe(getCurrentMonth());
		});
	});

	describe('formatMonthShort', () => {
		it('should format month as abbreviated name', () => {
			expect(formatMonthShort('2025-01')).toBe('Jan');
			expect(formatMonthShort('2025-06')).toBe('Jun');
			expect(formatMonthShort('2025-12')).toBe('Dec');
		});
	});

	describe('formatMonthFull', () => {
		it('should format month as full name', () => {
			expect(formatMonthFull('2025-01')).toBe('January');
			expect(formatMonthFull('2025-06')).toBe('June');
			expect(formatMonthFull('2025-12')).toBe('December');
		});
	});

	describe('getYear', () => {
		it('should extract year from MonthString', () => {
			expect(getYear('2025-06')).toBe(2025);
			expect(getYear('2024-01')).toBe(2024);
		});
	});

	describe('getMonthNumber', () => {
		it('should extract month number from MonthString', () => {
			expect(getMonthNumber('2025-01')).toBe(1);
			expect(getMonthNumber('2025-06')).toBe(6);
			expect(getMonthNumber('2025-12')).toBe(12);
		});
	});

	describe('groupMonthsByYear', () => {
		it('should group months by year', () => {
			const months = ['2024-11', '2024-12', '2025-01', '2025-02'];
			const groups = groupMonthsByYear(months);

			expect(groups).toHaveLength(2);
			expect(groups[0].year).toBe(2024);
			expect(groups[0].months).toEqual(['2024-11', '2024-12']);
			expect(groups[0].startIndex).toBe(0);
			expect(groups[1].year).toBe(2025);
			expect(groups[1].months).toEqual(['2025-01', '2025-02']);
			expect(groups[1].startIndex).toBe(2);
		});

		it('should handle single year', () => {
			const months = ['2025-01', '2025-02', '2025-03'];
			const groups = groupMonthsByYear(months);

			expect(groups).toHaveLength(1);
			expect(groups[0].year).toBe(2025);
			expect(groups[0].months).toHaveLength(3);
		});

		it('should return empty array for empty input', () => {
			expect(groupMonthsByYear([])).toEqual([]);
		});
	});

	describe('isValidMonth', () => {
		it('should return true for valid YYYY-MM format', () => {
			expect(isValidMonth('2025-01')).toBe(true);
			expect(isValidMonth('2025-12')).toBe(true);
			expect(isValidMonth('2000-06')).toBe(true);
		});

		it('should return false for invalid formats', () => {
			expect(isValidMonth('2025-00')).toBe(false);
			expect(isValidMonth('2025-13')).toBe(false);
			expect(isValidMonth('Jan 2025')).toBe(false);
			expect(isValidMonth('2025/01')).toBe(false);
		});
	});

	describe('compareMonths', () => {
		it('should return -1 if a < b', () => {
			expect(compareMonths('2025-01', '2025-02')).toBe(-1);
			expect(compareMonths('2024-12', '2025-01')).toBe(-1);
		});

		it('should return 0 if a === b', () => {
			expect(compareMonths('2025-01', '2025-01')).toBe(0);
		});

		it('should return 1 if a > b', () => {
			expect(compareMonths('2025-02', '2025-01')).toBe(1);
			expect(compareMonths('2025-01', '2024-12')).toBe(1);
		});
	});

	describe('isMonthInRange', () => {
		it('should return true for month in range', () => {
			expect(isMonthInRange('2025-06', '2025-01', '2025-12')).toBe(true);
			expect(isMonthInRange('2025-01', '2025-01', '2025-12')).toBe(true);
			expect(isMonthInRange('2025-12', '2025-01', '2025-12')).toBe(true);
		});

		it('should return false for month outside range', () => {
			expect(isMonthInRange('2024-12', '2025-01', '2025-12')).toBe(false);
			expect(isMonthInRange('2026-01', '2025-01', '2025-12')).toBe(false);
		});
	});

	describe('getMonthCount', () => {
		it('should return correct count for same year', () => {
			expect(getMonthCount('2025-01', '2025-12')).toBe(12);
			expect(getMonthCount('2025-06', '2025-06')).toBe(1);
			expect(getMonthCount('2025-01', '2025-03')).toBe(3);
		});

		it('should return correct count across years', () => {
			expect(getMonthCount('2024-11', '2025-02')).toBe(4);
		});
	});

	describe('Date Range Presets', () => {
		describe('getRolling12MonthsRange', () => {
			it('should return current month + 11 previous months', () => {
				const range = getRolling12MonthsRange();
				const currentMonth = getCurrentMonth();

				expect(range.endMonth).toBe(currentMonth);

				// Calculate expected start month (11 months back)
				const monthCount = getMonthCount(range.startMonth, range.endMonth);
				expect(monthCount).toBe(12);
			});
		});

		describe('getThisYearRange', () => {
			it('should return Jan-Dec of current year', () => {
				const range = getThisYearRange();
				const currentYear = new Date().getFullYear();

				expect(range.startMonth).toBe(`${currentYear}-01`);
				expect(range.endMonth).toBe(`${currentYear}-12`);
			});
		});

		describe('getLastYearRange', () => {
			it('should return Jan-Dec of previous year', () => {
				const range = getLastYearRange();
				const lastYear = new Date().getFullYear() - 1;

				expect(range.startMonth).toBe(`${lastYear}-01`);
				expect(range.endMonth).toBe(`${lastYear}-12`);
			});
		});

		describe('getThisQuarterRange', () => {
			it('should return correct 3-month range for current quarter', () => {
				const range = getThisQuarterRange();
				const monthCount = getMonthCount(range.startMonth, range.endMonth);

				expect(monthCount).toBe(3);
			});

			it('should start on quarter boundary', () => {
				const range = getThisQuarterRange();
				const startMonth = getMonthNumber(range.startMonth);

				// Quarter starts should be 1, 4, 7, or 10
				expect([1, 4, 7, 10]).toContain(startMonth);
			});
		});

		describe('DATE_RANGE_OPTIONS', () => {
			it('should have 4 preset options', () => {
				expect(DATE_RANGE_OPTIONS).toHaveLength(4);
			});

			it('should include all preset types', () => {
				const ids = DATE_RANGE_OPTIONS.map((opt) => opt.id);
				expect(ids).toContain('rolling12');
				expect(ids).toContain('thisYear');
				expect(ids).toContain('lastYear');
				expect(ids).toContain('thisQuarter');
			});
		});

		describe('isValidDateRange', () => {
			it('should return true for valid range within max months', () => {
				expect(isValidDateRange('2025-01', '2025-12')).toBe(true);
				expect(isValidDateRange('2024-01', '2025-12', 36)).toBe(true);
			});

			it('should return false for range exceeding max months', () => {
				// 37 months exceeds default max of 36
				expect(isValidDateRange('2022-01', '2025-01')).toBe(false); // 37 months > 36 max
				expect(isValidDateRange('2021-01', '2025-01')).toBe(false); // 49 months
			});

			it('should return false when start > end', () => {
				expect(isValidDateRange('2025-12', '2025-01')).toBe(false);
			});

			it('should return false for invalid month format', () => {
				expect(isValidDateRange('invalid', '2025-12')).toBe(false);
				expect(isValidDateRange('2025-01', 'invalid')).toBe(false);
			});
		});

		describe('formatDateRange', () => {
			it('should format same-year range', () => {
				expect(formatDateRange('2025-01', '2025-12')).toBe('Jan - Dec 2025');
			});

			it('should format cross-year range', () => {
				expect(formatDateRange('2024-02', '2025-01')).toBe('Feb 2024 - Jan 2025');
			});
		});
	});
});
