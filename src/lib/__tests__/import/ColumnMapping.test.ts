import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ColumnMapping from '../../components/import/ColumnMapping.svelte';
import type { CsvParseResult } from '../../utils/csvParser';

const sampleData: CsvParseResult = {
	headers: ['Date', 'Description', 'Amount', 'Notes'],
	rows: [
		['2025-01-01', 'Grocery Store', '50.00', 'Weekly shopping'],
		['2025-01-02', 'Gas Station', '30.00', 'Fill up'],
		['2025-01-03', 'Restaurant', '75.00', 'Dinner']
	],
	totalRows: 3
};

describe('ColumnMapping', () => {
	it('should render column mapping component', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.getByTestId('column-mapping')).toBeTruthy();
	});

	it('should display Map Columns title', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.getByTestId('column-mapping-title').textContent?.trim()).toBe('Map Columns');
	});

	it('should display subtitle', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.getByTestId('column-mapping-subtitle').textContent?.trim()).toBe(
			'Tell us which columns contain which data'
		);
	});

	it('should render a row for each CSV column', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		// ColumnMapping renders ColumnRow for each mapping; check the list container exists
		const list = screen.getByTestId('column-mapping-list');
		expect(list).toBeTruthy();
		// Each column header appears at least once (in ColumnRow, possibly also in preview)
		expect(screen.getAllByText('Date').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Description').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Amount').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Notes').length).toBeGreaterThanOrEqual(1);
	});

	it('should display sample values from first row', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		// Sample values appear in ColumnRow and possibly MappingPreview
		expect(screen.getAllByText('Grocery Store').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('Weekly shopping').length).toBeGreaterThanOrEqual(1);
	});

	it('should auto-detect Date, Payee (Description), Amount columns', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		// The auto-detection should find date, payee (from Description), and amount
		// Verify by checking that no validation errors are shown (all required fields mapped)
		expect(screen.queryByTestId('column-mapping-errors')).toBeNull();
	});

	it('should show amount mode toggle', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.getByTestId('column-mapping-amount-toggle')).toBeTruthy();
	});

	it('should show save template checkbox', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.getByTestId('column-mapping-save-template')).toBeTruthy();
		expect(screen.getByTestId('column-mapping-save-template-checkbox')).toBeTruthy();
	});

	it('should show mapping preview', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.getByTestId('column-mapping-preview')).toBeTruthy();
	});

	it('should not show validation errors when auto-detection fills required fields', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		expect(screen.queryByTestId('column-mapping-errors')).toBeNull();
	});

	it('should show validation errors when required fields are missing', () => {
		const noMatchData: CsvParseResult = {
			headers: ['Col1', 'Col2', 'Col3'],
			rows: [['a', 'b', 'c']],
			totalRows: 1
		};
		render(ColumnMapping, { props: { data: noMatchData } });
		expect(screen.getByTestId('column-mapping-errors')).toBeTruthy();
	});

	it('should accept custom testId', () => {
		render(ColumnMapping, { props: { data: sampleData, testId: 'custom-mapping' } });
		expect(screen.getByTestId('custom-mapping')).toBeTruthy();
	});
});
