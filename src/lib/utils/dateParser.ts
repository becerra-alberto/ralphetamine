/**
 * Date parsing utilities for the DatePicker component
 *
 * Parses various date string formats into ISO date strings (YYYY-MM-DD).
 * Supports DD/MM/YYYY, ISO, display format, and natural language inputs.
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTH_ABBREVS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

/**
 * Parse a date string into an ISO date string (YYYY-MM-DD).
 * Returns null if the string cannot be parsed.
 *
 * Supported formats:
 * - "YYYY-MM-DD" (ISO)
 * - "DD/MM/YYYY"
 * - "DD MMM YYYY" (e.g., "28 Jan 2025")
 * - "DD MMMM YYYY" (e.g., "28 January 2025")
 * - "today"
 * - "yesterday"
 * - "last <dayname>" (e.g., "last friday")
 */
export function parseDate(input: string, referenceDate?: Date): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const ref = referenceDate ?? new Date();

  // Try natural language first
  const natural = parseNaturalLanguage(trimmed, ref);
  if (natural) return natural;

  // Try ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (isValidDateParts(year, month, day)) {
      return toISO(year, month, day);
    }
    return null;
  }

  // Try DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);
    if (isValidDateParts(year, month, day)) {
      return toISO(year, month, day);
    }
    return null;
  }

  // Try "DD MMM YYYY" or "DD MMMM YYYY"
  const displayMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (displayMatch) {
    const day = parseInt(displayMatch[1], 10);
    const monthStr = displayMatch[2].toLowerCase();
    const year = parseInt(displayMatch[3], 10);

    let monthIndex = MONTH_ABBREVS.indexOf(monthStr);
    if (monthIndex === -1) {
      monthIndex = MONTH_NAMES.indexOf(monthStr);
    }

    if (monthIndex !== -1) {
      const month = monthIndex + 1;
      if (isValidDateParts(year, month, day)) {
        return toISO(year, month, day);
      }
    }
    return null;
  }

  return null;
}

/**
 * Parse natural language date strings.
 */
function parseNaturalLanguage(input: string, ref: Date): string | null {
  const lower = input.toLowerCase().trim();

  if (lower === 'today') {
    return dateToISO(ref);
  }

  if (lower === 'yesterday') {
    const d = new Date(ref);
    d.setDate(d.getDate() - 1);
    return dateToISO(d);
  }

  // "last <dayname>"
  const lastDayMatch = lower.match(/^last\s+(\w+)$/);
  if (lastDayMatch) {
    const dayName = lastDayMatch[1];
    const dayIndex = DAY_NAMES.indexOf(dayName);
    if (dayIndex !== -1) {
      const d = new Date(ref);
      const currentDay = d.getDay();
      let daysBack = currentDay - dayIndex;
      if (daysBack <= 0) {
        daysBack += 7;
      }
      d.setDate(d.getDate() - daysBack);
      return dateToISO(d);
    }
  }

  return null;
}

/**
 * Validate date parts are in valid ranges
 */
function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * Convert year/month/day to ISO string
 */
function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD)
 */
function dateToISO(d: Date): string {
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
