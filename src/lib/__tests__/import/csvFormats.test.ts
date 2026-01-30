import { describe, it, expect } from 'vitest';
import { parseCsv } from '../../utils/csvParser';
import {
	autoDetectMappings,
	buildPreviewTransaction,
	buildPreviewTransactions,
	parseRawDate,
	parseRawAmountToCents,
	type ColumnMapping
} from '../../utils/columnDetection';

/**
 * Integration tests for real CSV format handling.
 * Tests end-to-end: parse CSV → detect columns → build preview transactions.
 */

// === Sample CSV content inline (matching structure of _manual_assets files) ===

const BUNQ_CSV = `"Date","Interest Date","Amount","Account","Counterparty","Name","Description"
"2026-01-12","2026-01-12","-24.99","NL82BUNQ2071504690","NL00BUNQ0123456789","Albert Heijn","Groceries for the week"
"2026-01-11","2026-01-11","1500.00","NL82BUNQ2071504690","NL00INGB0001234567","Employer B.V.","Salary January"
"2026-01-10","2026-01-10","-3.50","NL82BUNQ2071504690","","Coffee Shop","Latte"`;

const WISE_CSV = `ID,Status,Direction,"Created on","Finished on","Source fee amount","Source fee currency","Target fee amount","Target fee currency","Source name","Source amount (after fees)","Source currency","Target name","Target amount (after fees)","Target currency","Exchange rate",Reference,Batch,"Created by",Category,Note
"CARD_TRANSACTION-001",COMPLETED,OUT,"2026-01-12 18:02:22","2026-01-12 18:02:22",0.00,EUR,,,"Alberto Becerra",24.99,EUR,Apple,24.99,EUR,1.0000000000000000,,,"Alberto Becerra",Shopping,
"CARD_TRANSACTION-002",COMPLETED,OUT,"2026-01-11 10:33:09","2026-01-11 10:33:09",0.00,EUR,,,"Alberto Becerra",5.40,EUR,Fastmail,5.40,EUR,1.0000000000000000,,,"Alberto Becerra",Entertainment,
"TRANSFER-003",COMPLETED,IN,"2026-01-10 08:00:00","2026-01-10 08:00:00",0.00,EUR,,,"Mom",500.00,EUR,"Alberto Becerra",500.00,EUR,1.0000000000000000,,,"Alberto Becerra",,
"CARD_TRANSACTION-004",COMPLETED,OUT,"2026-01-09 04:45:55","2026-01-09 04:45:55",0.02,EUR,,,"Alberto Becerra",3.09,EUR,Uber,64.75,MXN,20.9300000000000000,,,"Alberto Becerra",Transport,`;

const CONSOLIDATED_CSV = `Source,Account,Account_Friendly_Name,Date,Amount,Amount_EUR,Currency,Counterparty,Counterparty_Name,Description,Is_Internal_Transfer,BUNQ_Interest_Date,ING_Code,ING_Debit_Credit,ING_Transaction_Type,ING_Notifications,ING_Resulting_Balance,ING_Tag,Wise_ID,Wise_Status,Wise_Direction,Wise_Created_On,Wise_Finished_On,Wise_Source_Fee_Amount,Wise_Source_Fee_Currency,Wise_Target_Fee_Amount,Wise_Target_Fee_Currency,Wise_Source_Name,Wise_Source_Amount,Wise_Source_Currency,Wise_Target_Name,Wise_Target_Amount,Wise_Target_Currency,Wise_Exchange_Rate,Wise_Reference,Wise_Batch,Wise_Created_By,Wise_Category,Wise_Note
BUNQ,NL02BUNQ2071500601,Groceries,2026-01-14,-3.28,-3.28,EUR,,UBER   *EATS,"UBER   *EATS Amsterdam, NL 67.73 MXN, 1 MXN = 0.04843 EUR",False,2026-01-13,,,,,,,,,,,,,,,,,,,,,,,,,,,
BUNQ,NL02BUNQ2071500601,Groceries,2026-01-14,-3.78,-3.78,EUR,,OXXO AMSTERDAM,"OXXO AMSTERDAM MEXICO CITY, MX 78.00 MXN, 1 MXN = 0.04846 EUR",False,2026-02-01,,,,,,,,,,,,,,,,,,,,,,,,,,,
WISE,EUR_Wise,Wise EUR,2026-01-13,-24.99,-24.99,EUR,,Apple,"Apple subscription",False,,,,,,,,CARD-001,COMPLETED,OUT,"2026-01-13 10:00:00","2026-01-13 10:00:00",0.00,EUR,,,24.99,EUR,Apple,24.99,EUR,1.0,,,,Shopping,`;

describe('BUNQ CSV end-to-end', () => {
	it('should parse BUNQ CSV and auto-detect Date, Amount, Name columns', () => {
		const parsed = parseCsv(BUNQ_CSV);
		expect(parsed.headers).toEqual([
			'Date', 'Interest Date', 'Amount', 'Account', 'Counterparty', 'Name', 'Description'
		]);
		expect(parsed.rows).toHaveLength(3);

		// Auto-detect mappings
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		// Date should be detected
		const dateMapping = mappings.find(m => m.field === 'date');
		expect(dateMapping).toBeDefined();
		expect(dateMapping!.columnHeader).toBe('Date');

		// Amount should be detected
		const amountMapping = mappings.find(m => m.field === 'amount');
		expect(amountMapping).toBeDefined();
		expect(amountMapping!.columnHeader).toBe('Amount');

		// Name or Description should be detected as payee
		const payeeMapping = mappings.find(m => m.field === 'payee');
		expect(payeeMapping).toBeDefined();
	});

	it('should build correct preview transactions from BUNQ CSV', () => {
		const parsed = parseCsv(BUNQ_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);
		const result = buildPreviewTransactions(parsed.rows, mappings);

		expect(result.transactions).toHaveLength(3);

		// First row: negative amount
		const tx0 = result.transactions[0];
		expect(tx0.date).toBe('2026-01-12');
		expect(tx0.amountCents).toBe(-2499);

		// Second row: positive salary
		const tx1 = result.transactions[1];
		expect(tx1.date).toBe('2026-01-11');
		expect(tx1.amountCents).toBe(150000);

		// Third row: small purchase
		const tx2 = result.transactions[2];
		expect(tx2.amountCents).toBe(-350);
	});
});

describe('Wise CSV end-to-end', () => {
	it('should parse Wise CSV and detect Created on as date', () => {
		const parsed = parseCsv(WISE_CSV);
		expect(parsed.headers).toContain('Created on');
		expect(parsed.rows).toHaveLength(4);

		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		// "Created on" should be detected as date
		const dateMapping = mappings.find(m => m.field === 'date');
		expect(dateMapping).toBeDefined();
		expect(dateMapping!.columnHeader).toBe('Created on');
	});

	it('should parse Wise datetime format correctly', () => {
		// Wise uses "2026-01-12 18:02:22" format
		expect(parseRawDate('2026-01-12 18:02:22')).toBe('2026-01-12');
		expect(parseRawDate('2026-01-11 10:33:09')).toBe('2026-01-11');
	});

	it('should detect Source amount (after fees) as amount', () => {
		const parsed = parseCsv(WISE_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		const amountMapping = mappings.find(m => m.field === 'amount');
		expect(amountMapping).toBeDefined();
		expect(amountMapping!.columnHeader).toBe('Source amount (after fees)');
	});

	it('should detect Target name as payee', () => {
		const parsed = parseCsv(WISE_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		const payeeMapping = mappings.find(m => m.field === 'payee');
		expect(payeeMapping).toBeDefined();
		expect(payeeMapping!.columnHeader).toBe('Target name');
	});

	it('should build preview transactions from Wise CSV with correct dates', () => {
		const parsed = parseCsv(WISE_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);
		const result = buildPreviewTransactions(parsed.rows, mappings);

		expect(result.transactions).toHaveLength(4);
		expect(result.transactions[0].date).toBe('2026-01-12');
		expect(result.transactions[1].date).toBe('2026-01-11');
		expect(result.transactions[2].date).toBe('2026-01-10');
		expect(result.transactions[3].date).toBe('2026-01-09');
	});

	it('should parse multi-currency amounts', () => {
		// EUR amounts
		expect(parseRawAmountToCents('24.99')).toBe(2499);
		expect(parseRawAmountToCents('5.40')).toBe(540);
		expect(parseRawAmountToCents('500.00')).toBe(50000);
		// MXN amount
		expect(parseRawAmountToCents('64.75')).toBe(6475);
	});
});

describe('Consolidated CSV end-to-end', () => {
	it('should parse consolidated 39-column CSV', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		expect(parsed.headers).toContain('Source');
		expect(parsed.headers).toContain('Account');
		expect(parsed.headers).toContain('Date');
		expect(parsed.headers).toContain('Amount');
		expect(parsed.headers).toContain('Counterparty_Name');
		expect(parsed.headers).toContain('Description');
		expect(parsed.rows).toHaveLength(3);
	});

	it('should detect Account column for IBAN mapping', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		const accountMapping = mappings.find(m => m.field === 'account');
		expect(accountMapping).toBeDefined();
		expect(accountMapping!.columnHeader).toBe('Account');
	});

	it('should detect Date column', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		const dateMapping = mappings.find(m => m.field === 'date');
		expect(dateMapping).toBeDefined();
		expect(dateMapping!.columnHeader).toBe('Date');
	});

	it('should detect Amount column', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		const amountMapping = mappings.find(m => m.field === 'amount');
		expect(amountMapping).toBeDefined();
		expect(amountMapping!.columnHeader).toBe('Amount');
	});

	it('should detect Description or Counterparty_Name as payee', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);

		const payeeMapping = mappings.find(m => m.field === 'payee');
		expect(payeeMapping).toBeDefined();
	});

	it('should build correct preview transactions from consolidated CSV', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		const mappings = autoDetectMappings(parsed.headers, parsed.rows[0]);
		const result = buildPreviewTransactions(parsed.rows, mappings);

		expect(result.transactions).toHaveLength(3);
		expect(result.transactions[0].date).toBe('2026-01-14');
		expect(result.transactions[0].amountCents).toBe(-328);
		expect(result.transactions[1].amountCents).toBe(-378);
		expect(result.transactions[2].amountCents).toBe(-2499);
	});

	it('should have Source column available for mapping', () => {
		const parsed = parseCsv(CONSOLIDATED_CSV);
		expect(parsed.headers).toContain('Source');
		// Source is available as a header even if not auto-detected
		const sourceIdx = parsed.headers.indexOf('Source');
		expect(sourceIdx).toBeGreaterThanOrEqual(0);
		// Verify rows contain source values
		expect(parsed.rows[0][sourceIdx]).toBe('BUNQ');
		expect(parsed.rows[2][sourceIdx]).toBe('WISE');
	});
});

describe('Partial import: valid rows succeed despite failed rows', () => {
	it('should separate valid and invalid rows with correct error tracking', () => {
		const csv = `Date,Payee,Amount
2025-01-01,Store A,50.00
invalid-date,Store B,30.00
2025-01-03,,25.00
2025-01-04,Store D,100.00`;

		const parsed = parseCsv(csv);
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store A', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' }
		];

		const result = buildPreviewTransactions(parsed.rows, mappings);

		// All 4 rows produce transactions (to preserve indices)
		expect(result.transactions).toHaveLength(4);

		// 2 rows have errors (invalid date on row 3, missing payee on row 4)
		expect(result.errors).toHaveLength(2);

		// Error on row 3 (CSV row 3 = data row 2, but rowNumber = i+2)
		expect(result.errors[0].row).toBe(3); // header=1, data starts at 2
		expect(result.errors[0].message).toContain('Row 3');
		expect(result.errors[0].message).toContain('invalid-date');

		// Error on row 4
		expect(result.errors[1].row).toBe(4);
		expect(result.errors[1].message).toContain('Row 4');
		expect(result.errors[1].message).toContain('Missing payee');

		// Valid transactions still have correct data
		expect(result.transactions[0].date).toBe('2025-01-01');
		expect(result.transactions[0].payee).toBe('Store A');
		expect(result.transactions[0].amountCents).toBe(5000);

		expect(result.transactions[3].date).toBe('2025-01-04');
		expect(result.transactions[3].payee).toBe('Store D');
		expect(result.transactions[3].amountCents).toBe(10000);
	});

	it('should handle all valid rows with no errors', () => {
		const csv = `Date,Payee,Amount
2025-01-01,Store A,50.00
2025-01-02,Store B,30.00`;

		const parsed = parseCsv(csv);
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store A', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' }
		];

		const result = buildPreviewTransactions(parsed.rows, mappings);
		expect(result.transactions).toHaveLength(2);
		expect(result.errors).toHaveLength(0);
	});

	it('should handle all invalid rows', () => {
		const csv = `Date,Payee,Amount
invalid,Store A,50.00
invalid,Store B,30.00`;

		const parsed = parseCsv(csv);
		const mappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store A', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' }
		];

		const result = buildPreviewTransactions(parsed.rows, mappings);
		expect(result.transactions).toHaveLength(2); // still included for index preservation
		expect(result.errors).toHaveLength(2);
	});
});
