import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import BudgetGrid from '../../../components/budget/BudgetGrid.svelte';
import { budgetStore } from '../../../stores/budget';
import type { Category } from '../../../types/category';
import type { Budget } from '../../../types/budget';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('BudgetGrid', () => {
	beforeEach(() => {
		budgetStore.reset();
	});

	describe('rendering', () => {
		it('should render the grid container', () => {
			render(BudgetGrid);
			expect(
				screen.getByRole('region', { name: /budget grid/i })
			).toBeTruthy();
		});

		it('should render with category header column', () => {
			render(BudgetGrid);
			expect(screen.getByRole('columnheader', { name: /categories/i })).toBeTruthy();
		});

		it('should render empty state when no categories', () => {
			render(BudgetGrid);
			expect(screen.getByText(/no budget categories yet/i)).toBeTruthy();
		});

		it('should render empty state hint', () => {
			render(BudgetGrid);
			expect(
				screen.getByText(/add your first budget category/i)
			).toBeTruthy();
		});
	});

	describe('with categories', () => {
		const mockCategories: Category[] = [
			{
				id: 'cat-1',
				name: 'Groceries',
				parentId: null,
				type: 'expense',
				icon: null,
				color: null,
				sortOrder: 0,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			},
			{
				id: 'cat-2',
				name: 'Rent',
				parentId: null,
				type: 'expense',
				icon: null,
				color: null,
				sortOrder: 1,
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			}
		];

		beforeEach(() => {
			budgetStore.setCategories(mockCategories);
		});

		it('should render category rows when categories exist', () => {
			render(BudgetGrid);
			expect(screen.queryByText(/no budget categories yet/i)).not.toBeTruthy();
		});

		it('should render correct number of rows for categories', () => {
			render(BudgetGrid);
			const rows = screen.getAllByTestId('category-row');
			expect(rows).toHaveLength(2);
		});
	});

	describe('month columns', () => {
		it('should have correct number of month columns (12 by default)', () => {
			budgetStore.setCategories([
				{
					id: 'cat-1',
					name: 'Test',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			]);

			render(BudgetGrid);
			const state = get(budgetStore);
			expect(state.months).toHaveLength(12);
		});
	});

	describe('loading state', () => {
		it('should show loading message when isLoading is true', () => {
			budgetStore.setLoading(true);
			render(BudgetGrid);
			expect(screen.getByText(/loading budget data/i)).toBeTruthy();
		});
	});

	describe('error state', () => {
		it('should show error message when error exists', () => {
			budgetStore.setError('Failed to load data');
			render(BudgetGrid);
			expect(screen.getByText(/failed to load data/i)).toBeTruthy();
		});

		it('should have alert role for error state', () => {
			budgetStore.setError('Error occurred');
			render(BudgetGrid);
			expect(screen.getByRole('alert')).toBeTruthy();
		});
	});

	describe('totals row', () => {
		it('should render totals row when categories exist', () => {
			budgetStore.setCategories([
				{
					id: 'cat-1',
					name: 'Test',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			]);
			render(BudgetGrid);
			expect(screen.getByRole('rowheader', { name: /total/i })).toBeTruthy();
		});

		it('should not render totals row when no categories', () => {
			render(BudgetGrid);
			expect(screen.queryByRole('rowheader', { name: /total/i })).not.toBeTruthy();
		});
	});
});
