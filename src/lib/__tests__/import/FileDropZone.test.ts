import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FileDropZone from '../../components/import/FileDropZone.svelte';

describe('FileDropZone', () => {
	it('should render drop zone', () => {
		render(FileDropZone);

		expect(screen.getByTestId('file-drop-zone')).toBeTruthy();
	});

	it('should show "Select File" button', () => {
		render(FileDropZone);

		expect(screen.getByTestId('file-drop-zone-select-btn')).toBeTruthy();
		expect(screen.getByText('Select File')).toBeTruthy();
	});

	it('should show supported formats hint', () => {
		render(FileDropZone);

		expect(screen.getByTestId('file-drop-zone-hint')).toBeTruthy();
		expect(screen.getByText('Supports .csv files')).toBeTruthy();
	});

	it('should show drag & drop text', () => {
		render(FileDropZone);

		expect(screen.getByText('Drag & drop your CSV file here')).toBeTruthy();
	});

	it('should have hidden file input', () => {
		render(FileDropZone);

		const input = screen.getByTestId('file-drop-zone-input') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.type).toBe('file');
		expect(input.accept).toContain('.csv');
	});

	it('should have drag-over class during drag', async () => {
		render(FileDropZone);

		const zone = screen.getByTestId('file-drop-zone');

		await fireEvent.dragOver(zone, { dataTransfer: { files: [] } });

		expect(zone.classList.contains('drag-over')).toBe(true);
	});

	it('should remove drag-over class on drag leave', async () => {
		render(FileDropZone);

		const zone = screen.getByTestId('file-drop-zone');

		await fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
		await fireEvent.dragLeave(zone);

		expect(zone.classList.contains('drag-over')).toBe(false);
	});

	it('should dispatch error for non-CSV file on drop', async () => {
		const handleError = vi.fn();
		render(FileDropZone, {
			events: { error: handleError }
		} as any);

		const zone = screen.getByTestId('file-drop-zone');
		const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

		await fireEvent.drop(zone, {
			dataTransfer: { files: [pdfFile] }
		});

		expect(handleError).toHaveBeenCalledTimes(1);
	});

	it('should dispatch fileSelected for CSV file on drop', async () => {
		const handleFileSelected = vi.fn();
		render(FileDropZone, {
			events: { fileSelected: handleFileSelected }
		} as any);

		const zone = screen.getByTestId('file-drop-zone');
		const csvFile = new File(['Date,Amount\n2025-01-01,100'], 'test.csv', { type: 'text/csv' });

		await fireEvent.drop(zone, {
			dataTransfer: { files: [csvFile] }
		});

		expect(handleFileSelected).toHaveBeenCalledTimes(1);
	});

	it('should accept custom testId', () => {
		render(FileDropZone, { props: { testId: 'custom-zone' } });

		expect(screen.getByTestId('custom-zone')).toBeTruthy();
	});

	it('should have accessible role and label', () => {
		render(FileDropZone);

		const zone = screen.getByTestId('file-drop-zone');
		expect(zone.getAttribute('role')).toBe('button');
		expect(zone.getAttribute('aria-label')).toContain('CSV');
	});
});
