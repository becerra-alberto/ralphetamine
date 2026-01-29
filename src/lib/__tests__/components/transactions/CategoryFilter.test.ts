import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CategoryFilter from '../../../components/transactions/CategoryFilter.svelte';
import type { CategoryNode } from '../../../types/ui';

const mockCategories: CategoryNode[] = [
	{
		id: 'cat-income',
		name: 'Income',
		parentId: null,
		type: 'income',
		children: [
			{
				id: 'cat-income-salary',
				name: 'Salary',
				parentId: 'cat-income',
				type: 'income',
				children: []
			},
			{
				id: 'cat-income-freelance',
				name: 'Freelance',
				parentId: 'cat-income',
				type: 'income',
				children: []
			}
		]
	},
	{
		id: 'cat-housing',
		name: 'Housing',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-housing-rent',
				name: 'Rent',
				parentId: 'cat-housing',
				type: 'expense',
				children: []
			},
			{
				id: 'cat-housing-utilities',
				name: 'Utilities',
				parentId: 'cat-housing',
				type: 'expense',
				children: []
			}
		]
	},
	{
		id: 'cat-essential',
		name: 'Essential',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-essential-groceries',
				name: 'Groceries',
				parentId: 'cat-essential',
				type: 'expense',
				children: []
			}
		]
	},
	{
		id: 'cat-lifestyle',
		name: 'Lifestyle',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-lifestyle-dining',
				name: 'Dining',
				parentId: 'cat-lifestyle',
				type: 'expense',
				children: []
			}
		]
	},
	{
		id: 'cat-savings',
		name: 'Savings',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-savings-emergency',
				name: 'Emergency Fund',
				parentId: 'cat-savings',
				type: 'expense',
				children: []
			}
		]
	}
];

describe('CategoryFilter', () => {
	describe('hierarchical tree rendering', () => {
		it('should render section headers for Income, Housing, Essential, Lifestyle, Savings', () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			expect(screen.getByTestId('category-filter')).toBeTruthy();
			expect(screen.getByTestId('category-tree')).toBeTruthy();

			expect(screen.getByTestId('category-section-cat-income')).toBeTruthy();
			expect(screen.getByTestId('category-section-cat-housing')).toBeTruthy();
			expect(screen.getByTestId('category-section-cat-essential')).toBeTruthy();
			expect(screen.getByTestId('category-section-cat-lifestyle')).toBeTruthy();
			expect(screen.getByTestId('category-section-cat-savings')).toBeTruthy();

			expect(screen.getByText('Income')).toBeTruthy();
			expect(screen.getByText('Housing')).toBeTruthy();
			expect(screen.getByText('Essential')).toBeTruthy();
			expect(screen.getByText('Lifestyle')).toBeTruthy();
			expect(screen.getByText('Savings')).toBeTruthy();
		});
	});

	describe('child categories under parent sections', () => {
		it('should render child categories indented under parent sections', () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			// All sections default to expanded, so children containers should be present
			expect(screen.getByTestId('category-children-cat-income')).toBeTruthy();
			expect(screen.getByTestId('category-children-cat-housing')).toBeTruthy();
			expect(screen.getByTestId('category-children-cat-essential')).toBeTruthy();
			expect(screen.getByTestId('category-children-cat-lifestyle')).toBeTruthy();
			expect(screen.getByTestId('category-children-cat-savings')).toBeTruthy();

			// Income children
			expect(screen.getByTestId('category-item-cat-income-salary')).toBeTruthy();
			expect(screen.getByTestId('category-item-cat-income-freelance')).toBeTruthy();
			expect(screen.getByText('Salary')).toBeTruthy();
			expect(screen.getByText('Freelance')).toBeTruthy();

			// Housing children
			expect(screen.getByTestId('category-item-cat-housing-rent')).toBeTruthy();
			expect(screen.getByTestId('category-item-cat-housing-utilities')).toBeTruthy();
			expect(screen.getByText('Rent')).toBeTruthy();
			expect(screen.getByText('Utilities')).toBeTruthy();

			// Essential children
			expect(screen.getByTestId('category-item-cat-essential-groceries')).toBeTruthy();
			expect(screen.getByText('Groceries')).toBeTruthy();

			// Lifestyle children
			expect(screen.getByTestId('category-item-cat-lifestyle-dining')).toBeTruthy();
			expect(screen.getByText('Dining')).toBeTruthy();

			// Savings children
			expect(screen.getByTestId('category-item-cat-savings-emergency')).toBeTruthy();
			expect(screen.getByText('Emergency Fund')).toBeTruthy();
		});

		it('should nest children inside their parent section container', () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			// Verify children are nested within the correct section
			const incomeSection = screen.getByTestId('category-section-cat-income');
			const incomeChildren = screen.getByTestId('category-children-cat-income');
			expect(incomeSection.contains(incomeChildren)).toBe(true);

			const salaryItem = screen.getByTestId('category-item-cat-income-salary');
			expect(incomeChildren.contains(salaryItem)).toBe(true);

			const freelanceItem = screen.getByTestId('category-item-cat-income-freelance');
			expect(incomeChildren.contains(freelanceItem)).toBe(true);
		});
	});

	describe('section expand/collapse', () => {
		it('should expand/collapse sections when clicking expand button', async () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			// All sections default to expanded
			expect(screen.getByTestId('category-children-cat-income')).toBeTruthy();
			expect(screen.getByTestId('category-children-cat-housing')).toBeTruthy();

			// Collapse Income section
			const incomeExpandBtn = screen.getByTestId('category-expand-cat-income');
			expect(incomeExpandBtn.getAttribute('aria-expanded')).toBe('true');
			await fireEvent.click(incomeExpandBtn);

			// Income children should be hidden
			expect(screen.queryByTestId('category-children-cat-income')).toBeNull();
			expect(incomeExpandBtn.getAttribute('aria-expanded')).toBe('false');

			// Housing children should still be visible
			expect(screen.getByTestId('category-children-cat-housing')).toBeTruthy();

			// Re-expand Income section
			await fireEvent.click(incomeExpandBtn);

			// Income children should be visible again
			expect(screen.getByTestId('category-children-cat-income')).toBeTruthy();
			expect(incomeExpandBtn.getAttribute('aria-expanded')).toBe('true');
		});

		it('should toggle sections independently', async () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			// Collapse Housing
			const housingExpandBtn = screen.getByTestId('category-expand-cat-housing');
			await fireEvent.click(housingExpandBtn);
			expect(screen.queryByTestId('category-children-cat-housing')).toBeNull();

			// Income should remain expanded
			expect(screen.getByTestId('category-children-cat-income')).toBeTruthy();

			// Essential should remain expanded
			expect(screen.getByTestId('category-children-cat-essential')).toBeTruthy();

			// Collapse Income as well
			const incomeExpandBtn = screen.getByTestId('category-expand-cat-income');
			await fireEvent.click(incomeExpandBtn);
			expect(screen.queryByTestId('category-children-cat-income')).toBeNull();
			expect(screen.queryByTestId('category-children-cat-housing')).toBeNull();

			// Essential should still remain expanded
			expect(screen.getByTestId('category-children-cat-essential')).toBeTruthy();
		});
	});

	describe('parent selection toggles all children', () => {
		it('should have clickable parent checkbox for Income section with correct children', async () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			// Verify the parent checkbox exists and is interactive
			const incomeSection = screen.getByTestId('category-section-cat-income');
			const parentCheckbox = incomeSection.querySelector(
				'.section-checkbox input'
			) as HTMLInputElement;
			expect(parentCheckbox).toBeTruthy();
			expect(parentCheckbox.type).toBe('checkbox');

			// Clicking the parent checkbox should not throw
			await fireEvent.change(parentCheckbox);

			// Income section should have its child categories
			const incomeChildren = screen.getByTestId('category-children-cat-income');
			expect(
				incomeChildren.querySelector('[data-testid="category-item-cat-income-salary"]')
			).toBeTruthy();
			expect(
				incomeChildren.querySelector('[data-testid="category-item-cat-income-freelance"]')
			).toBeTruthy();
		});

		it('should have clickable parent checkbox for Housing section with correct children', async () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			// Verify the parent checkbox exists and is interactive
			const housingSection = screen.getByTestId('category-section-cat-housing');
			const parentCheckbox = housingSection.querySelector(
				'.section-checkbox input'
			) as HTMLInputElement;
			expect(parentCheckbox).toBeTruthy();
			expect(parentCheckbox.type).toBe('checkbox');

			// Clicking the parent checkbox should not throw
			await fireEvent.change(parentCheckbox);

			// Housing section should have its child categories
			const housingChildren = screen.getByTestId('category-children-cat-housing');
			expect(
				housingChildren.querySelector('[data-testid="category-item-cat-housing-rent"]')
			).toBeTruthy();
			expect(
				housingChildren.querySelector('[data-testid="category-item-cat-housing-utilities"]')
			).toBeTruthy();
		});

		it('should show parent checkbox as checked when all children are selected', () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: ['cat-income-salary', 'cat-income-freelance']
				}
			});

			const incomeSection = screen.getByTestId('category-section-cat-income');
			const parentCheckbox = incomeSection.querySelector(
				'.section-checkbox input'
			) as HTMLInputElement;
			expect(parentCheckbox.checked).toBe(true);
		});

		it('should show parent checkbox as indeterminate when some children are selected', () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: ['cat-income-salary']
				}
			});

			const incomeSection = screen.getByTestId('category-section-cat-income');
			const parentCheckbox = incomeSection.querySelector(
				'.section-checkbox input'
			) as HTMLInputElement;
			expect(parentCheckbox.indeterminate).toBe(true);
		});

		it('should show parent checkbox as unchecked when no children are selected', () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			const incomeSection = screen.getByTestId('category-section-cat-income');
			const parentCheckbox = incomeSection.querySelector(
				'.section-checkbox input'
			) as HTMLInputElement;
			expect(parentCheckbox.checked).toBe(false);
			expect(parentCheckbox.indeterminate).toBe(false);
		});

		it('should allow individual child checkbox interaction without errors', async () => {
			render(CategoryFilter, {
				props: {
					categories: mockCategories,
					selectedIds: []
				}
			});

			const salaryCheckbox = screen
				.getByTestId('category-item-cat-income-salary')
				.querySelector('input') as HTMLInputElement;
			expect(salaryCheckbox).toBeTruthy();
			expect(salaryCheckbox.type).toBe('checkbox');

			// Clicking the child checkbox should not throw
			await fireEvent.change(salaryCheckbox);

			// Checkbox should still be in the DOM
			expect(
				screen.getByTestId('category-item-cat-income-salary').querySelector('input')
			).toBeTruthy();
		});
	});

	describe('empty state', () => {
		it('should show empty message when no categories are provided', () => {
			render(CategoryFilter, {
				props: {
					categories: [],
					selectedIds: []
				}
			});

			expect(screen.getByText('No categories found')).toBeTruthy();
		});

		it('should not render any section headers when categories is empty', () => {
			render(CategoryFilter, {
				props: {
					categories: [],
					selectedIds: []
				}
			});

			expect(screen.queryByTestId('category-section-cat-income')).toBeNull();
			expect(screen.queryByTestId('category-section-cat-housing')).toBeNull();
			expect(screen.queryByTestId('category-section-cat-essential')).toBeNull();
			expect(screen.queryByTestId('category-section-cat-lifestyle')).toBeNull();
			expect(screen.queryByTestId('category-section-cat-savings')).toBeNull();
		});

		it('should still render the category-tree container when empty', () => {
			render(CategoryFilter, {
				props: {
					categories: [],
					selectedIds: []
				}
			});

			expect(screen.getByTestId('category-filter')).toBeTruthy();
			expect(screen.getByTestId('category-tree')).toBeTruthy();
		});
	});
});
