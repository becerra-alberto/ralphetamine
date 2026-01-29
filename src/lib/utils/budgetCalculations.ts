/**
 * Budget calculation utilities
 *
 * Provides functions for calculating trailing 12-month totals
 * and other budget aggregations.
 */

import type { MonthString } from '$lib/types/budget';
import type { BudgetCell } from '$lib/stores/budget';
import { getPreviousMonth, getMonthRange } from './dates';

/**
 * Result of trailing 12M calculation
 */
export interface Trailing12MTotals {
	actualCents: number;
	budgetedCents: number;
	differenceCents: number;
	percentUsed: number;
}

/**
 * Calculate the trailing 12-month range from the END of the visible range
 * Example: If viewing Jan-Jun 2025, 12M = Jul 2024 - Jun 2025
 */
export function getTrailing12MRange(visibleEndMonth: MonthString): MonthString[] {
	// Start from the end month and go back 11 months
	let startMonth = visibleEndMonth;
	for (let i = 0; i < 11; i++) {
		startMonth = getPreviousMonth(startMonth);
	}
	return getMonthRange(startMonth, visibleEndMonth);
}

/**
 * Calculate 12M totals for a category
 * Uses integer cents arithmetic to avoid floating point errors
 */
export function calculate12MTotals(
	categoryId: string,
	trailing12MMonths: MonthString[],
	cellsMap: Map<string, BudgetCell>
): Trailing12MTotals {
	let actualCents = 0;
	let budgetedCents = 0;

	trailing12MMonths.forEach((month) => {
		const key = `${categoryId}:${month}`;
		const cell = cellsMap.get(key);
		if (cell) {
			// Use Math.abs for actuals since expenses are negative
			actualCents += Math.abs(cell.actualCents);
			budgetedCents += cell.budgetedCents;
		}
	});

	const differenceCents = budgetedCents - actualCents;
	const percentUsed = budgetedCents > 0 ? (actualCents / budgetedCents) * 100 : 0;

	return {
		actualCents,
		budgetedCents,
		differenceCents,
		percentUsed
	};
}

/**
 * Calculate 12M totals for a section (sum of all child categories)
 */
export function calculateSection12MTotals(
	categoryIds: string[],
	trailing12MMonths: MonthString[],
	cellsMap: Map<string, BudgetCell>
): Trailing12MTotals {
	let actualCents = 0;
	let budgetedCents = 0;

	categoryIds.forEach((categoryId) => {
		const categoryTotals = calculate12MTotals(categoryId, trailing12MMonths, cellsMap);
		actualCents += categoryTotals.actualCents;
		budgetedCents += categoryTotals.budgetedCents;
	});

	const differenceCents = budgetedCents - actualCents;
	const percentUsed = budgetedCents > 0 ? (actualCents / budgetedCents) * 100 : 0;

	return {
		actualCents,
		budgetedCents,
		differenceCents,
		percentUsed
	};
}

/**
 * Calculate grand total 12M (all categories)
 */
export function calculateGrand12MTotals(
	allCategoryIds: string[],
	trailing12MMonths: MonthString[],
	cellsMap: Map<string, BudgetCell>
): Trailing12MTotals {
	return calculateSection12MTotals(allCategoryIds, trailing12MMonths, cellsMap);
}

/**
 * Get CSS class for 12M difference display
 * Green if under budget (positive difference), red if over
 */
export function get12MDifferenceClass(differenceCents: number): string {
	if (differenceCents > 0) {
		return 'difference-positive'; // Under budget (remaining)
	} else if (differenceCents < 0) {
		return 'difference-negative'; // Over budget
	}
	return 'difference-neutral'; // Exactly on budget
}
