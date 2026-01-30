import { describe, it, expect } from 'vitest';
import {
	maskBankNumber,
	validateBankNumber,
	isIBAN,
	isCLABE,
	detectBankNumberFormat,
	COUNTRY_CODES,
	COUNTRY_NAMES,
	getCountryName
} from '../../utils/bankIdentifiers';

describe('bankIdentifiers', () => {
	describe('maskBankNumber', () => {
		it('should mask IBAN: "NL82BUNQ2071504690" → "NL82...4690"', () => {
			expect(maskBankNumber('NL82BUNQ2071504690')).toBe('NL82...4690');
		});

		it('should return full value for short values (< 8 chars)', () => {
			expect(maskBankNumber('ABC1234')).toBe('ABC1234');
			expect(maskBankNumber('SHORT')).toBe('SHORT');
		});

		it('should return empty string for null/empty', () => {
			expect(maskBankNumber(null)).toBe('');
			expect(maskBankNumber(undefined)).toBe('');
			expect(maskBankNumber('')).toBe('');
			expect(maskBankNumber('   ')).toBe('');
		});

		it('should mask exactly 8-char value', () => {
			expect(maskBankNumber('12345678')).toBe('1234...5678');
		});

		it('should mask CLABE number', () => {
			expect(maskBankNumber('032180000118359719')).toBe('0321...9719');
		});
	});

	describe('validateBankNumber', () => {
		it('should validate IBAN format', () => {
			const result = validateBankNumber('NL82BUNQ2071504690');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('iban');
		});

		it('should validate CLABE format', () => {
			const result = validateBankNumber('032180000118359719');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('clabe');
		});

		it('should accept generic bank numbers', () => {
			const result = validateBankNumber('SOME-BANK-123');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('generic');
		});

		it('should return valid for empty input', () => {
			const result = validateBankNumber('');
			expect(result.valid).toBe(true);
		});
	});

	describe('isIBAN', () => {
		it('should detect valid IBAN', () => {
			expect(isIBAN('NL82BUNQ2071504690')).toBe(true);
			expect(isIBAN('DE89370400440532013000')).toBe(true);
		});

		it('should reject non-IBAN', () => {
			expect(isIBAN('12345')).toBe(false);
			expect(isIBAN('')).toBe(false);
		});
	});

	describe('isCLABE', () => {
		it('should detect valid CLABE', () => {
			expect(isCLABE('032180000118359719')).toBe(true);
		});

		it('should reject non-CLABE', () => {
			expect(isCLABE('12345')).toBe(false);
			expect(isCLABE('NL82BUNQ2071504690')).toBe(false);
		});
	});

	describe('detectBankNumberFormat', () => {
		it('should detect IBAN format', () => {
			expect(detectBankNumberFormat('NL82BUNQ2071504690')).toBe('iban');
		});

		it('should detect CLABE format', () => {
			expect(detectBankNumberFormat('032180000118359719')).toBe('clabe');
		});

		it('should return generic for other formats', () => {
			expect(detectBankNumberFormat('BANK-123')).toBe('generic');
			expect(detectBankNumberFormat('')).toBe('generic');
		});
	});

	describe('COUNTRY_CODES', () => {
		it('should contain common country codes', () => {
			expect(COUNTRY_CODES).toContain('NL');
			expect(COUNTRY_CODES).toContain('DE');
			expect(COUNTRY_CODES).toContain('US');
			expect(COUNTRY_CODES).toContain('MX');
		});

		it('should all be 2-letter codes', () => {
			for (const code of COUNTRY_CODES) {
				expect(code).toHaveLength(2);
				expect(code).toMatch(/^[A-Z]{2}$/);
			}
		});
	});

	describe('COUNTRY_NAMES', () => {
		it('should have an entry for every COUNTRY_CODES value', () => {
			for (const code of COUNTRY_CODES) {
				expect(COUNTRY_NAMES[code]).toBeDefined();
				expect(typeof COUNTRY_NAMES[code]).toBe('string');
				expect(COUNTRY_NAMES[code].length).toBeGreaterThan(0);
			}
		});
	});

	describe('getCountryName', () => {
		it('should return full name + code for valid code', () => {
			expect(getCountryName('NL')).toBe('Netherlands (NL)');
			expect(getCountryName('DE')).toBe('Germany (DE)');
			expect(getCountryName('US')).toBe('United States (US)');
			expect(getCountryName('MX')).toBe('Mexico (MX)');
		});

		it('should return the code itself for unknown code', () => {
			expect(getCountryName('ZZ')).toBe('ZZ');
			expect(getCountryName('XX')).toBe('XX');
		});
	});
});
