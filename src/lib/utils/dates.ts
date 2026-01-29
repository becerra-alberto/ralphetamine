/**
 * Date utilities for budget view
 *
 * Provides functions for generating date ranges, formatting months,
 * and calculating time-based values for the budget grid.
 */

import type { MonthString } from '../types/budget';

/**
 * Get current month as YYYY-MM string
 */
export function getCurrentMonth(): MonthString {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get previous month from a MonthString
 */
export function getPreviousMonth(month: MonthString): MonthString {
  const [year, m] = month.split('-').map(Number);
  if (m === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Get next month from a MonthString
 */
export function getNextMonth(month: MonthString): MonthString {
  const [year, m] = month.split('-').map(Number);
  if (m === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Generate an array of MonthStrings for a date range
 * Returns months ordered chronologically (oldest first)
 */
export function getMonthRange(startMonth: MonthString, endMonth: MonthString): MonthString[] {
  const months: MonthString[] = [];
  let current = startMonth;

  while (current <= endMonth) {
    months.push(current);
    current = getNextMonth(current);
  }

  return months;
}

/**
 * Get default budget date range (current month + 11 previous months)
 * Returns months ordered chronologically (oldest first, newest last)
 */
export function getDefaultDateRange(): MonthString[] {
  const currentMonth = getCurrentMonth();
  let startMonth = currentMonth;

  // Go back 11 months from current month
  for (let i = 0; i < 11; i++) {
    startMonth = getPreviousMonth(startMonth);
  }

  return getMonthRange(startMonth, currentMonth);
}

/**
 * Format a MonthString to abbreviated month name (e.g., "Jan", "Feb")
 */
export function formatMonthShort(month: MonthString): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = parseInt(month.split('-')[1], 10);
  return monthNames[m - 1];
}

/**
 * Format a MonthString to full month name (e.g., "January", "February")
 */
export function formatMonthFull(month: MonthString): string {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const m = parseInt(month.split('-')[1], 10);
  return monthNames[m - 1];
}

/**
 * Get the year from a MonthString
 */
export function getYear(month: MonthString): number {
  return parseInt(month.split('-')[0], 10);
}

/**
 * Get the month number (1-12) from a MonthString
 */
export function getMonthNumber(month: MonthString): number {
  return parseInt(month.split('-')[1], 10);
}

/**
 * Group months by year for creating year headers
 * Returns an array of { year, months, startIndex } objects
 */
export interface YearGroup {
  year: number;
  months: MonthString[];
  startIndex: number;
}

export function groupMonthsByYear(months: MonthString[]): YearGroup[] {
  const groups: YearGroup[] = [];
  let currentGroup: YearGroup | null = null;

  months.forEach((month, index) => {
    const year = getYear(month);

    if (!currentGroup || currentGroup.year !== year) {
      currentGroup = {
        year,
        months: [month],
        startIndex: index
      };
      groups.push(currentGroup);
    } else {
      currentGroup.months.push(month);
    }
  });

  return groups;
}

/**
 * Check if a MonthString is valid
 */
export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/**
 * Compare two MonthStrings
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareMonths(a: MonthString, b: MonthString): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if month is within a date range (inclusive)
 */
export function isMonthInRange(month: MonthString, startMonth: MonthString, endMonth: MonthString): boolean {
  return month >= startMonth && month <= endMonth;
}

/**
 * Get the number of months between two MonthStrings (inclusive)
 */
export function getMonthCount(startMonth: MonthString, endMonth: MonthString): number {
  const [startYear, startM] = startMonth.split('-').map(Number);
  const [endYear, endM] = endMonth.split('-').map(Number);

  return (endYear - startYear) * 12 + (endM - startM) + 1;
}
