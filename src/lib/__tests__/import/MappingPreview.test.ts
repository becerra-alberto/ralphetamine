import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MappingPreview from '../../components/import/MappingPreview.svelte';
import type { CsvParseResult } from '../../utils/csvParser';
import type { ColumnMapping } from '../../utils/columnDetection';

const sampleData: CsvParseResult = {
	headers: ['Date', 'Payee', 'Amount', 'Memo'],
	rows: [
		['2025-01-01', 'Store A', '50.00', 'Note A'],
		['2025-01-02', 'Store B', '30.00', 'Note B'],
		['2025-01-03', 'Store C', '75.00', 'Note C'],
		['2025-01-04', 'Store D', '25.00', 'Note D'],
		['2025-01-05', 'Store E', '60.00', 'Note E']
	],
	totalRows: 5
};

const sampleMappings: ColumnMapping[] = [
	{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
	{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store A', field: 'payee' },
	{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' },
	{ columnIndex: 3, columnHeader: 'Memo', sampleValue: 'Note A', field: 'memo' }
];

describe('MappingPreview', () => {
	it('should render preview component', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings } });
		expect(screen.getByTestId('mapping-preview')).toBeTruthy();
	});

	it('should display Mapped Preview title', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings } });
		expect(screen.getByTestId('mapping-preview-title').textContent?.trim()).toBe('Mapped Preview');
	});

	it('should render mapped column headers', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings } });
		expect(screen.getByText('Payee')).toBeTruthy();
		expect(screen.getByText('Amount')).toBeTruthy();
		expect(screen.getByText('Memo')).toBeTruthy();
	});

	it('should show 3 preview rows by default', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings } });
		expect(screen.getByTestId('mapping-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-1')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-2')).toBeTruthy();
		expect(screen.queryByTestId('mapping-preview-row-3')).toBeNull();
	});

	it('should display data from mapped columns', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings } });
		expect(screen.getByText('Store A')).toBeTruthy();
		expect(screen.getByText('50.00')).toBeTruthy();
		expect(screen.getByText('Note A')).toBeTruthy();
	});

	it('should exclude skipped columns from preview', () => {
		const mappingsWithSkip: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'Date', sampleValue: '2025-01-01', field: 'date' },
			{ columnIndex: 1, columnHeader: 'Payee', sampleValue: 'Store A', field: 'payee' },
			{ columnIndex: 2, columnHeader: 'Amount', sampleValue: '50.00', field: 'amount' },
			{ columnIndex: 3, columnHeader: 'Extra', sampleValue: 'x', field: 'skip' }
		];
		render(MappingPreview, { props: { data: sampleData, mappings: mappingsWithSkip } });
		expect(screen.queryByText('Skip this column')).toBeNull();
	});

	it('should show empty state when no columns mapped', () => {
		const allSkipped: ColumnMapping[] = [
			{ columnIndex: 0, columnHeader: 'A', sampleValue: '', field: 'skip' },
			{ columnIndex: 1, columnHeader: 'B', sampleValue: '', field: 'skip' }
		];
		render(MappingPreview, { props: { data: sampleData, mappings: allSkipped } });
		expect(screen.getByTestId('mapping-preview-empty')).toBeTruthy();
		expect(screen.getByText('No columns mapped yet')).toBeTruthy();
	});

	it('should render table element when columns are mapped', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings } });
		expect(screen.getByTestId('mapping-preview-table')).toBeTruthy();
	});

	it('should accept custom maxRows', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings, maxRows: 2 } });
		expect(screen.getByTestId('mapping-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('mapping-preview-row-1')).toBeTruthy();
		expect(screen.queryByTestId('mapping-preview-row-2')).toBeNull();
	});

	it('should accept custom testId', () => {
		render(MappingPreview, { props: { data: sampleData, mappings: sampleMappings, testId: 'custom-mp' } });
		expect(screen.getByTestId('custom-mp')).toBeTruthy();
	});
});
