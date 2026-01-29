import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ColumnMapping from '../../components/import/ColumnMapping.svelte';
import type { CsvParseResult } from '$lib/utils/csvParser';

const mockData: CsvParseResult = {
	headers: ['Date', 'Description', 'Amount', 'Notes'],
	rows: [
		['2025-01-01', 'Coffee Shop', '12.50', 'Morning coffee'],
		['2025-01-02', 'Grocery Store', '45.00', 'Weekly groceries'],
		['2025-01-03', 'Gas Station', '30.00', 'Fuel']
	],
	totalRows: 3
};

const dutchData: CsvParseResult = {
	headers: ['Datum', 'Omschrijving', 'Bedrag', 'Opmerkingen'],
	rows: [['01-01-2025', 'Albert Heijn', '25,00', 'Boodschappen']],
	totalRows: 1
};

const inflowOutflowData: CsvParseResult = {
	headers: ['Date', 'Name', 'Credit', 'Debit'],
	rows: [['2025-01-01', 'Salary', '3000.00', '']],
	totalRows: 1
};

describe('ColumnMapping', () => {
	it('should render the component', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping')).toBeTruthy();
	});

	it('should show title and subtitle', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-title').textContent).toContain('Map Columns');
		expect(screen.getByTestId('column-mapping-subtitle').textContent).toContain(
			'Tell us which columns contain which data'
		);
	});

	it('should render one row per column', () => {
		render(ColumnMapping, { props: { data: mockData } });
		// mockData has 4 columns
		expect(screen.getByTestId('column-mapping-row-0')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-row-1')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-row-2')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-row-3')).toBeTruthy();
	});

	it('should auto-detect English column mappings', () => {
		render(ColumnMapping, { props: { data: mockData } });
		// Date should be auto-detected
		const dateSelect = screen.getByTestId('column-mapping-row-0-select') as HTMLSelectElement;
		expect(dateSelect.value).toBe('date');
		// Description -> payee
		const payeeSelect = screen.getByTestId('column-mapping-row-1-select') as HTMLSelectElement;
		expect(payeeSelect.value).toBe('payee');
		// Amount
		const amountSelect = screen.getByTestId('column-mapping-row-2-select') as HTMLSelectElement;
		expect(amountSelect.value).toBe('amount');
	});

	it('should auto-detect Dutch column mappings', () => {
		render(ColumnMapping, { props: { data: dutchData } });
		const dateSelect = screen.getByTestId('column-mapping-row-0-select') as HTMLSelectElement;
		expect(dateSelect.value).toBe('date');
		const payeeSelect = screen.getByTestId('column-mapping-row-1-select') as HTMLSelectElement;
		expect(payeeSelect.value).toBe('payee');
		const amountSelect = screen.getByTestId('column-mapping-row-2-select') as HTMLSelectElement;
		expect(amountSelect.value).toBe('amount');
	});

	it('should show amount mode toggle', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-amount-toggle')).toBeTruthy();
	});

	it('should show save template section', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-save-template')).toBeTruthy();
	});

	it('should show column headers in rows', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-row-0-header').textContent).toBe('Date');
		expect(screen.getByTestId('column-mapping-row-1-header').textContent).toBe('Description');
		expect(screen.getByTestId('column-mapping-row-2-header').textContent).toBe('Amount');
		expect(screen.getByTestId('column-mapping-row-3-header').textContent).toBe('Notes');
	});

	it('should show sample values in rows', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-row-0-sample').textContent).toBe('2025-01-01');
		expect(screen.getByTestId('column-mapping-row-1-sample').textContent).toBe('Coffee Shop');
		expect(screen.getByTestId('column-mapping-row-2-sample').textContent).toBe('12.50');
	});

	it('should include mapping preview', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-preview')).toBeTruthy();
	});

	it('should accept custom testId', () => {
		render(ColumnMapping, { props: { data: mockData, testId: 'custom-mapping' } });
		expect(screen.getByTestId('custom-mapping')).toBeTruthy();
	});

	it('should show validation errors when required fields missing', () => {
		// Data with no recognizable headers -> nothing auto-mapped
		const noMatchData: CsvParseResult = {
			headers: ['Col1', 'Col2', 'Col3'],
			rows: [['a', 'b', 'c']],
			totalRows: 1
		};
		render(ColumnMapping, { props: { data: noMatchData } });
		expect(screen.getByTestId('column-mapping-errors')).toBeTruthy();
	});

	it('should not show validation errors when all required fields mapped', () => {
		render(ColumnMapping, { props: { data: mockData } });
		// Date, Description (payee), Amount are auto-detected
		expect(screen.queryByTestId('column-mapping-errors')).toBeNull();
	});

	it('should show dropdowns for each column', () => {
		render(ColumnMapping, { props: { data: mockData } });
		expect(screen.getByTestId('column-mapping-row-0-select')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-row-1-select')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-row-2-select')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-row-3-select')).toBeTruthy();
	});

	it('should auto-detect inflow/outflow columns', () => {
		render(ColumnMapping, { props: { data: inflowOutflowData } });
		const inflowSelect = screen.getByTestId('column-mapping-row-2-select') as HTMLSelectElement;
		const outflowSelect = screen.getByTestId('column-mapping-row-3-select') as HTMLSelectElement;
		expect(inflowSelect.value).toBe('inflow');
		expect(outflowSelect.value).toBe('outflow');
	});
});
