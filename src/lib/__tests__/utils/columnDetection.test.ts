import { describe, it, expect } from 'vitest';
import {
	autoDetectMappings,
	validateMappings,
	getAvailableFields,
	isInflowOutflowMode,
	toggleAmountMode,
	parseRawAmountToCents,
	parseRawDate,
	type ColumnMapping,
	FIELD_LABELS,
	REQUIRED_FIELDS
} from '../../utils/columnDetection';

describe('autoDetectMappings', () => {
	it('should auto-map English column names (Date, Description, Amount, Memo)', () => {
		const headers = ['Date', 'Description', 'Amount', 'Memo'];
		const firstRow = ['2025-01-01', 'Grocery Store', '50.00', 'Weekly groceries'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings).toHaveLength(4);
		expect(mappings[0].field).toBe('date');
		expect(mappings[1].field).toBe('payee');
		expect(mappings[2].field).toBe('amount');
		expect(mappings[3].field).toBe('memo');
	});

	it('should auto-map Dutch column names (Datum, Omschrijving, Bedrag)', () => {
		const headers = ['Datum', 'Omschrijving', 'Bedrag'];
		const firstRow = ['01/02/2025', 'Albert Heijn', '25,50'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[0].field).toBe('date');
		expect(mappings[1].field).toBe('payee');
		expect(mappings[2].field).toBe('amount');
	});

	it('should auto-map German column names (Datum, Beschreibung, Betrag)', () => {
		const headers = ['Datum', 'Beschreibung', 'Betrag', 'Notizen'];
		const firstRow = ['28.01.2025', 'REWE', '45,00', 'Einkauf'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[0].field).toBe('date');
		expect(mappings[1].field).toBe('payee');
		expect(mappings[2].field).toBe('amount');
		expect(mappings[3].field).toBe('memo');
	});

	it('should be case-insensitive for header matching', () => {
		const headers = ['DATE', 'description', 'Amount'];
		const firstRow = ['2025-01-01', 'Store', '100'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[0].field).toBe('date');
		expect(mappings[1].field).toBe('payee');
		expect(mappings[2].field).toBe('amount');
	});

	it('should detect inflow/outflow columns', () => {
		const headers = ['Date', 'Payee', 'Credit', 'Debit'];
		const firstRow = ['2025-01-01', 'Store', '', '50.00'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[2].field).toBe('inflow');
		expect(mappings[3].field).toBe('outflow');
	});

	it('should detect category column', () => {
		const headers = ['Date', 'Description', 'Amount', 'Category'];
		const firstRow = ['2025-01-01', 'Store', '50', 'Groceries'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[3].field).toBe('category');
	});

	it('should assign skip to unrecognized columns', () => {
		const headers = ['Date', 'Payee', 'Amount', 'SomeRandomField'];
		const firstRow = ['2025-01-01', 'Store', '50', 'xyz'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[3].field).toBe('skip');
	});

	it('should not assign same field twice', () => {
		const headers = ['Date', 'Transaction Date', 'Amount'];
		const firstRow = ['2025-01-01', '2025-01-01', '50'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[0].field).toBe('date');
		expect(mappings[1].field).toBe('skip');
		expect(mappings[2].field).toBe('amount');
	});

	it('should include sample values from first row', () => {
		const headers = ['Date', 'Amount'];
		const firstRow = ['2025-01-15', '123.45'];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[0].sampleValue).toBe('2025-01-15');
		expect(mappings[1].sampleValue).toBe('123.45');
	});

	it('should handle empty first row gracefully', () => {
		const headers = ['Date', 'Amount'];
		const firstRow: string[] = [];
		const mappings = autoDetectMappings(headers, firstRow);

		expect(mappings[0].sampleValue).toBe('');
		expect(mappings[1].sampleValue).toBe('');
	});
});

describe('validateMappings', () => {
	it('should return empty errors for valid mappings (date + payee + amount)', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50', field: 'amount' }
		];
		expect(validateMappings(mappings)).toEqual([]);
	});

	it('should return error when Date is missing', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
			{ columnIndex: 1, columnHeader: 'Amount', sampleValue: '50', field: 'amount' }
		];
		const errors = validateMappings(mappings);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.some((e) => e.toLowerCase().includes('date'))).toBe(true);
	});

	it('should return error when Payee is missing', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Amount', sampleValue: '50', field: 'amount' }
		];
		const errors = validateMappings(mappings);
		expect(errors.some((e) => e.toLowerCase().includes('payee'))).toBe(true);
	});

	it('should return error when Amount is missing (no inflow/outflow)', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' }
		];
		const errors = validateMappings(mappings);
		expect(errors.some((e) => e.toLowerCase().includes('amount'))).toBe(true);
	});

	it('should accept inflow + outflow as alternative to amount', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Credit', sampleValue: '50', field: 'inflow' },
			{ columnIndex: 3, columnHeader: 'Debit', sampleValue: '', field: 'outflow' }
		];
		expect(validateMappings(mappings)).toEqual([]);
	});

	it('should return error when only inflow is mapped', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Credit', sampleValue: '50', field: 'inflow' }
		];
		const errors = validateMappings(mappings);
		expect(errors.length).toBeGreaterThan(0);
	});

	it('should ignore skip fields', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50', field: 'amount' },
			{ columnIndex: 3, columnHeader: 'Extra', sampleValue: 'x', field: 'skip' }
		];
		expect(validateMappings(mappings)).toEqual([]);
	});
});

describe('getAvailableFields', () => {
	it('should exclude already-used fields', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'skip' }
		];
		const options = getAvailableFields(mappings, 2);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).not.toContain('date');
		expect(fieldValues).not.toContain('payee');
		expect(fieldValues).toContain('amount');
		expect(fieldValues).toContain('skip');
	});

	it('should always include skip and current field', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
			{ columnIndex: 1, columnHeader: 'X', sampleValue: '', field: 'payee' }
		];
		const options = getAvailableFields(mappings, 0);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).toContain('skip');
		expect(fieldValues).toContain('date');
	});

	it('should hide amount when useInflowOutflow is true', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' }
		];
		const options = getAvailableFields(mappings, 0, true);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).not.toContain('amount');
		expect(fieldValues).toContain('inflow');
		expect(fieldValues).toContain('outflow');
	});

	it('should hide inflow/outflow when useInflowOutflow is false', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' }
		];
		const options = getAvailableFields(mappings, 0, false);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).toContain('amount');
		expect(fieldValues).not.toContain('inflow');
		expect(fieldValues).not.toContain('outflow');
	});

	it('should include account when not used by another column', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' },
			{ columnIndex: 3, columnHeader: 'Extra', sampleValue: '', field: 'skip' }
		];
		const options = getAvailableFields(mappings, 3);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).toContain('account');
	});

	it('should exclude account when used by another column', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' },
			{ columnIndex: 3, columnHeader: 'Account', sampleValue: '', field: 'account' },
			{ columnIndex: 4, columnHeader: 'Extra', sampleValue: '', field: 'skip' }
		];
		const options = getAvailableFields(mappings, 4);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).not.toContain('account');
	});

	it('should always include skip option', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' },
			{ columnIndex: 3, columnHeader: 'Memo', sampleValue: '', field: 'memo' },
			{ columnIndex: 4, columnHeader: 'Category', sampleValue: '', field: 'category' },
			{ columnIndex: 5, columnHeader: 'Account', sampleValue: '', field: 'account' }
		];
		// Even when many fields are used, skip should always be available
		for (let i = 0; i < mappings.length; i++) {
			const options = getAvailableFields(mappings, i);
			const fieldValues = options.map((o) => o.value);
			expect(fieldValues).toContain('skip');
		}
	});

	it('should include current columns field even when used', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Account', sampleValue: '', field: 'account' }
		];
		// Column 2 has 'account' — when viewing its own dropdown, 'account' should still appear
		const options = getAvailableFields(mappings, 2);
		const fieldValues = options.map((o) => o.value);
		expect(fieldValues).toContain('account');
	});
});

describe('isInflowOutflowMode', () => {
	it('should return true when inflow is mapped', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'X', sampleValue: '', field: 'inflow' }
		];
		expect(isInflowOutflowMode(mappings)).toBe(true);
	});

	it('should return false when only amount is mapped', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'X', sampleValue: '', field: 'amount' }
		];
		expect(isInflowOutflowMode(mappings)).toBe(false);
	});
});

describe('toggleAmountMode', () => {
	it('should reset amount to skip when switching to inflow/outflow', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Amount', sampleValue: '', field: 'amount' }
		];
		const result = toggleAmountMode(mappings, true);
		expect(result[0].field).toBe('skip');
	});

	it('should reset inflow/outflow to skip when switching to amount', () => {
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Credit', sampleValue: '', field: 'inflow' },
			{ columnIndex: 1, columnHeader: 'Debit', sampleValue: '', field: 'outflow' }
		];
		const result = toggleAmountMode(mappings, false);
		expect(result[0].field).toBe('skip');
		expect(result[1].field).toBe('skip');
	});
});

describe('parseRawAmountToCents', () => {
	it('should parse US format (1,234.56) to 123456 cents', () => {
		expect(parseRawAmountToCents('1,234.56')).toBe(123456);
	});

	it('should parse European format (1.234,56) to 123456 cents', () => {
		expect(parseRawAmountToCents('1.234,56')).toBe(123456);
	});

	it('should handle negative values', () => {
		expect(parseRawAmountToCents('-50.00')).toBe(-5000);
	});

	it('should strip currency symbols', () => {
		expect(parseRawAmountToCents('€50.00')).toBe(5000);
		expect(parseRawAmountToCents('$100.00')).toBe(10000);
	});

	it('should return 0 for empty string', () => {
		expect(parseRawAmountToCents('')).toBe(0);
	});

	it('should return 0 for invalid input', () => {
		expect(parseRawAmountToCents('abc')).toBe(0);
	});

	it('should handle simple integers', () => {
		expect(parseRawAmountToCents('50')).toBe(5000);
	});
});

describe('parseRawDate', () => {
	it('should parse YYYY-MM-DD', () => {
		expect(parseRawDate('2025-01-28')).toBe('2025-01-28');
	});

	it('should parse DD/MM/YYYY (European)', () => {
		expect(parseRawDate('28/01/2025')).toBe('2025-01-28');
	});

	it('should parse MM/DD/YYYY when second > 12', () => {
		expect(parseRawDate('01/28/2025')).toBe('2025-01-28');
	});

	it('should parse ISO datetime to date', () => {
		expect(parseRawDate('2025-01-28T10:30:00Z')).toBe('2025-01-28');
	});

	it('should return null for invalid dates', () => {
		expect(parseRawDate('not a date')).toBeNull();
	});

	it('should return null for empty string', () => {
		expect(parseRawDate('')).toBeNull();
	});
});

describe('FIELD_LABELS', () => {
	it('should have labels for all field types', () => {
		expect(FIELD_LABELS.date).toBe('Date');
		expect(FIELD_LABELS.payee).toBe('Payee');
		expect(FIELD_LABELS.amount).toBe('Amount');
		expect(FIELD_LABELS.skip).toBe('Skip this column');
	});
});

describe('REQUIRED_FIELDS', () => {
	it('should require date and payee', () => {
		expect(REQUIRED_FIELDS).toContain('date');
		expect(REQUIRED_FIELDS).toContain('payee');
	});
});
