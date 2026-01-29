import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CategoryRow from '../../../components/budget/CategoryRow.svelte';
import type { Category } from '../../../types/category';
import type { BudgetCell } from '../../../stores/budget';

describe('CategoryRow', () => {
	const mockCategory: Category = {
		id: 'cat-1',
		name: 'Groceries',
		parentId: null,
		type: 'expense',
		icon: null,
		color: null,
		sortOrder: 0,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	};

	const createMockCell = (budgeted: number, actual: number): BudgetCell => ({
		categoryId: 'cat-1',
		month: '2025-01',
		budgetedCents: budgeted,
		actualCents: actual,
		remainingCents: budgeted - Math.abs(actual)
	});

	describe('rendering', () => {
		it('should render with category name', () => {
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});
			expect(screen.getByText('Groceries')).toBeTruthy();
		});

		it('should have row role', () => {
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});
			expect(screen.getByRole('row')).toBeTruthy();
		});

		it('should have rowheader for category name', () => {
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});
			expect(screen.getByRole('rowheader')).toBeTruthy();
		});

		it('should have data-testid attribute', () => {
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});
			expect(screen.getByTestId('category-row')).toBeTruthy();
		});

		it('should have data-category-id attribute', () => {
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});
			const row = screen.getByTestId('category-row');
			expect(row.getAttribute('data-category-id')).toBe('cat-1');
		});
	});

	describe('cells', () => {
		it('should render budget cells for each month', () => {
			const cells = new Map<string, BudgetCell>();
			cells.set('2025-01', createMockCell(50000, -35000));
			cells.set('2025-02', createMockCell(50000, -40000));

			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01', '2025-02'],
					currentMonth: '2025-01'
				}
			});

			const budgetCells = screen.getAllByTestId('budget-cell');
			expect(budgetCells).toHaveLength(2);
		});

		it('should show zero amounts when no cell data exists', () => {
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});
			// Should show zero for both budgeted and actual
			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');
			expect(actual.textContent).toContain('0');
			expect(actual.textContent).toContain('€');
			expect(budgeted.textContent).toContain('0');
			expect(budgeted.textContent).toContain('€');
		});

		it('should format budget amounts correctly', () => {
			const cells = new Map<string, BudgetCell>();
			cells.set('2025-01', createMockCell(50000, -35000));

			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});

			// €500.00 for budgeted (en-US locale format)
			expect(screen.getByText('€500.00')).toBeTruthy();
		});
	});

	describe('current month highlighting', () => {
		it('should highlight current month cell', () => {
			const cells = new Map<string, BudgetCell>();
			cells.set('2025-01', createMockCell(50000, -35000));

			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('current-month')).toBe(true);
		});

		it('should not highlight non-current month cell', () => {
			const cells = new Map<string, BudgetCell>();
			cells.set('2025-01', createMockCell(50000, -35000));

			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-02'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('current-month')).toBe(false);
		});
	});

	describe('minimum row height', () => {
		it('should have category-row class for styling', () => {
			// Note: jsdom doesn't process CSS, so we verify the class is applied
			// The CSS rule .category-row { min-height: 48px } is defined in the component
			const cells = new Map<string, BudgetCell>();
			render(CategoryRow, {
				props: {
					category: mockCategory,
					cells,
					months: ['2025-01'],
					currentMonth: '2025-01'
				}
			});

			const row = screen.getByTestId('category-row');
			expect(row.classList.contains('category-row')).toBe(true);
		});
	});
});
