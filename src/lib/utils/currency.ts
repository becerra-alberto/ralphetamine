/**
 * Currency formatting utilities for Stackz
 *
 * Provides consistent currency formatting across the application.
 * Amounts are stored as cents (integer) to avoid floating point issues.
 */

export type CurrencyCode = 'EUR' | 'USD' | 'CAD' | 'MXN';

/**
 * Currency configuration
 */
export interface CurrencyConfig {
	code: CurrencyCode;
	symbol: string;
	locale: string;
}

/**
 * Currency configurations
 * Note: All currencies use en-US locale for consistent formatting (symbol first, comma thousands separator, period decimal)
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
	EUR: { code: 'EUR', symbol: '€', locale: 'en-US' },
	USD: { code: 'USD', symbol: '$', locale: 'en-US' },
	CAD: { code: 'CAD', symbol: '$', locale: 'en-US' },
	MXN: { code: 'MXN', symbol: '$', locale: 'en-US' }
};

/**
 * Default currency
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

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
 * Uses Intl.NumberFormat for proper localization
 */
export function formatCentsCurrency(cents: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
	const amount = cents / 100;
	const config = CURRENCIES[currency];

	return new Intl.NumberFormat(config.locale, {
		style: 'currency',
		currency: config.code,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount);
}

/**
 * Format cents with thousands separator and two decimal places
 * Returns just the number without currency symbol
 */
export function formatCentsNumber(cents: number): string {
	const amount = cents / 100;
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount);
}

/**
 * Format cents to a simple display string with 2 decimal places
 * No thousands separator, just decimal
 */
export function formatCentsToDisplay(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * Parse a display string to cents
 * Handles currency symbols, commas, spaces
 */
export function parseDisplayToCents(display: string): number {
	const cleaned = display.replace(/[^0-9.-]/g, '');
	const parsed = parseFloat(cleaned);
	if (isNaN(parsed)) return 0;
	return Math.round(parsed * 100);
}

/**
 * Format negative amounts
 * Returns the formatted absolute value with a negative sign prefix
 */
export function formatNegativeCents(cents: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
	const isNegative = cents < 0;
	const formatted = formatCentsCurrency(Math.abs(cents), currency);
	return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format cents with sign indicator
 * Positive: +€100.00
 * Negative: -€100.00
 * Zero: €0.00
 */
export function formatCentsWithSign(cents: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
	if (cents === 0) return formatCentsCurrency(0, currency);
	const formatted = formatCentsCurrency(Math.abs(cents), currency);
	return cents > 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Validate that converting to/from cents doesn't introduce floating point errors
 * Example: 1999 cents should equal €19.99 exactly
 */
export function validateCentsConversion(cents: number): boolean {
	const amount = centsToAmount(cents);
	const backToCents = amountToCents(amount);
	return backToCents === cents;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: CurrencyCode = DEFAULT_CURRENCY): string {
	return CURRENCIES[currency].symbol;
}

/**
 * Check if a value represents a valid cents amount
 */
export function isValidCentsAmount(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
}

/**
 * Default exchange rates to EUR (base currency)
 * These are stored defaults; in future, will be fetched/configurable.
 */
export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
	EUR: 1.0,
	USD: 0.92,
	CAD: 0.68,
	MXN: 0.054
};

/**
 * Convert cents from one currency to EUR base currency
 * Uses integer arithmetic to avoid floating point issues
 */
export function convertCentsToBase(
	cents: number,
	fromCurrency: CurrencyCode,
	rates: Record<CurrencyCode, number> = DEFAULT_EXCHANGE_RATES
): number {
	if (fromCurrency === 'EUR') return cents;
	const rate = rates[fromCurrency] ?? 1.0;
	return Math.round(cents * rate);
}
