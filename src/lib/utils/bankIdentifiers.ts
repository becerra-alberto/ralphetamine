/**
 * Bank account identifier validation utilities
 *
 * Supports IBAN (international), CLABE (Mexico), and generic bank identifiers.
 */

/** Result of identifying a bank number format */
export type BankNumberFormat = 'iban' | 'clabe' | 'generic';

/** Validation result for a bank number */
export interface BankNumberValidation {
	valid: boolean;
	format: BankNumberFormat;
	error?: string;
}

/**
 * IBAN format: 2 letters + 2 digits + up to 30 alphanumeric characters
 * Examples: NL82BUNQ2071504690, DE89370400440532013000
 */
const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;

/**
 * CLABE format: exactly 18 digits (Mexican bank identifier)
 * Example: 032180000118359719
 */
const CLABE_REGEX = /^\d{18}$/;

/**
 * Check if a value matches IBAN format
 */
export function isIBAN(value: string): boolean {
	return IBAN_REGEX.test(value.trim().toUpperCase().replace(/\s/g, ''));
}

/**
 * Check if a value matches CLABE format (exactly 18 digits)
 */
export function isCLABE(value: string): boolean {
	return CLABE_REGEX.test(value.trim());
}

/**
 * Validate a bank number value.
 * - If it matches IBAN format, returns valid with format 'iban'
 * - If it matches CLABE format (18 digits), returns valid with format 'clabe'
 * - Otherwise, accepts as generic bank identifier (no validation error)
 */
export function validateBankNumber(value: string): BankNumberValidation {
	if (!value || value.trim().length === 0) {
		return { valid: true, format: 'generic' };
	}

	const trimmed = value.trim();
	const normalized = trimmed.toUpperCase().replace(/\s/g, '');

	if (IBAN_REGEX.test(normalized)) {
		return { valid: true, format: 'iban' };
	}

	if (CLABE_REGEX.test(trimmed)) {
		return { valid: true, format: 'clabe' };
	}

	// Generic fallback: accept any non-empty string
	return { valid: true, format: 'generic' };
}

/**
 * Detect the format of a bank number without validation
 */
export function detectBankNumberFormat(value: string): BankNumberFormat {
	if (!value || value.trim().length === 0) {
		return 'generic';
	}

	const trimmed = value.trim();
	const normalized = trimmed.toUpperCase().replace(/\s/g, '');

	if (IBAN_REGEX.test(normalized)) {
		return 'iban';
	}

	if (CLABE_REGEX.test(trimmed)) {
		return 'clabe';
	}

	return 'generic';
}
