import { describe, it, expect } from 'vitest';
import {
	isIBAN,
	isCLABE,
	validateBankNumber,
	detectBankNumberFormat
} from '../../utils/bankIdentifiers';

describe('Bank Identifier Validation', () => {
	describe('IBAN validation', () => {
		it('should accept valid IBAN: NL82BUNQ2071504690', () => {
			expect(isIBAN('NL82BUNQ2071504690')).toBe(true);
		});

		it('should accept valid German IBAN: DE89370400440532013000', () => {
			expect(isIBAN('DE89370400440532013000')).toBe(true);
		});

		it('should accept valid Spanish IBAN: ES9121000418450200051332', () => {
			expect(isIBAN('ES9121000418450200051332')).toBe(true);
		});

		it('should accept IBAN with spaces (normalized)', () => {
			expect(isIBAN('NL82 BUNQ 2071 5046 90')).toBe(true);
		});

		it('should accept lowercase IBAN (case-insensitive)', () => {
			expect(isIBAN('nl82bunq2071504690')).toBe(true);
		});

		it('should reject "abc" as invalid IBAN', () => {
			expect(isIBAN('abc')).toBe(false);
		});

		it('should reject empty string', () => {
			expect(isIBAN('')).toBe(false);
		});

		it('should reject number-only strings (not IBAN format)', () => {
			expect(isIBAN('123456789')).toBe(false);
		});

		it('should reject string starting with digits', () => {
			expect(isIBAN('12AB1234567890')).toBe(false);
		});
	});

	describe('CLABE validation', () => {
		it('should accept valid CLABE: exactly 18 digits', () => {
			expect(isCLABE('032180000118359719')).toBe(true);
		});

		it('should accept another valid CLABE', () => {
			expect(isCLABE('012345678901234567')).toBe(true);
		});

		it('should reject 17 digits as invalid CLABE', () => {
			expect(isCLABE('01234567890123456')).toBe(false);
		});

		it('should reject 19 digits as invalid CLABE', () => {
			expect(isCLABE('0123456789012345678')).toBe(false);
		});

		it('should reject CLABE with letters', () => {
			expect(isCLABE('03218000011835971a')).toBe(false);
		});

		it('should reject empty string', () => {
			expect(isCLABE('')).toBe(false);
		});
	});

	describe('Generic fallback', () => {
		it('should accept any string as generic bank identifier', () => {
			const result = validateBankNumber('123-456-789');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('generic');
		});

		it('should accept routing+transit+account combo', () => {
			const result = validateBankNumber('00236-001-1234567');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('generic');
		});

		it('should accept empty string as valid (no bank number is ok)', () => {
			const result = validateBankNumber('');
			expect(result.valid).toBe(true);
		});

		it('should accept whitespace-only as valid', () => {
			const result = validateBankNumber('   ');
			expect(result.valid).toBe(true);
		});
	});

	describe('validateBankNumber', () => {
		it('should detect IBAN format', () => {
			const result = validateBankNumber('NL82BUNQ2071504690');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('iban');
		});

		it('should detect CLABE format', () => {
			const result = validateBankNumber('032180000118359719');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('clabe');
		});

		it('should fallback to generic for unrecognized format', () => {
			const result = validateBankNumber('SOME-BANK-123');
			expect(result.valid).toBe(true);
			expect(result.format).toBe('generic');
		});

		it('should never return invalid (AC6: no validation error for any input)', () => {
			const testValues = [
				'NL82BUNQ2071504690',
				'032180000118359719',
				'123-456-789',
				'ABC',
				'a',
				'12345',
				'routing+transit+account',
				''
			];

			for (const value of testValues) {
				const result = validateBankNumber(value);
				expect(result.valid).toBe(true);
			}
		});
	});

	describe('detectBankNumberFormat', () => {
		it('should detect IBAN', () => {
			expect(detectBankNumberFormat('NL82BUNQ2071504690')).toBe('iban');
		});

		it('should detect CLABE', () => {
			expect(detectBankNumberFormat('032180000118359719')).toBe('clabe');
		});

		it('should return generic for other values', () => {
			expect(detectBankNumberFormat('12345')).toBe('generic');
		});

		it('should return generic for empty string', () => {
			expect(detectBankNumberFormat('')).toBe('generic');
		});
	});
});
