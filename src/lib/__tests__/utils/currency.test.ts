import { describe, it, expect } from 'vitest';
import {
	centsToAmount,
	amountToCents,
	formatCentsCurrency,
	formatCentsNumber,
	formatCentsToDisplay,
	parseDisplayToCents,
	formatNegativeCents,
	formatCentsWithSign,
	validateCentsConversion,
	getCurrencySymbol,
	isValidCentsAmount,
	convertCentsToBase,
	DEFAULT_EXCHANGE_RATES,
	CURRENCIES,
	DEFAULT_CURRENCY
} from '../../utils/currency';

describe('Currency Utilities', () => {
	describe('centsToAmount', () => {
		it('should convert cents to amount correctly', () => {
			expect(centsToAmount(100)).toBe(1);
			expect(centsToAmount(1999)).toBe(19.99);
			expect(centsToAmount(0)).toBe(0);
		});

		it('should handle negative cents', () => {
			expect(centsToAmount(-500)).toBe(-5);
		});
	});

	describe('amountToCents', () => {
		it('should convert amount to cents correctly', () => {
			expect(amountToCents(1)).toBe(100);
			expect(amountToCents(19.99)).toBe(1999);
			expect(amountToCents(0)).toBe(0);
		});

		it('should round to nearest cent', () => {
			expect(amountToCents(19.999)).toBe(2000);
			expect(amountToCents(19.991)).toBe(1999);
		});

		it('should handle negative amounts', () => {
			expect(amountToCents(-5)).toBe(-500);
		});
	});

	describe('formatCentsCurrency', () => {
		it('should format EUR correctly', () => {
			const formatted = formatCentsCurrency(123456, 'EUR');
			// All currencies use en-US locale for consistency: €1,234.56
			expect(formatted).toContain('1,234.56');
			expect(formatted).toContain('€');
		});

		it('should format USD correctly', () => {
			const formatted = formatCentsCurrency(123456, 'USD');
			// USD uses en-US locale: $1,234.56
			expect(formatted).toContain('1,234.56');
			expect(formatted).toContain('$');
		});

		it('should format CAD correctly', () => {
			const formatted = formatCentsCurrency(123456, 'CAD');
			expect(formatted).toContain('1,234.56');
			expect(formatted).toContain('$');
		});

		it('should use EUR as default currency', () => {
			const formatted = formatCentsCurrency(123456);
			expect(formatted).toContain('€');
		});

		it('should format zero correctly', () => {
			const formatted = formatCentsCurrency(0);
			expect(formatted).toContain('0.00');
		});

		it('should format negative amounts', () => {
			const formatted = formatCentsCurrency(-10000);
			expect(formatted).toContain('100');
		});
	});

	describe('formatCentsNumber', () => {
		it('should format with thousands separator', () => {
			expect(formatCentsNumber(123456)).toBe('1,234.56');
		});

		it('should format with two decimal places', () => {
			expect(formatCentsNumber(100)).toBe('1.00');
		});

		it('should format zero correctly', () => {
			expect(formatCentsNumber(0)).toBe('0.00');
		});
	});

	describe('formatCentsToDisplay', () => {
		it('should format with two decimal places', () => {
			expect(formatCentsToDisplay(1999)).toBe('19.99');
			expect(formatCentsToDisplay(100)).toBe('1.00');
			expect(formatCentsToDisplay(0)).toBe('0.00');
		});
	});

	describe('parseDisplayToCents', () => {
		it('should parse simple numbers', () => {
			expect(parseDisplayToCents('19.99')).toBe(1999);
			expect(parseDisplayToCents('100')).toBe(10000);
		});

		it('should parse with currency symbol', () => {
			expect(parseDisplayToCents('€19.99')).toBe(1999);
			expect(parseDisplayToCents('$100.00')).toBe(10000);
		});

		it('should parse with thousands separator', () => {
			expect(parseDisplayToCents('1,234.56')).toBe(123456);
		});

		it('should handle negative amounts', () => {
			expect(parseDisplayToCents('-100.00')).toBe(-10000);
		});

		it('should return 0 for invalid input', () => {
			expect(parseDisplayToCents('abc')).toBe(0);
		});
	});

	describe('formatNegativeCents', () => {
		it('should format negative amounts with minus sign', () => {
			const formatted = formatNegativeCents(-10000);
			expect(formatted).toMatch(/^-/);
			expect(formatted).toContain('100');
		});

		it('should format positive amounts without minus sign', () => {
			const formatted = formatNegativeCents(10000);
			expect(formatted).not.toMatch(/^-/);
		});
	});

	describe('formatCentsWithSign', () => {
		it('should add + for positive amounts', () => {
			const formatted = formatCentsWithSign(10000);
			expect(formatted).toMatch(/^\+/);
		});

		it('should add - for negative amounts', () => {
			const formatted = formatCentsWithSign(-10000);
			expect(formatted).toMatch(/^-/);
		});

		it('should not add sign for zero', () => {
			const formatted = formatCentsWithSign(0);
			expect(formatted).not.toMatch(/^[+-]/);
		});
	});

	describe('validateCentsConversion', () => {
		it('should return true for valid conversions', () => {
			expect(validateCentsConversion(1999)).toBe(true);
			expect(validateCentsConversion(0)).toBe(true);
			expect(validateCentsConversion(123456)).toBe(true);
		});

		it('should validate 1999 cents = €19.99 exactly', () => {
			expect(validateCentsConversion(1999)).toBe(true);
			expect(centsToAmount(1999)).toBe(19.99);
		});
	});

	describe('getCurrencySymbol', () => {
		it('should return € for EUR', () => {
			expect(getCurrencySymbol('EUR')).toBe('€');
		});

		it('should return $ for USD', () => {
			expect(getCurrencySymbol('USD')).toBe('$');
		});

		it('should return $ for CAD', () => {
			expect(getCurrencySymbol('CAD')).toBe('$');
		});

		it('should return € for default', () => {
			expect(getCurrencySymbol()).toBe('€');
		});
	});

	describe('isValidCentsAmount', () => {
		it('should return true for valid integers', () => {
			expect(isValidCentsAmount(100)).toBe(true);
			expect(isValidCentsAmount(0)).toBe(true);
			expect(isValidCentsAmount(-500)).toBe(true);
		});

		it('should return false for non-integers', () => {
			expect(isValidCentsAmount(10.5)).toBe(false);
		});

		it('should return false for non-numbers', () => {
			expect(isValidCentsAmount('100')).toBe(false);
			expect(isValidCentsAmount(null)).toBe(false);
			expect(isValidCentsAmount(undefined)).toBe(false);
		});

		it('should return false for Infinity and NaN', () => {
			expect(isValidCentsAmount(Infinity)).toBe(false);
			expect(isValidCentsAmount(NaN)).toBe(false);
		});
	});

	describe('CURRENCIES', () => {
		it('should have EUR configuration', () => {
			expect(CURRENCIES.EUR).toEqual({
				code: 'EUR',
				symbol: '€',
				locale: 'en-US'
			});
		});

		it('should have USD configuration', () => {
			expect(CURRENCIES.USD).toEqual({
				code: 'USD',
				symbol: '$',
				locale: 'en-US'
			});
		});

		it('should have CAD configuration', () => {
			expect(CURRENCIES.CAD).toEqual({
				code: 'CAD',
				symbol: '$',
				locale: 'en-US'
			});
		});
	});

	describe('DEFAULT_CURRENCY', () => {
		it('should be EUR', () => {
			expect(DEFAULT_CURRENCY).toBe('EUR');
		});
	});

	describe('convertCentsToBase', () => {
		it('should return same value for EUR (base currency)', () => {
			expect(convertCentsToBase(100000, 'EUR')).toBe(100000);
		});

		it('should convert USD to EUR using default rate', () => {
			// Default USD rate is 0.92
			const result = convertCentsToBase(100000, 'USD');
			expect(result).toBe(Math.round(100000 * 0.92));
		});

		it('should convert CAD to EUR using default rate', () => {
			// Default CAD rate is 0.68
			const result = convertCentsToBase(100000, 'CAD');
			expect(result).toBe(Math.round(100000 * 0.68));
		});

		it('should use custom exchange rates when provided', () => {
			const customRates = { EUR: 1.0, USD: 0.85, CAD: 0.65, MXN: 0.05 };
			const result = convertCentsToBase(100000, 'USD', customRates);
			expect(result).toBe(Math.round(100000 * 0.85));
		});

		it('should handle zero amount', () => {
			expect(convertCentsToBase(0, 'USD')).toBe(0);
		});

		it('should handle negative amounts for currency conversion', () => {
			const result = convertCentsToBase(-50000, 'USD');
			expect(result).toBe(Math.round(-50000 * 0.92));
		});

		it('should use integer arithmetic (round result)', () => {
			// Verify no floating point issues - result should be an integer
			const result = convertCentsToBase(33333, 'USD');
			expect(Number.isInteger(result)).toBe(true);
		});
	});

	describe('DEFAULT_EXCHANGE_RATES', () => {
		it('should have EUR rate of 1.0', () => {
			expect(DEFAULT_EXCHANGE_RATES.EUR).toBe(1.0);
		});

		it('should have rates for USD and CAD', () => {
			expect(DEFAULT_EXCHANGE_RATES.USD).toBeDefined();
			expect(DEFAULT_EXCHANGE_RATES.CAD).toBeDefined();
			expect(DEFAULT_EXCHANGE_RATES.USD).toBeGreaterThan(0);
			expect(DEFAULT_EXCHANGE_RATES.CAD).toBeGreaterThan(0);
		});
	});

	describe('Story 3.1 - inline editing conversions', () => {
		it('should convert 400.00 display to 40000 cents for storage', () => {
			// This test validates the spec requirement: 400.00 display -> 40000 cents storage
			expect(amountToCents(400.0)).toBe(40000);
		});

		it('should convert 40000 cents to 400.00 for display', () => {
			// This test validates the spec requirement: 40000 cents -> 400.00 display
			expect(centsToAmount(40000)).toBe(400.0);
			expect(formatCentsToDisplay(40000)).toBe('400.00');
		});

		it('should handle decimal rounding: 400.999 -> 40100 cents', () => {
			// This test validates the spec requirement: 400.999 -> 40100 (rounded up)
			expect(amountToCents(400.999)).toBe(40100);
		});

		it('should handle decimal rounding: 400.991 -> 40099 cents', () => {
			// Rounding down case
			expect(amountToCents(400.991)).toBe(40099);
		});

		it('should roundtrip conversion without floating point errors', () => {
			// Test various amounts that commonly cause floating point issues
			const testValues = [0.01, 0.1, 0.3, 1.99, 19.99, 100.01, 999.99];

			for (const value of testValues) {
				const cents = amountToCents(value);
				const backToAmount = centsToAmount(cents);
				// Allow for minor floating point differences
				expect(Math.abs(backToAmount - value)).toBeLessThan(0.001);
			}
		});
	});
});
