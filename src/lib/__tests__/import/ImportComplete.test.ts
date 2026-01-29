import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ImportComplete from '../../components/import/ImportComplete.svelte';

describe('ImportComplete', () => {
	it('should render the component', () => {
		render(ImportComplete, { props: { importedCount: 10 } });
		expect(screen.getByTestId('import-complete')).toBeTruthy();
	});

	it('should display correct import count', () => {
		render(ImportComplete, { props: { importedCount: 25 } });
		expect(screen.getByTestId('import-complete-title').textContent).toContain('25 transactions');
	});

	it('should display singular text for 1 transaction', () => {
		render(ImportComplete, { props: { importedCount: 1 } });
		const title = screen.getByTestId('import-complete-title').textContent;
		expect(title).toContain('1 transaction');
		expect(title).not.toContain('transactions');
	});

	it('should display skipped count when present', () => {
		render(ImportComplete, { props: { importedCount: 10, skippedCount: 3 } });
		expect(screen.getByTestId('import-complete-skipped').textContent).toContain('3 duplicates');
	});

	it('should not show skipped when zero', () => {
		render(ImportComplete, { props: { importedCount: 10, skippedCount: 0 } });
		expect(screen.queryByTestId('import-complete-skipped')).toBeNull();
	});

	it('should display uncategorized count when present', () => {
		render(ImportComplete, { props: { importedCount: 10, uncategorizedCount: 7 } });
		expect(screen.getByTestId('import-complete-uncategorized').textContent).toContain('7 transactions');
	});

	it('should show singular text for 1 uncategorized', () => {
		render(ImportComplete, { props: { importedCount: 10, uncategorizedCount: 1 } });
		const text = screen.getByTestId('import-complete-uncategorized').textContent;
		expect(text).toContain('1 transaction');
		expect(text).toContain('needs');
	});

	it('should show Categorize now button when uncategorized > 0', () => {
		render(ImportComplete, { props: { importedCount: 10, uncategorizedCount: 5 } });
		expect(screen.getByTestId('import-complete-categorize-btn')).toBeTruthy();
	});

	it('should not show Categorize now button when no uncategorized', () => {
		render(ImportComplete, { props: { importedCount: 10, uncategorizedCount: 0 } });
		expect(screen.queryByTestId('import-complete-categorize-btn')).toBeNull();
	});

	it('should always show Done button', () => {
		render(ImportComplete, { props: { importedCount: 10 } });
		expect(screen.getByTestId('import-complete-done-btn')).toBeTruthy();
	});

	it('should dispatch categorizeNow on Categorize now click', async () => {
		const handleCategorize = vi.fn();
		render(ImportComplete, {
			props: { importedCount: 10, uncategorizedCount: 5 },
			events: { categorizeNow: handleCategorize }
		} as any);

		await fireEvent.click(screen.getByTestId('import-complete-categorize-btn'));
		expect(handleCategorize).toHaveBeenCalledTimes(1);
	});

	it('should dispatch done on Done click', async () => {
		const handleDone = vi.fn();
		render(ImportComplete, {
			props: { importedCount: 10 },
			events: { done: handleDone }
		} as any);

		await fireEvent.click(screen.getByTestId('import-complete-done-btn'));
		expect(handleDone).toHaveBeenCalledTimes(1);
	});
});
