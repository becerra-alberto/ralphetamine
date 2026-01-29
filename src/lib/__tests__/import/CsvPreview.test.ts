import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CsvPreview from '../../components/import/CsvPreview.svelte';
import type { CsvParseResult } from '../../utils/csvParser';

const mockData: CsvParseResult = {
	headers: ['Date', 'Payee', 'Amount'],
	rows: [
		['2025-01-01', 'Groceries', '50.00'],
		['2025-01-02', 'Gas Station', '30.00'],
		['2025-01-03', 'Restaurant', '25.00'],
		['2025-01-04', 'Pharmacy', '15.00'],
		['2025-01-05', 'Coffee Shop', '5.00'],
		['2025-01-06', 'Bookstore', '20.00'],
		['2025-01-07', 'Gym', '40.00']
	],
	totalRows: 7
};

describe('CsvPreview', () => {
	it('should render preview container', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByTestId('csv-preview')).toBeTruthy();
	});

	it('should show preview title', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByTestId('csv-preview-title').textContent).toBe('Preview');
	});

	it('should display column headers', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByText('Date')).toBeTruthy();
		expect(screen.getByText('Payee')).toBeTruthy();
		expect(screen.getByText('Amount')).toBeTruthy();
	});

	it('should display first 5 rows by default', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByTestId('csv-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('csv-preview-row-4')).toBeTruthy();
		expect(screen.queryByTestId('csv-preview-row-5')).toBeNull();
	});

	it('should show row count text', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByTestId('csv-preview-count').textContent).toContain('5 of 7');
	});

	it('should render data cells correctly', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByText('Groceries')).toBeTruthy();
		expect(screen.getByText('50.00')).toBeTruthy();
	});

	it('should respect custom maxRows', () => {
		render(CsvPreview, { props: { data: mockData, maxRows: 3 } });

		expect(screen.getByTestId('csv-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('csv-preview-row-2')).toBeTruthy();
		expect(screen.queryByTestId('csv-preview-row-3')).toBeNull();
	});

	it('should accept custom testId', () => {
		render(CsvPreview, { props: { data: mockData, testId: 'custom-preview' } });

		expect(screen.getByTestId('custom-preview')).toBeTruthy();
	});

	it('should render table element', () => {
		render(CsvPreview, { props: { data: mockData } });

		expect(screen.getByTestId('csv-preview-table')).toBeTruthy();
	});
});
