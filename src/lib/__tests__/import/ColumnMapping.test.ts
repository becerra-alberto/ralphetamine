import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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

	it('should render instructions banner with correct content', () => {
		render(ColumnMapping, { props: { data: sampleData } });
		const instructions = screen.getByTestId('column-mapping-instructions');
		expect(instructions).toBeTruthy();
		// Banner should show toggle text
		expect(screen.getByText('How to map columns')).toBeTruthy();
		// Content should be visible by default (expanded)
		const content = screen.getByTestId('column-mapping-instructions-content');
		expect(content).toBeTruthy();
		// Should mention required fields
		expect(content.textContent).toContain('Date');
		expect(content.textContent).toContain('Payee');
		expect(content.textContent).toContain('Amount');
		expect(content.textContent).toContain('Inflow');
		expect(content.textContent).toContain('Outflow');
		// Should mention optional fields
		expect(content.textContent).toContain('Memo');
		expect(content.textContent).toContain('Category');
		expect(content.textContent).toContain('Account');
		// Should mention Skip
		expect(content.textContent).toContain('Skip this column');
		// Should mention inflow/outflow mode
		expect(content.textContent).toContain('Inflow/Outflow mode');
	});

	it('should collapse and expand instructions banner', async () => {
		render(ColumnMapping, { props: { data: sampleData } });
		// Initially expanded
		expect(screen.getByTestId('column-mapping-instructions-content')).toBeTruthy();
		const toggleBtn = screen.getByTestId('column-mapping-instructions-toggle');
		expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
		// Click to collapse
		await fireEvent.click(toggleBtn);
		expect(screen.queryByTestId('column-mapping-instructions-content')).toBeNull();
		expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
		// Click to expand again
		await fireEvent.click(toggleBtn);
		expect(screen.getByTestId('column-mapping-instructions-content')).toBeTruthy();
		expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
	});
});
