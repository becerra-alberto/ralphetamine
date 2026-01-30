import { describe, it, expect } from 'vitest';
import { parseCsv, isValidCsvFile, readCsvFile, getPreviewRows, type CsvParseResult } from '../../utils/csvParser';
import {
	parseRawDate,
	parseRawAmountToCents,
	buildPreviewTransactions,
	autoDetectMappings,
	type ColumnMapping
} from '../../utils/columnDetection';

describe('parseCsv', () => {
	it('should parse basic CSV with headers and rows', () => {
		const csv = 'Date,Payee,Amount\n2025-01-01,Grocery Store,50.00\n2025-01-02,Gas Station,30.00';
		const result = parseCsv(csv);
		expect(result.headers).toEqual(['Date', 'Payee', 'Amount']);
		expect(result.rows).toHaveLength(2);
		expect(result.totalRows).toBe(2);
		expect(result.rows[0]).toEqual(['2025-01-01', 'Grocery Store', '50.00']);
	});

	it('should handle DD/MM/YYYY date format', () => {
		const csv = 'Date,Amount\n28/01/2025,100.00';
		const result = parseCsv(csv);
		expect(result.rows[0][0]).toBe('28/01/2025');
	});

	it('should handle MM/DD/YYYY date format', () => {
		const csv = 'Date,Amount\n01/28/2025,100.00';
		const result = parseCsv(csv);
		expect(result.rows[0][0]).toBe('01/28/2025');
	});

	it('should handle YYYY-MM-DD (ISO) date format', () => {
		const csv = 'Date,Amount\n2025-01-28,100.00';
		const result = parseCsv(csv);
		expect(result.rows[0][0]).toBe('2025-01-28');
	});

	it('should handle ISO 8601 datetime format', () => {
		const csv = 'Date,Amount\n2025-01-28T10:30:00Z,100.00';
		const result = parseCsv(csv);
		expect(result.rows[0][0]).toBe('2025-01-28T10:30:00Z');
	});

	it('should parse amounts with comma decimals (European: 1.234,56)', () => {
		// European CSVs with semicolon delimiters: unambiguous case with multiple semicolons
		const csv = 'Date;Payee;Amount\n2025-01-01;Store;1.234,56';
		const result = parseCsv(csv);
		expect(result.rows[0][2]).toBe('1.234,56');
	});

	it('should parse amounts with period decimals (US: 1,234.56)', () => {
		const csv = 'Date,Amount\n2025-01-01,"1,234.56"';
		const result = parseCsv(csv);
		expect(result.rows[0][1]).toBe('1,234.56');
	});

	it('should handle amounts with currency symbols', () => {
		const csv = 'Date,Amount\n2025-01-01,"€1,234.56"';
		const result = parseCsv(csv);
		expect(result.rows[0][1]).toBe('€1,234.56');
	});

	it('should handle quoted fields with embedded commas', () => {
		const csv = 'Name,Description,Amount\nJohn,"A long, detailed description",100';
		const result = parseCsv(csv);
		expect(result.rows[0]).toEqual(['John', 'A long, detailed description', '100']);
	});

	it('should handle escaped quotes within quoted fields', () => {
		const csv = 'Name,Description\nJohn,"He said ""hello"" to me"';
		const result = parseCsv(csv);
		expect(result.rows[0][1]).toBe('He said "hello" to me');
	});

	it('should detect semicolon delimiter (European CSV)', () => {
		const csv = 'Date;Payee;Amount\n2025-01-01;Store;50,00';
		const result = parseCsv(csv);
		expect(result.headers).toEqual(['Date', 'Payee', 'Amount']);
		expect(result.rows[0]).toEqual(['2025-01-01', 'Store', '50,00']);
	});

	it('should detect tab delimiter', () => {
		const csv = 'Date\tPayee\tAmount\n2025-01-01\tStore\t50.00';
		const result = parseCsv(csv);
		expect(result.headers).toEqual(['Date', 'Payee', 'Amount']);
		expect(result.rows[0]).toEqual(['2025-01-01', 'Store', '50.00']);
	});

	it('should skip empty rows', () => {
		const csv = 'Date,Amount\n2025-01-01,100\n\n2025-01-02,200\n\n';
		const result = parseCsv(csv);
		expect(result.rows).toHaveLength(2);
	});

	it('should handle Windows-style CRLF line endings', () => {
		const csv = 'Date,Amount\r\n2025-01-01,100\r\n2025-01-02,200';
		const result = parseCsv(csv);
		expect(result.headers).toEqual(['Date', 'Amount']);
		expect(result.rows).toHaveLength(2);
	});

	it('should return empty result for empty content', () => {
		const result = parseCsv('');
		expect(result.headers).toEqual([]);
		expect(result.rows).toEqual([]);
		expect(result.totalRows).toBe(0);
	});

	it('should handle header-only CSV (no data rows)', () => {
		const csv = 'Date,Payee,Amount';
		const result = parseCsv(csv);
		expect(result.headers).toEqual(['Date', 'Payee', 'Amount']);
		expect(result.rows).toEqual([]);
		expect(result.totalRows).toBe(0);
	});

	it('should handle large number of rows', () => {
		const header = 'Date,Payee,Amount';
		const rows = Array.from({ length: 1000 }, (_, i) => `2025-01-01,Payee ${i},${i * 100}`);
		const csv = [header, ...rows].join('\n');
		const result = parseCsv(csv);
		expect(result.totalRows).toBe(1000);
		expect(result.rows[0]).toEqual(['2025-01-01', 'Payee 0', '0']);
		expect(result.rows[999]).toEqual(['2025-01-01', 'Payee 999', '99900']);
	});

	it('should handle rows with inconsistent column counts', () => {
		const csv = 'A,B,C\n1,2\n3,4,5,6';
		const result = parseCsv(csv);
		expect(result.rows).toHaveLength(2);
		// Short row
		expect(result.rows[0]).toEqual(['1', '2']);
		// Long row
		expect(result.rows[1]).toEqual(['3', '4', '5', '6']);
	});

	it('should handle newlines within quoted fields', () => {
		const csv = 'Name,Note\nJohn,"Line 1\nLine 2"';
		const result = parseCsv(csv);
		expect(result.rows[0][1]).toBe('Line 1\nLine 2');
	});
});

describe('isValidCsvFile', () => {
	it('should accept .csv file extension', () => {
		const file = new File(['content'], 'data.csv', { type: 'text/plain' });
		expect(isValidCsvFile(file)).toBe(true);
	});

	it('should accept .CSV uppercase extension', () => {
		const file = new File(['content'], 'data.CSV', { type: 'text/plain' });
		expect(isValidCsvFile(file)).toBe(true);
	});

	it('should accept text/csv MIME type', () => {
		const file = new File(['content'], 'data', { type: 'text/csv' });
		expect(isValidCsvFile(file)).toBe(true);
	});

	it('should accept application/csv MIME type', () => {
		const file = new File(['content'], 'data', { type: 'application/csv' });
		expect(isValidCsvFile(file)).toBe(true);
	});

	it('should reject .xlsx files', () => {
		const file = new File(['content'], 'data.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		expect(isValidCsvFile(file)).toBe(false);
	});

	it('should reject .pdf files', () => {
		const file = new File(['content'], 'report.pdf', { type: 'application/pdf' });
		expect(isValidCsvFile(file)).toBe(false);
	});

	it('should reject .txt files without csv MIME type', () => {
		const file = new File(['content'], 'notes.txt', { type: 'text/plain' });
		expect(isValidCsvFile(file)).toBe(false);
	});
});

describe('readCsvFile', () => {
	it('should parse a valid CSV file', async () => {
		const csv = 'Date,Amount\n2025-01-01,100';
		const file = new File([csv], 'test.csv', { type: 'text/csv' });
		const result = await readCsvFile(file);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.headers).toEqual(['Date', 'Amount']);
			expect(result.data.rows).toHaveLength(1);
		}
	});

	it('should reject non-CSV files', async () => {
		const file = new File(['content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		const result = await readCsvFile(file);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('invalid');
			expect(result.error.message).toBe('Please select a valid CSV file');
		}
	});

	it('should reject empty files', async () => {
		const file = new File([''], 'test.csv', { type: 'text/csv' });
		const result = await readCsvFile(file);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('empty');
		}
	});

	it('should reject files with only whitespace', async () => {
		const file = new File(['   \n\n  '], 'test.csv', { type: 'text/csv' });
		const result = await readCsvFile(file);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('empty');
		}
	});

	it('should reject files exceeding max size', async () => {
		// Create a large content (> 10 MB)
		const large = 'a'.repeat(10 * 1024 * 1024 + 1);
		const file = new File([large], 'big.csv', { type: 'text/csv' });
		const result = await readCsvFile(file);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe('too-large');
		}
	});
});

describe('getPreviewRows', () => {
	it('should return first 5 rows by default', () => {
		const data: CsvParseResult = {
			headers: ['A'],
			rows: Array.from({ length: 10 }, (_, i) => [String(i)]),
			totalRows: 10
		};
		const preview = getPreviewRows(data);
		expect(preview).toHaveLength(5);
		expect(preview[0]).toEqual(['0']);
		expect(preview[4]).toEqual(['4']);
	});

	it('should return all rows if fewer than maxRows', () => {
		const data: CsvParseResult = {
			headers: ['A'],
			rows: [['1'], ['2'], ['3']],
			totalRows: 3
		};
		const preview = getPreviewRows(data);
		expect(preview).toHaveLength(3);
	});

	it('should accept custom maxRows', () => {
		const data: CsvParseResult = {
			headers: ['A'],
			rows: Array.from({ length: 10 }, (_, i) => [String(i)]),
			totalRows: 10
		};
		const preview = getPreviewRows(data, 3);
		expect(preview).toHaveLength(3);
	});
});

describe('parseRawDate', () => {
	it('should parse DD/MM/YYYY format', () => {
		expect(parseRawDate('28/01/2025')).toBe('2025-01-28');
	});

	it('should parse DD/MM/YYYY with single-digit day', () => {
		expect(parseRawDate('5/03/2025')).toBe('2025-03-05');
	});

	it('should parse YYYY-MM-DD format', () => {
		expect(parseRawDate('2025-01-28')).toBe('2025-01-28');
	});

	it('should parse ISO datetime format (2025-01-28T10:30:00Z)', () => {
		expect(parseRawDate('2025-01-28T10:30:00Z')).toBe('2025-01-28');
	});

	it('should parse space-separated datetime (2026-01-12 18:02:22)', () => {
		// Wise format: "2026-01-12 18:02:22"
		expect(parseRawDate('2026-01-12 18:02:22')).toBe('2026-01-12');
	});

	it('should return null for empty string', () => {
		expect(parseRawDate('')).toBeNull();
	});

	it('should return null for invalid date string', () => {
		expect(parseRawDate('not-a-date')).toBeNull();
	});

	it('should parse DD-MM-YYYY with dash separator', () => {
		expect(parseRawDate('15-06-2025')).toBe('2025-06-15');
	});

	it('should parse DD.MM.YYYY with period separator', () => {
		expect(parseRawDate('15.06.2025')).toBe('2025-06-15');
	});
});

describe('parseRawAmountToCents', () => {
	it('should parse European format (1.234,56)', () => {
		expect(parseRawAmountToCents('1.234,56')).toBe(123456);
	});

	it('should parse US format (1,234.56)', () => {
		expect(parseRawAmountToCents('1,234.56')).toBe(123456);
	});

	it('should parse plain format (1234.56)', () => {
		expect(parseRawAmountToCents('1234.56')).toBe(123456);
	});

	it('should parse negative amounts', () => {
		expect(parseRawAmountToCents('-50.00')).toBe(-5000);
	});

	it('should parse amounts with euro symbol', () => {
		expect(parseRawAmountToCents('€50.00')).toBe(5000);
	});

	it('should parse amounts with dollar symbol', () => {
		expect(parseRawAmountToCents('$1,234.56')).toBe(123456);
	});

	it('should return 0 for empty string', () => {
		expect(parseRawAmountToCents('')).toBe(0);
	});

	it('should return 0 for whitespace', () => {
		expect(parseRawAmountToCents('   ')).toBe(0);
	});

	it('should parse European negative format (-1.234,56)', () => {
		expect(parseRawAmountToCents('-1.234,56')).toBe(-123456);
	});

	it('should parse small amounts (0.50)', () => {
		expect(parseRawAmountToCents('0.50')).toBe(50);
	});

	it('should parse amounts without decimals', () => {
		expect(parseRawAmountToCents('100')).toBe(10000);
	});
});

describe('buildPreviewTransactions error reporting', () => {
	const mappings: ColumnMapping[] = [
		{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
		{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
		{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' }
	];

	it('should report error with row number for missing date', () => {
		const rows = [['', 'Store', '50.00']];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].row).toBe(2); // row 2 (header is row 1)
		expect(result.errors[0].column).toBe('Date');
		expect(result.errors[0].message).toContain('Row 2');
		expect(result.errors[0].message).toContain('Missing date');
	});

	it('should report error with row number for unparseable date', () => {
		const rows = [['not-a-date', 'Store', '50.00']];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].row).toBe(2);
		expect(result.errors[0].value).toBe('not-a-date');
		expect(result.errors[0].message).toContain('not-a-date');
		expect(result.errors[0].message).toContain('Date');
	});

	it('should report error with row number for missing payee', () => {
		const rows = [['2025-01-01', '', '50.00']];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].row).toBe(2);
		expect(result.errors[0].column).toBe('Payee');
		expect(result.errors[0].message).toContain('Missing payee');
	});

	it('should report correct row numbers for multiple rows', () => {
		const rows = [
			['2025-01-01', 'Store', '50.00'],  // valid
			['invalid-date', 'Store', '50.00'], // error on row 3
			['2025-01-03', '', '50.00'],         // error on row 4
		];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.transactions).toHaveLength(3); // all rows included
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0].row).toBe(3); // row 3 in CSV
		expect(result.errors[1].row).toBe(4); // row 4 in CSV
	});

	it('should still include transactions for rows with errors (preserving indices)', () => {
		const rows = [['invalid', 'Store', '50.00']];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.transactions).toHaveLength(1);
		expect(result.errors).toHaveLength(1);
	});

	it('should produce no errors for valid data', () => {
		const rows = [
			['2025-01-01', 'Store A', '50.00'],
			['2025-01-02', 'Store B', '-25.50'],
		];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.transactions).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});

	it('should include column value in error', () => {
		const rows = [['garbage-date', 'Store', '50.00']];
		const result = buildPreviewTransactions(rows, mappings);
		expect(result.errors[0].value).toBe('garbage-date');
		expect(result.errors[0].column).toBe('Date');
	});
});
