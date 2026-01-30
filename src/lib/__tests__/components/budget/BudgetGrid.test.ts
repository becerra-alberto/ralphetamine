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

	describe('section headers (Story 8.2)', () => {
		const createCategory = (
			id: string,
			name: string,
			parentId: string | null = null,
			type: 'income' | 'expense' = 'expense',
			sortOrder: number = 0
		): Category => ({
			id,
			name,
			parentId,
			type,
			icon: null,
			color: null,
			sortOrder,
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z'
		});

		const sectionCategories: Category[] = [
			createCategory('cat-income', 'Income', null, 'income', 0),
			createCategory('cat-housing', 'Housing', null, 'expense', 1),
			createCategory('cat-essential', 'Essential', null, 'expense', 2),
			createCategory('cat-lifestyle', 'Lifestyle', null, 'expense', 3),
			createCategory('cat-savings', 'Savings', null, 'expense', 4),
			createCategory('cat-salary', 'Salary', 'cat-income', 'income', 0),
			createCategory('cat-freelance', 'Freelance', 'cat-income', 'income', 1),
			createCategory('cat-rent', 'Rent', 'cat-housing', 'expense', 0),
			createCategory('cat-groceries', 'Groceries', 'cat-essential', 'expense', 0),
			createCategory('cat-utilities', 'Utilities', 'cat-essential', 'expense', 1),
			createCategory('cat-dining', 'Dining Out', 'cat-lifestyle', 'expense', 0),
			createCategory('cat-emergency', 'Emergency Fund', 'cat-savings', 'expense', 0)
		];

		it('should render all 5 section headers', () => {
			budgetStore.setCategories(sectionCategories);
			render(BudgetGrid);

			const sectionHeaders = screen.getAllByTestId('section-header');
			expect(sectionHeaders).toHaveLength(5);
		});

		it('should render section headers with correct names', () => {
			budgetStore.setCategories(sectionCategories);
			render(BudgetGrid);

			expect(screen.getByText('Income')).toBeTruthy();
			expect(screen.getByText('Housing')).toBeTruthy();
			expect(screen.getByText('Essential')).toBeTruthy();
			expect(screen.getByText('Lifestyle')).toBeTruthy();
			expect(screen.getByText('Savings')).toBeTruthy();
		});

		it('should show child categories when section is expanded (default)', () => {
			budgetStore.setCategories(sectionCategories);
			render(BudgetGrid);

			// By default all sections are expanded, so child categories should be visible
			const sectionContents = screen.getAllByTestId('section-content');
			expect(sectionContents.length).toBeGreaterThan(0);

			// Child category names should be visible
			expect(screen.getByText('Salary')).toBeTruthy();
			expect(screen.getByText('Rent')).toBeTruthy();
			expect(screen.getByText('Groceries')).toBeTruthy();
		});
	});
});
