/**
 * Budget types for Stackz budget management
 *
 * Budgets represent monthly spending allocations for categories.
 * Amounts are stored in cents (integer) to avoid floating point issues.
 */

/** Month format: YYYY-MM (e.g., "2025-01") */
export type MonthString = string;

/**
 * Represents a budget allocation for a specific category and month
 */
export interface Budget {
	/** Category ID (foreign key to categories table) */
	categoryId: string;
	/** Month in YYYY-MM format */
	month: MonthString;
	/** Budget amount in cents (positive integer) */
	amountCents: number;
	/** Optional note/description */
	note: string | null;
	/** ISO 8601 creation timestamp */
	createdAt: string;
	/** ISO 8601 last update timestamp */
	updatedAt: string;
}

/**
 * Input for creating or updating a budget
 */
export interface BudgetInput {
	categoryId: string;
	month: MonthString;
	amountCents: number;
	note?: string;
}

/**
 * Budget with category details for display
 */
export interface BudgetWithCategory extends Budget {
	/** Category name for display */
	categoryName: string;
	/** Category type (income|expense|transfer) */
	categoryType: string;
	/** Parent category ID for grouping */
	categoryParentId: string | null;
}

/**
 * Monthly budget summary showing totals
 */
export interface MonthlyBudgetSummary {
	month: MonthString;
	/** Total budgeted amount in cents */
	totalBudgetedCents: number;
	/** Total actual spent amount in cents */
	totalActualCents: number;
	/** Number of categories with budgets */
	categoryCount: number;
}

/**
 * Category budget vs actual comparison
 */
export interface CategoryBudgetComparison {
	categoryId: string;
	categoryName: string;
	/** Budgeted amount in cents */
	budgetedCents: number;
	/** Actual spent amount in cents */
	actualCents: number;
	/** Difference (budgeted - actual) in cents */
	differenceCents: number;
	/** Percentage of budget used (0-100+) */
	percentUsed: number;
}

/**
 * Budget summary with actual spending for comparison
 */
export interface BudgetSummary {
	categoryId: string;
	month: MonthString;
	/** Budgeted amount in cents */
	budgetedCents: number;
	/** Actual spent amount in cents (sum of transactions) */
	actualCents: number;
	/** Remaining budget in cents (budgeted - actual) */
	remainingCents: number;
	/** Percentage of budget used (0-100+) */
	percentageUsed: number;
}

/**
 * Filters for querying budgets
 */
export interface BudgetFilters {
	month?: MonthString;
	categoryId?: string;
	startMonth?: MonthString;
	endMonth?: MonthString;
}

/**
 * Validate a month string format (YYYY-MM)
 */
export function isValidMonth(value: string): boolean {
	return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * Alias for backwards compatibility
 */
export const isValidMonthString = isValidMonth;

/**
 * Convert cents to decimal amount
 */
export function centsToAmount(cents: number): number {
	return cents / 100;
}

/**
 * Convert decimal amount to cents (rounded)
 */
export function amountToCents(amount: number): number {
	return Math.round(amount * 100);
}

/**
 * Format cents as a currency string
 */
export function formatCentsCurrency(cents: number, currency: string = 'EUR'): string {
	const amount = cents / 100;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency
	}).format(amount);
}

/**
 * Format cents to a display string with 2 decimal places
 */
export function formatCentsToDisplay(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * Parse a display string to cents
 */
export function parseDisplayToCents(display: string): number {
	const cleaned = display.replace(/[^0-9.-]/g, '');
	return Math.round(parseFloat(cleaned) * 100);
}

/**
 * Get current month as MonthString
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
