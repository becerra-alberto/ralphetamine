/**
 * Budget amount formatting utilities
 *
 * Provides compact formatting for budget cells to prevent overflow.
 * Amounts under 1000 display as integers, 1000+ use K suffix.
 * All inputs are in cents (integer).
 */

import { getCurrencySymbol, type CurrencyCode, DEFAULT_CURRENCY } from './currency';

/**
 * Format a budget amount in cents to a compact display string.
 *
 * - 0 → "€0"
 * - 50000 (500.00) → "€500"
 * - 99999 (999.99) → "€999"
 * - 100000 (1000.00) → "€1K"
 * - 150000 (1500.00) → "€1.5K"
 * - Negative values keep the minus sign: -150000 → "-€1.5K"
 */
export function formatBudgetAmount(cents: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
	const symbol = getCurrencySymbol(currency);
	const isNegative = cents < 0;
	const absCents = Math.abs(cents);
	const dollars = absCents / 100;

	let formatted: string;

	if (dollars >= 1000) {
		const k = dollars / 1000;
		// Use at most 1 decimal place, drop .0 for exact thousands
		if (k === Math.floor(k)) {
			formatted = `${symbol}${k}K`;
		} else {
			// Round to 1 decimal
			const rounded = Math.round(k * 10) / 10;
			if (rounded === Math.floor(rounded)) {
				formatted = `${symbol}${rounded}K`;
			} else {
				formatted = `${symbol}${rounded}K`;
			}
		}
	} else {
		// Under 1000: display as integer (truncate cents)
		formatted = `${symbol}${Math.floor(dollars)}`;
	}

	return isNegative ? `-${formatted}` : formatted;
}
