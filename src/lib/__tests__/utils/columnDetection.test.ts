import { describe, it, expect } from 'vitest';
import {
	autoDetectMappings,
	validateMappings,
	getAvailableFields,
	isInflowOutflowMode,
	toggleAmountMode,
	parseRawAmountToCents,
	parseRawDate,
	buildPreviewTransaction,
	FIELD_LABELS,
	REQUIRED_FIELDS,
	type ColumnMapping,
	type MappableField
} from '../../utils/columnDetection';

describe('columnDetection', () => {
	describe('autoDetectMappings', () => {
		it('should detect English headers', () => {
			const headers = ['Date', 'Description', 'Amount', 'Memo'];
			const firstRow = ['2025-01-01', 'Coffee Shop', '12.50', 'Morning coffee'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result).toHaveLength(4);
			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[2].field).toBe('amount');
			expect(result[3].field).toBe('memo');
		});

		it('should detect Dutch headers', () => {
			const headers = ['Datum', 'Omschrijving', 'Bedrag', 'Opmerkingen'];
			const firstRow = ['01-01-2025', 'Albert Heijn', '25,00', 'Boodschappen'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[2].field).toBe('amount');
			expect(result[3].field).toBe('memo');
		});

		it('should detect German headers', () => {
			const headers = ['Datum', 'Beschreibung', 'Betrag', 'Notizen'];
			const firstRow = ['01.01.2025', 'Lidl', '15,00', 'Einkauf'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[2].field).toBe('amount');
			expect(result[3].field).toBe('memo');
		});

		it('should detect inflow/outflow columns', () => {
			const headers = ['Date', 'Name', 'Credit', 'Debit'];
			const firstRow = ['2025-01-01', 'Salary', '3000.00', ''];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[2].field).toBe('inflow');
			expect(result[3].field).toBe('outflow');
		});

		it('should detect Bij/Af (Dutch inflow/outflow)', () => {
			const headers = ['Datum', 'Omschrijving', 'Bij', 'Af'];
			const firstRow = ['01-01-2025', 'Salaris', '3000,00', ''];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[2].field).toBe('inflow');
			expect(result[3].field).toBe('outflow');
		});

		it('should be case-insensitive', () => {
			const headers = ['DATE', 'DESCRIPTION', 'AMOUNT'];
			const firstRow = ['2025-01-01', 'Store', '10.00'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[2].field).toBe('amount');
		});

		it('should match partial headers containing patterns', () => {
			const headers = ['Transaction Date', 'Counterparty Name', 'Total Amount'];
			const firstRow = ['2025-01-01', 'Shop', '10.00'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[2].field).toBe('amount');
		});

		it('should skip unrecognized columns', () => {
			const headers = ['Date', 'Payee', 'Amount', 'Some Random Col'];
			const firstRow = ['2025-01-01', 'Shop', '10.00', 'xyz'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[3].field).toBe('skip');
		});

		it('should not assign the same field twice', () => {
			const headers = ['Date', 'Transaction Date', 'Amount'];
			const firstRow = ['2025-01-01', '2025-01-01', '10.00'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('skip');
			expect(result[2].field).toBe('amount');
		});

		it('should include sample values from first row', () => {
			const headers = ['Date', 'Amount'];
			const firstRow = ['2025-01-01', '42.50'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].sampleValue).toBe('2025-01-01');
			expect(result[1].sampleValue).toBe('42.50');
		});

		it('should handle empty first row gracefully', () => {
			const headers = ['Date', 'Amount'];
			const firstRow: string[] = [];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[0].sampleValue).toBe('');
			expect(result[1].sampleValue).toBe('');
		});

		it('should detect category column', () => {
			const headers = ['Date', 'Payee', 'Amount', 'Category'];
			const firstRow = ['2025-01-01', 'Shop', '10.00', 'Groceries'];
			const result = autoDetectMappings(headers, firstRow);

			expect(result[3].field).toBe('category');
		});
	});

	describe('validateMappings', () => {
		function makeMappings(fields: MappableField[]): ColumnMapping[] {
			return fields.map((field, i) => ({
				columnIndex: i,
				columnHeader: `Col ${i}`,
				sampleValue: '',
				field
			}));
		}

		it('should pass with date + payee + amount', () => {
			const errors = validateMappings(makeMappings(['date', 'payee', 'amount']));
			expect(errors).toHaveLength(0);
		});

		it('should pass with date + payee + inflow + outflow', () => {
			const errors = validateMappings(makeMappings(['date', 'payee', 'inflow', 'outflow']));
			expect(errors).toHaveLength(0);
		});

		it('should fail when date is missing', () => {
			const errors = validateMappings(makeMappings(['skip', 'payee', 'amount']));
			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.includes('Date'))).toBe(true);
		});

		it('should fail when payee is missing', () => {
			const errors = validateMappings(makeMappings(['date', 'skip', 'amount']));
			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.includes('Payee'))).toBe(true);
		});

		it('should fail when amount/inflow/outflow are all missing', () => {
			const errors = validateMappings(makeMappings(['date', 'payee', 'skip']));
			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.includes('Amount'))).toBe(true);
		});

		it('should fail when only inflow is mapped (no outflow)', () => {
			const errors = validateMappings(makeMappings(['date', 'payee', 'inflow']));
			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.includes('Outflow'))).toBe(true);
		});

		it('should fail when only outflow is mapped (no inflow)', () => {
			const errors = validateMappings(makeMappings(['date', 'payee', 'outflow']));
			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.includes('Inflow'))).toBe(true);
		});

		it('should ignore skip columns', () => {
			const errors = validateMappings(makeMappings(['date', 'payee', 'amount', 'skip', 'skip']));
			expect(errors).toHaveLength(0);
		});

		it('should report multiple missing fields', () => {
			const errors = validateMappings(makeMappings(['skip', 'skip', 'skip']));
			expect(errors.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe('getAvailableFields', () => {
		function makeMappings(fields: MappableField[]): ColumnMapping[] {
			return fields.map((field, i) => ({
				columnIndex: i,
				columnHeader: `Col ${i}`,
				sampleValue: '',
				field
			}));
		}

		it('should include skip option', () => {
			const mappings = makeMappings(['date', 'skip']);
			const options = getAvailableFields(mappings, 1);
			expect(options.some((o) => o.value === 'skip')).toBe(true);
		});

		it('should include current field even if used', () => {
			const mappings = makeMappings(['date', 'payee']);
			const options = getAvailableFields(mappings, 0);
			expect(options.some((o) => o.value === 'date')).toBe(true);
		});

		it('should exclude fields used by other columns', () => {
			const mappings = makeMappings(['date', 'payee', 'skip']);
			const options = getAvailableFields(mappings, 2);
			expect(options.some((o) => o.value === 'date')).toBe(false);
			expect(options.some((o) => o.value === 'payee')).toBe(false);
		});

		it('should hide inflow/outflow when useInflowOutflow is false', () => {
			const mappings = makeMappings(['date', 'skip']);
			const options = getAvailableFields(mappings, 1, false);
			expect(options.some((o) => o.value === 'inflow')).toBe(false);
			expect(options.some((o) => o.value === 'outflow')).toBe(false);
			expect(options.some((o) => o.value === 'amount')).toBe(true);
		});

		it('should hide amount when useInflowOutflow is true', () => {
			const mappings = makeMappings(['date', 'skip']);
			const options = getAvailableFields(mappings, 1, true);
			expect(options.some((o) => o.value === 'amount')).toBe(false);
			expect(options.some((o) => o.value === 'inflow')).toBe(true);
			expect(options.some((o) => o.value === 'outflow')).toBe(true);
		});
	});

	describe('isInflowOutflowMode', () => {
		function makeMappings(fields: MappableField[]): ColumnMapping[] {
			return fields.map((field, i) => ({
				columnIndex: i,
				columnHeader: `Col ${i}`,
				sampleValue: '',
				field
			}));
		}

		it('should return false when using amount', () => {
			expect(isInflowOutflowMode(makeMappings(['date', 'payee', 'amount']))).toBe(false);
		});

		it('should return true when inflow is mapped', () => {
			expect(isInflowOutflowMode(makeMappings(['date', 'payee', 'inflow', 'outflow']))).toBe(true);
		});

		it('should return true when outflow is mapped', () => {
			expect(isInflowOutflowMode(makeMappings(['date', 'payee', 'outflow']))).toBe(true);
		});
	});

	describe('toggleAmountMode', () => {
		function makeMappings(fields: MappableField[]): ColumnMapping[] {
			return fields.map((field, i) => ({
				columnIndex: i,
				columnHeader: `Col ${i}`,
				sampleValue: '',
				field
			}));
		}

		it('should reset amount to skip when switching to inflow/outflow', () => {
			const mappings = makeMappings(['date', 'payee', 'amount']);
			const result = toggleAmountMode(mappings, true);
			expect(result[2].field).toBe('skip');
		});

		it('should reset inflow/outflow to skip when switching to amount', () => {
			const mappings = makeMappings(['date', 'payee', 'inflow', 'outflow']);
			const result = toggleAmountMode(mappings, false);
			expect(result[2].field).toBe('skip');
			expect(result[3].field).toBe('skip');
		});

		it('should not affect non-amount fields', () => {
			const mappings = makeMappings(['date', 'payee', 'amount', 'memo']);
			const result = toggleAmountMode(mappings, true);
			expect(result[0].field).toBe('date');
			expect(result[1].field).toBe('payee');
			expect(result[3].field).toBe('memo');
		});
	});

	describe('parseRawAmountToCents', () => {
		it('should parse US format (1,234.56)', () => {
			expect(parseRawAmountToCents('1,234.56')).toBe(123456);
		});

		it('should parse European format (1.234,56)', () => {
			expect(parseRawAmountToCents('1.234,56')).toBe(123456);
		});

		it('should parse simple decimal (42.50)', () => {
			expect(parseRawAmountToCents('42.50')).toBe(4250);
		});

		it('should parse negative values (-25.00)', () => {
			expect(parseRawAmountToCents('-25.00')).toBe(-2500);
		});

		it('should remove currency symbols', () => {
			expect(parseRawAmountToCents('€42.50')).toBe(4250);
			expect(parseRawAmountToCents('$100.00')).toBe(10000);
			expect(parseRawAmountToCents('£75.00')).toBe(7500);
		});

		it('should handle empty/whitespace input', () => {
			expect(parseRawAmountToCents('')).toBe(0);
			expect(parseRawAmountToCents('  ')).toBe(0);
		});

		it('should handle non-numeric input', () => {
			expect(parseRawAmountToCents('abc')).toBe(0);
		});

		it('should handle integer values', () => {
			expect(parseRawAmountToCents('100')).toBe(10000);
		});
	});

	describe('parseRawDate', () => {
		it('should parse ISO format (YYYY-MM-DD)', () => {
			expect(parseRawDate('2025-01-28')).toBe('2025-01-28');
		});

		it('should parse ISO datetime (YYYY-MM-DDThh:mm:ss)', () => {
			expect(parseRawDate('2025-01-28T10:30:00Z')).toBe('2025-01-28');
		});

		it('should parse DD/MM/YYYY when day > 12', () => {
			expect(parseRawDate('28/01/2025')).toBe('2025-01-28');
		});

		it('should parse MM/DD/YYYY when month <= 12 and day > 12', () => {
			expect(parseRawDate('01/28/2025')).toBe('2025-01-28');
		});

		it('should default ambiguous dates to DD/MM/YYYY', () => {
			// 05/06/2025 is ambiguous; defaults to DD/MM = 5th June
			expect(parseRawDate('05/06/2025')).toBe('2025-06-05');
		});

		it('should parse DD-MM-YYYY', () => {
			expect(parseRawDate('28-01-2025')).toBe('2025-01-28');
		});

		it('should parse DD.MM.YYYY', () => {
			expect(parseRawDate('28.01.2025')).toBe('2025-01-28');
		});

		it('should pad single-digit months and days', () => {
			expect(parseRawDate('2025-1-5')).toBe('2025-01-05');
		});

		it('should return null for empty input', () => {
			expect(parseRawDate('')).toBeNull();
			expect(parseRawDate('  ')).toBeNull();
		});

		it('should return null for unrecognized format', () => {
			expect(parseRawDate('Jan 28 2025')).toBeNull();
		});
	});

	describe('buildPreviewTransaction', () => {
		it('should build transaction from single amount mapping', () => {
			const mappings: ColumnMapping[] = [
				{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
				{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
				{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' },
				{ columnIndex: 3, columnHeader: 'Memo', sampleValue: '', field: 'memo' }
			];
			const row = ['2025-01-28', 'Coffee Shop', '4.50', 'Morning coffee'];
			const result = buildPreviewTransaction(row, mappings);

			expect(result.date).toBe('2025-01-28');
			expect(result.payee).toBe('Coffee Shop');
			expect(result.amountCents).toBe(450);
			expect(result.memo).toBe('Morning coffee');
		});

		it('should build transaction from inflow/outflow mappings', () => {
			const mappings: ColumnMapping[] = [
				{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
				{ columnIndex: 1, columnHeader: 'Name', sampleValue: '', field: 'payee' },
				{ columnIndex: 2, columnHeader: 'Credit', sampleValue: '', field: 'inflow' },
				{ columnIndex: 3, columnHeader: 'Debit', sampleValue: '', field: 'outflow' }
			];
			const row = ['2025-01-28', 'Salary', '3000.00', ''];
			const result = buildPreviewTransaction(row, mappings);

			expect(result.amountCents).toBe(300000);
		});

		it('should subtract outflow from amount', () => {
			const mappings: ColumnMapping[] = [
				{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
				{ columnIndex: 1, columnHeader: 'Name', sampleValue: '', field: 'payee' },
				{ columnIndex: 2, columnHeader: 'Credit', sampleValue: '', field: 'inflow' },
				{ columnIndex: 3, columnHeader: 'Debit', sampleValue: '', field: 'outflow' }
			];
			const row = ['2025-01-28', 'Grocery', '', '50.00'];
			const result = buildPreviewTransaction(row, mappings);

			expect(result.amountCents).toBe(-5000);
		});

		it('should parse date values', () => {
			const mappings: ColumnMapping[] = [
				{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
				{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
				{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' }
			];
			const row = ['28/01/2025', 'Shop', '10.00'];
			const result = buildPreviewTransaction(row, mappings);

			expect(result.date).toBe('2025-01-28');
		});

		it('should handle category mapping', () => {
			const mappings: ColumnMapping[] = [
				{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
				{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
				{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' },
				{ columnIndex: 3, columnHeader: 'Category', sampleValue: '', field: 'category' }
			];
			const row = ['2025-01-28', 'Shop', '10.00', 'Groceries'];
			const result = buildPreviewTransaction(row, mappings);

			expect(result.category).toBe('Groceries');
		});

		it('should skip columns mapped as skip', () => {
			const mappings: ColumnMapping[] = [
				{ columnIndex: 0, columnHeader: 'Date', sampleValue: '', field: 'date' },
				{ columnIndex: 1, columnHeader: 'Payee', sampleValue: '', field: 'payee' },
				{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '', field: 'amount' },
				{ columnIndex: 3, columnHeader: 'Extra', sampleValue: '', field: 'skip' }
			];
			const row = ['2025-01-28', 'Shop', '10.00', 'ignored'];
			const result = buildPreviewTransaction(row, mappings);

			// skip column should not affect result
			expect(result.date).toBe('2025-01-28');
			expect(result.payee).toBe('Shop');
			expect(result.amountCents).toBe(1000);
		});
	});

	describe('FIELD_LABELS', () => {
		it('should have labels for all mappable fields', () => {
			expect(FIELD_LABELS.date).toBe('Date');
			expect(FIELD_LABELS.payee).toBe('Payee');
			expect(FIELD_LABELS.amount).toBe('Amount');
			expect(FIELD_LABELS.inflow).toBe('Inflow');
			expect(FIELD_LABELS.outflow).toBe('Outflow');
			expect(FIELD_LABELS.memo).toBe('Memo');
			expect(FIELD_LABELS.category).toBe('Category');
			expect(FIELD_LABELS.skip).toBe('Skip this column');
		});
	});

	describe('REQUIRED_FIELDS', () => {
		it('should require date and payee', () => {
			expect(REQUIRED_FIELDS).toContain('date');
			expect(REQUIRED_FIELDS).toContain('payee');
		});
	});
});
