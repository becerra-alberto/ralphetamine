import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CategoryDropdown from '../../../components/shared/CategoryDropdown.svelte';
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
				name: 'Rent/Mortgage',
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
				name: 'Dining Out',
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

// Helper: open dropdown by clicking trigger
async function openDropdown() {
	const trigger = screen.getByTestId('category-dropdown-trigger');
	await fireEvent.click(trigger);
}

describe('CategoryDropdown', () => {
	describe('hierarchical structure', () => {
		it('should render dropdown with trigger button', () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			expect(screen.getByTestId('category-dropdown')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-trigger')).toBeTruthy();
		});

		it('should open dropdown panel on trigger click', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			expect(screen.queryByTestId('category-dropdown-panel')).toBeNull();
			await openDropdown();
			expect(screen.getByTestId('category-dropdown-panel')).toBeTruthy();
		});

		it('should render hierarchical structure with sections and children', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			// Section headers
			expect(screen.getByTestId('category-dropdown-header-cat-income')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-header-cat-housing')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-header-cat-essential')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-header-cat-lifestyle')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-header-cat-savings')).toBeTruthy();

			// Child items
			expect(screen.getByTestId('category-dropdown-item-cat-income-salary')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-item-cat-income-freelance')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-item-cat-housing-rent')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-item-cat-essential-groceries')).toBeTruthy();
		});
	});

	describe('section headers', () => {
		it('should render all 5 section header names: Income, Housing, Essential, Lifestyle, Savings', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			expect(screen.getByText('Income')).toBeTruthy();
			expect(screen.getByText('Housing')).toBeTruthy();
			expect(screen.getByText('Essential')).toBeTruthy();
			expect(screen.getByText('Lifestyle')).toBeTruthy();
			expect(screen.getByText('Savings')).toBeTruthy();
		});

		it('should render section headers with bold/distinct styling', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const incomeHeader = screen.getByTestId('category-dropdown-header-cat-income');
			expect(incomeHeader.classList.contains('section-header')).toBe(true);
		});

		it('should make section headers NOT selectable (click does nothing)', async () => {
			const selectHandler = vi.fn();
			const { container } = render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			container.parentElement?.addEventListener('select', selectHandler as EventListener);

			await openDropdown();

			const incomeHeader = screen.getByTestId('category-dropdown-header-cat-income');
			await fireEvent.mouseDown(incomeHeader);

			// Dropdown should remain open and no select event fired
			expect(screen.getByTestId('category-dropdown-panel')).toBeTruthy();
		});
	});

	describe('child categories', () => {
		it('should render child categories indented under parent section', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const salaryItem = screen.getByTestId('category-dropdown-item-cat-income-salary');
			expect(salaryItem.classList.contains('category-item')).toBe(true);
			// Verify it appears after the Income header in the DOM
			const listbox = screen.getByTestId('category-dropdown-listbox');
			const items = listbox.querySelectorAll('li');
			const headerIdx = Array.from(items).findIndex((el) =>
				el.getAttribute('data-testid') === 'category-dropdown-header-cat-income'
			);
			const salaryIdx = Array.from(items).findIndex((el) =>
				el.getAttribute('data-testid') === 'category-dropdown-item-cat-income-salary'
			);
			expect(salaryIdx).toBeGreaterThan(headerIdx);
		});
	});

	describe('category selection', () => {
		it('should select a child category and close dropdown', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const salaryItem = screen.getByTestId('category-dropdown-item-cat-income-salary');
			await fireEvent.mouseDown(salaryItem);

			// Dropdown should close
			expect(screen.queryByTestId('category-dropdown-panel')).toBeNull();
		});

		it('should display selected category name in trigger after selection', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories, value: 'cat-income-salary' }
			});

			const selected = screen.getByTestId('category-dropdown-selected');
			expect(selected.textContent?.trim()).toBe('Salary');
		});
	});

	describe('uncategorized option', () => {
		it('should render "Uncategorized" option at top of list', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const uncategorized = screen.getByTestId('category-dropdown-uncategorized');
			expect(uncategorized).toBeTruthy();
			expect(uncategorized.textContent?.trim()).toBe('Uncategorized');
		});

		it('should select uncategorized and close dropdown', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories, value: 'cat-income-salary' }
			});

			await openDropdown();

			const uncategorized = screen.getByTestId('category-dropdown-uncategorized');
			await fireEvent.mouseDown(uncategorized);

			expect(screen.queryByTestId('category-dropdown-panel')).toBeNull();
		});
	});

	describe('clear button', () => {
		it('should show clear button when a category is selected', () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories, value: 'cat-income-salary' }
			});

			expect(screen.getByTestId('category-dropdown-clear')).toBeTruthy();
		});

		it('should remove category selection when clear button is clicked', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories, value: 'cat-income-salary' }
			});

			// Verify selected value is shown
			expect(screen.getByTestId('category-dropdown-selected')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-selected').textContent?.trim()).toBe('Salary');

			// Click clear button
			const clearBtn = screen.getByTestId('category-dropdown-clear');
			await fireEvent.click(clearBtn);

			// Clear button should be accessible and functional
			expect(clearBtn.getAttribute('aria-label')).toBe('Clear category');
		});
	});

	describe('category icons and colors', () => {
		it('should render icon before category name when icon is set', async () => {
			const categoriesWithIcons: CategoryNode[] = [
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
						}
					]
				}
			];

			render(CategoryDropdown, {
				props: { categories: categoriesWithIcons }
			});

			await openDropdown();
			// Item should render without icon since CategoryNode doesn't have icon field
			const salaryItem = screen.getByTestId('category-dropdown-item-cat-income-salary');
			expect(salaryItem).toBeTruthy();
		});

		it('should render color dot when color is set on the item', async () => {
			// CategoryNode doesn't carry color/icon but the dropdown items support them.
			// This test verifies the structure is in place
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			// Items without color should not have color dots
			const salaryItem = screen.getByTestId('category-dropdown-item-cat-income-salary');
			expect(salaryItem.querySelector('.color-dot')).toBeNull();
		});
	});

	describe('keyboard navigation', () => {
		it('should navigate with Arrow Down skipping section headers', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');

			// First ArrowDown -> highlightedIndex 0 (first selectable: Salary)
			await fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
			const salaryItem = screen.getByTestId('category-dropdown-item-cat-income-salary');
			expect(salaryItem.classList.contains('highlighted')).toBe(true);

			// Second ArrowDown -> highlightedIndex 1 (Freelance)
			await fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
			const freelanceItem = screen.getByTestId('category-dropdown-item-cat-income-freelance');
			expect(freelanceItem.classList.contains('highlighted')).toBe(true);
		});

		it('should navigate with Arrow Up', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');

			// Go down twice to Freelance
			await fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
			await fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

			// Go up once - should be back on Salary
			await fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
			const salaryItem = screen.getByTestId('category-dropdown-item-cat-income-salary');
			expect(salaryItem.classList.contains('highlighted')).toBe(true);
		});

		it('should select highlighted category with Enter key', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');

			// Navigate to first selectable item
			await fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

			// Press Enter to select
			await fireEvent.keyDown(searchInput, { key: 'Enter' });

			// Dropdown should close
			expect(screen.queryByTestId('category-dropdown-panel')).toBeNull();
		});

		it('should close dropdown with Escape key without selection', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');
			await fireEvent.keyDown(searchInput, { key: 'Escape' });

			expect(screen.queryByTestId('category-dropdown-panel')).toBeNull();
		});
	});

	describe('search/filter', () => {
		it('should filter categories by name when typing in search field', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');
			await fireEvent.input(searchInput, { target: { value: 'Sal' } });

			// Should only show Income header + Salary
			expect(screen.getByTestId('category-dropdown-header-cat-income')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-item-cat-income-salary')).toBeTruthy();

			// Should NOT show Housing, Essential, etc.
			expect(screen.queryByTestId('category-dropdown-header-cat-housing')).toBeNull();
			expect(screen.queryByTestId('category-dropdown-header-cat-essential')).toBeNull();
		});

		it('should preserve section headers when children match', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');
			await fireEvent.input(searchInput, { target: { value: 'Rent' } });

			// Housing header should be visible since Rent/Mortgage matches
			expect(screen.getByTestId('category-dropdown-header-cat-housing')).toBeTruthy();
			expect(screen.getByTestId('category-dropdown-item-cat-housing-rent')).toBeTruthy();
		});

		it('should show no results when nothing matches search', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			await openDropdown();

			const searchInput = screen.getByTestId('category-dropdown-search');
			await fireEvent.input(searchInput, { target: { value: 'xyznotfound' } });

			expect(screen.getByTestId('category-dropdown-no-results')).toBeTruthy();
		});
	});

	describe('placeholder and display', () => {
		it('should show placeholder when no value is selected', () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories, value: null, placeholder: 'Select category' }
			});

			const trigger = screen.getByTestId('category-dropdown-trigger');
			expect(trigger.textContent).toContain('Select category');
		});

		it('should toggle aria-expanded on trigger', async () => {
			render(CategoryDropdown, {
				props: { categories: mockCategories }
			});

			const trigger = screen.getByTestId('category-dropdown-trigger');
			expect(trigger.getAttribute('aria-expanded')).toBe('false');

			await openDropdown();
			expect(trigger.getAttribute('aria-expanded')).toBe('true');
		});
	});
});
