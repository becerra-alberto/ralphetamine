import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ImportPreview from '../../components/import/ImportPreview.svelte';
import type { PreviewTransaction } from '$lib/utils/columnDetection';
import type { DuplicateCheckResult, ImportSummary } from '$lib/utils/duplicateDetection';

function mockPreview(overrides: Partial<PreviewTransaction> = {}): PreviewTransaction {
	return {
		date: '2025-01-15',
		payee: 'Test Payee',
		amountCents: -5000,
		memo: '',
		category: '',
		...overrides
	};
}

const transactions: PreviewTransaction[] = Array.from({ length: 15 }, (_, i) =>
	mockPreview({
		date: `2025-01-${String(i + 1).padStart(2, '0')}`,
		payee: `Payee ${i + 1}`,
		amountCents: -(i + 1) * 1000
	})
);

const noDuplicates: DuplicateCheckResult = {
	duplicates: [],
	cleanCount: 15,
	totalCount: 15
};

const withDuplicates: DuplicateCheckResult = {
	duplicates: [
		{
			importIndex: 0,
			imported: transactions[0],
			existing: {
				id: 'tx-1',
				date: '2025-01-01',
				payee: 'Payee 1',
				categoryId: null,
				memo: null,
				amountCents: -1000,
				accountId: 'acc-1',
				tags: [],
				isReconciled: false,
				importSource: null,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			},
			confidence: 'exact',
			include: false
		}
	],
	cleanCount: 14,
	totalCount: 15
};

const summaryNoDups: ImportSummary = {
	totalTransactions: 15,
	duplicatesFound: 0,
	dateRange: { earliest: '2025-01-01', latest: '2025-01-15' },
	toImport: 15
};

const summaryWithDups: ImportSummary = {
	totalTransactions: 15,
	duplicatesFound: 1,
	dateRange: { earliest: '2025-01-01', latest: '2025-01-15' },
	toImport: 14
};

describe('ImportPreview', () => {
	it('should render the component', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview')).toBeTruthy();
	});

	it('should show title and subtitle', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview-title').textContent).toContain('Review Import');
		expect(screen.getByTestId('import-preview-subtitle').textContent).toContain('Check your transactions');
	});

	it('should display total transaction count', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview-total').textContent).toBe('15');
	});

	it('should display duplicate count', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryWithDups, duplicateResult: withDuplicates }
		});
		expect(screen.getByTestId('import-preview-duplicates').textContent).toBe('1');
	});

	it('should display date range', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview-date-range').textContent).toContain('2025-01-01');
		expect(screen.getByTestId('import-preview-date-range').textContent).toContain('2025-01-15');
	});

	it('should display to-import count', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryWithDups, duplicateResult: withDuplicates }
		});
		expect(screen.getByTestId('import-preview-to-import').textContent).toBe('14');
	});

	it('should show first 10 rows in preview table', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview-row-0')).toBeTruthy();
		expect(screen.getByTestId('import-preview-row-9')).toBeTruthy();
		expect(screen.queryByTestId('import-preview-row-10')).toBeNull();
	});

	it('should show "Show more" button when more than 10 transactions', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview-show-more')).toBeTruthy();
	});

	it('should not show "Show more" when 10 or fewer transactions', () => {
		const fewTransactions = transactions.slice(0, 5);
		const fewSummary: ImportSummary = { ...summaryNoDups, totalTransactions: 5, toImport: 5 };
		const fewDups: DuplicateCheckResult = { duplicates: [], cleanCount: 5, totalCount: 5 };
		render(ImportPreview, {
			props: { transactions: fewTransactions, summary: fewSummary, duplicateResult: fewDups }
		});
		expect(screen.queryByTestId('import-preview-show-more')).toBeNull();
	});

	it('should show duplicate options when duplicates exist', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryWithDups, duplicateResult: withDuplicates }
		});
		expect(screen.getByTestId('import-preview-duplicate-options')).toBeTruthy();
		expect(screen.getByTestId('import-preview-option-skip')).toBeTruthy();
		expect(screen.getByTestId('import-preview-option-import-all')).toBeTruthy();
		expect(screen.getByTestId('import-preview-option-review')).toBeTruthy();
	});

	it('should not show duplicate options when no duplicates', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.queryByTestId('import-preview-duplicate-options')).toBeNull();
	});

	it('should show table title with count', () => {
		render(ImportPreview, {
			props: { transactions, summary: summaryNoDups, duplicateResult: noDuplicates }
		});
		expect(screen.getByTestId('import-preview-table-title').textContent).toContain('10 of 15');
	});

	it('should accept custom testId', () => {
		render(ImportPreview, {
			props: {
				transactions,
				summary: summaryNoDups,
				duplicateResult: noDuplicates,
				testId: 'custom-preview'
			}
		});
		expect(screen.getByTestId('custom-preview')).toBeTruthy();
	});
});
