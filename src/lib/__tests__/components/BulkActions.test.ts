import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import BulkActions from '../../components/transactions/BulkActions.svelte';
import type { PayeePattern } from '../../utils/payeePatterns';

const mockCategories = [
	{
		id: 'cat-income',
		name: 'Income',
		parentId: null,
		type: 'income' as const,
		children: [
			{ id: 'cat-salary', name: 'Salary', parentId: 'cat-income', type: 'income' as const, children: [] }
		]
	},
	{
		id: 'cat-food',
		name: 'Food',
		parentId: null,
		type: 'expense' as const,
		children: []
	}
];

const mockPattern: PayeePattern = {
	payee: 'Albert Heijn',
	count: 5,
	transactionIds: ['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'],
	suggestedCategoryId: 'cat-food',
	suggestedCategoryName: 'Food',
	existingCount: 3
};

describe('BulkActions', () => {
	it('should render the component', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions')).toBeTruthy();
	});

	it('should show progress text', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 3, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-progress-text').textContent).toContain('3 of 10');
	});

	it('should show "All done!" when complete', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 10, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-complete')).toBeTruthy();
	});

	it('should show select all checkbox', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-select-all')).toBeTruthy();
	});

	it('should show selection count when items selected', () => {
		render(BulkActions, {
			props: { selectedCount: 3, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-selection-count').textContent).toContain('3 selected');
	});

	it('should show category assign when selection > 0', () => {
		render(BulkActions, {
			props: { selectedCount: 3, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-category-assign')).toBeTruthy();
	});

	it('should not show category assign when no selection', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [] }
		});
		expect(screen.queryByTestId('bulk-actions-category-assign')).toBeNull();
	});

	it('should show Apply button text with count', () => {
		render(BulkActions, {
			props: { selectedCount: 5, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-apply-btn').textContent).toContain('5 selected');
	});

	it('should show pattern suggestions', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 0, categories: mockCategories, patterns: [mockPattern] }
		});
		expect(screen.getByTestId('bulk-actions-patterns')).toBeTruthy();
		expect(screen.getByTestId('bulk-actions-pattern-0')).toBeTruthy();
	});

	it('should show Done button when complete', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 10, categories: mockCategories, patterns: [] }
		});
		expect(screen.getByTestId('bulk-actions-done-btn')).toBeTruthy();
	});

	it('should show progress bar', () => {
		render(BulkActions, {
			props: { selectedCount: 0, totalCount: 10, categorizedCount: 5, categories: mockCategories, patterns: [] }
		});
		const bar = screen.getByTestId('bulk-actions-progress-bar') as HTMLElement;
		expect(bar.style.width).toBe('50%');
	});
});
