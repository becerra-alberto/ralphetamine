import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MappingPreview from '../../components/import/MappingPreview.svelte';
import type { CsvParseResult } from '$lib/utils/csvParser';
import type { ColumnMapping } from '$lib/utils/columnDetection';

const mockData: CsvParseResult = {
	headers: ['Date', 'Description', 'Amount', 'Notes'],
	rows: [
		['2025-01-01', 'Coffee Shop', '12.50', 'Morning coffee'],
		['2025-01-02', 'Grocery Store', '45.00', 'Weekly groceries'],
		['2025-01-03', 'Gas Station', '30.00', 'Fuel'],
		['2025-01-04', 'Restaurant', '60.00', 'Dinner'],
		['2025-01-05', 'Pharmacy', '15.00', 'Medicine']
	],
	totalRows: 5
};

const fullMappings: ColumnMapping[] = [
	{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
	{ columnIndex: 1, columnHeader: 'Description', sampleValue: 'Coffee Shop', field: 'payee' },
	{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '12.50', field: 'amount' },
	{ columnIndex: 3, columnHeader: 'Notes', sampleValue: 'Morning coffee', field: 'memo' }
];

const partialMappings: ColumnMapping[] = [
	{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
	{ columnIndex: 1, columnHeader: 'Description', sampleValue: 'Coffee Shop', field: 'payee' },
	{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '12.50', field: 'skip' },
	{ columnIndex: 3, columnHeader: 'Notes', sampleValue: 'Morning coffee', field: 'skip' }
];

const allSkipped: ColumnMapping[] = [
	{ columnIndex: 0, columnHeader: 'Col1', sampleValue: '', field: 'skip' },
	{ columnIndex: 1, columnHeader: 'Col2', sampleValue: '', field: 'skip' }
];

describe('MappingPreview', () => {
	it('should render the component', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings } });
		expect(screen.getByTestId('mapping-preview')).toBeTruthy();
	});

	it('should show title', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings } });
		expect(screen.getByTestId('mapping-preview-title').textContent).toContain('Mapped Preview');
	});

	it('should render preview table with mapped columns', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings } });
		expect(screen.getByTestId('mapping-preview-table')).toBeTruthy();
	});

	it('should show field labels as column headers', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings } });
		const table = screen.getByTestId('mapping-preview-table');
		const headers = table.querySelectorAll('th');
		expect(headers[0].textContent).toBe('Date');
		expect(headers[1].textContent).toBe('Payee');
		expect(headers[2].textContent).toBe('Amount');
		expect(headers[3].textContent).toBe('Memo');
	});

	it('should only show non-skip columns', () => {
		render(MappingPreview, { props: { data: mockData, mappings: partialMappings } });
		const table = screen.getByTestId('mapping-preview-table');
		const headers = table.querySelectorAll('th');
		// Only date and payee should show (amount and notes are skipped)
		expect(headers).toHaveLength(2);
		expect(headers[0].textContent).toBe('Date');
		expect(headers[1].textContent).toBe('Payee');
	});

	it('should show empty state when all columns are skipped', () => {
		render(MappingPreview, { props: { data: mockData, mappings: allSkipped } });
		expect(screen.getByTestId('mapping-preview-empty')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-empty').textContent).toContain('No columns mapped');
	});

	it('should show up to 5 preview rows by default', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings } });
		expect(screen.getByTestId('mapping-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-1')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-2')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-3')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-4')).toBeTruthy();
		expect(screen.queryByTestId('mapping-preview-row-5')).toBeNull();
	});

	it('should respect maxRows prop', () => {
		render(MappingPreview, {
			props: { data: mockData, mappings: fullMappings, maxRows: 2 }
		});
		expect(screen.getByTestId('mapping-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-1')).toBeTruthy();
		expect(screen.queryByTestId('mapping-preview-row-2')).toBeNull();
	});

	it('should display data values in preview cells', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings } });
		const row0 = screen.getByTestId('mapping-preview-row-0');
		const cells = row0.querySelectorAll('td');
		expect(cells[0].textContent).toBe('2025-01-01');
		expect(cells[1].textContent).toBe('Coffee Shop');
		expect(cells[2].textContent).toBe('+12.50');
		expect(cells[3].textContent).toBe('Morning coffee');
	});

	it('should accept custom testId', () => {
		render(MappingPreview, {
			props: { data: mockData, mappings: fullMappings, testId: 'custom-preview' }
		});
		expect(screen.getByTestId('custom-preview')).toBeTruthy();
	});

	it('should parse dates in preview (DD/MM/YYYY -> YYYY-MM-DD)', () => {
		const dateData: CsvParseResult = {
			headers: ['Date', 'Payee', 'Amount'],
			rows: [['28/01/2025', 'Store', '50.00']],
			totalRows: 1
		};
		const dateMappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '28/01/2025', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' }
		];
		render(MappingPreview, { props: { data: dateData, mappings: dateMappings } });
		const row = screen.getByTestId('mapping-preview-row-0');
		const cells = row.querySelectorAll('td');
		expect(cells[0].textContent).toBe('2025-01-28');
	});

	it('should convert amount with comma decimals (European format)', () => {
		const euroData: CsvParseResult = {
			headers: ['Date', 'Payee', 'Amount'],
			rows: [['2025-01-01', 'Shop', '1.234,56']],
			totalRows: 1
		};
		const euroMappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Shop', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '1.234,56', field: 'amount' }
		];
		render(MappingPreview, { props: { data: euroData, mappings: euroMappings } });
		const row = screen.getByTestId('mapping-preview-row-0');
		const cells = row.querySelectorAll('td');
		// 1234.56 in cents = 123456, displayed as +1234.56
		expect(cells[2].textContent).toBe('+1234.56');
	});

	it('should display negative amounts with minus sign', () => {
		const negData: CsvParseResult = {
			headers: ['Date', 'Payee', 'Amount'],
			rows: [['2025-01-01', 'Shop', '-50.00']],
			totalRows: 1
		};
		const negMappings: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Shop', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '-50.00', field: 'amount' }
		];
		render(MappingPreview, { props: { data: negData, mappings: negMappings } });
		const row = screen.getByTestId('mapping-preview-row-0');
		const cells = row.querySelectorAll('td');
		expect(cells[2].textContent).toBe('-50.00');
	});

	it('should show 3-5 rows in preview', () => {
		render(MappingPreview, { props: { data: mockData, mappings: fullMappings, maxRows: 3 } });
		expect(screen.getByTestId('mapping-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-1')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-2')).toBeTruthy();
		expect(screen.queryByTestId('mapping-preview-row-3')).toBeNull();
	});
});
