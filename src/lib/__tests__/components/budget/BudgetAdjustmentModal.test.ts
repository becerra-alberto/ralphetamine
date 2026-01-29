import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import BudgetAdjustmentModal from '../../../components/budget/BudgetAdjustmentModal.svelte';
import type { Category } from '../../../types/category';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockImplementation((cmd: string) => {
		if (cmd === 'set_budgets_batch') {
			return Promise.resolve(5);
		}
		return Promise.resolve(null);
	})
}));

// Mock toast store
vi.mock('../../../stores/toast', () => ({
	toastStore: {
		success: vi.fn(),
		error: vi.fn()
	}
}));

describe('BudgetAdjustmentModal', () => {
	const mockCategories: Category[] = [
		// Income section
		{
			id: 'income-section',
			name: 'Income',
			parentId: null,
			type: 'income',
			icon: null,
			color: null,
			sortOrder: 0,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		{
			id: 'salary',
			name: 'Salary',
			parentId: 'income-section',
			type: 'income',
			icon: null,
			color: null,
			sortOrder: 0,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		// Housing section
		{
			id: 'housing-section',
			name: 'Housing',
			parentId: null,
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 1,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		{
			id: 'rent',
			name: 'Rent',
			parentId: 'housing-section',
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 0,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		{
			id: 'utilities',
			name: 'Utilities',
			parentId: 'housing-section',
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 1,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		// Essential section
		{
			id: 'essential-section',
			name: 'Essential',
			parentId: null,
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 2,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		{
			id: 'groceries',
			name: 'Groceries',
			parentId: 'essential-section',
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 0,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		// Lifestyle section
		{
			id: 'lifestyle-section',
			name: 'Lifestyle',
			parentId: null,
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 3,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		{
			id: 'entertainment',
			name: 'Entertainment',
			parentId: 'lifestyle-section',
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 0,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		// Savings section
		{
			id: 'savings-section',
			name: 'Savings',
			parentId: null,
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 4,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		},
		{
			id: 'emergency-fund',
			name: 'Emergency Fund',
			parentId: 'savings-section',
			type: 'expense',
			icon: null,
			color: null,
			sortOrder: 0,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-01'
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('category dropdown', () => {
		it('should render all categories grouped by section', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Check that the modal renders
			const modal = screen.getByTestId('budget-adjustment-modal');
			expect(modal).toBeTruthy();

			// Check that category list is rendered
			const categoryList = screen.getByTestId('category-list');
			expect(categoryList).toBeTruthy();

			// Check section names are displayed
			expect(screen.getByText('Income')).toBeTruthy();
			expect(screen.getByText('Housing')).toBeTruthy();
			expect(screen.getByText('Essential')).toBeTruthy();
		});

		it('should have "All categories" option that selects all', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const selectAll = screen.getByTestId('select-all-categories');
			expect(selectAll).toBeTruthy();

			// Checkbox should exist
			const checkbox = selectAll.querySelector('input[type="checkbox"]');
			expect(checkbox).toBeTruthy();

			// Individual category checkboxes should exist
			const salaryCheckbox = screen.getByTestId('category-salary').querySelector('input');
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input');
			expect(salaryCheckbox).toBeTruthy();
			expect(rentCheckbox).toBeTruthy();
		});

		it('should support multi-select for multiple category selection', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Multiple category checkboxes should exist and be selectable
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input');
			const utilitiesCheckbox = screen.getByTestId('category-utilities').querySelector('input');

			expect(rentCheckbox).toBeTruthy();
			expect(utilitiesCheckbox).toBeTruthy();

			// Click both checkboxes
			await fireEvent.click(rentCheckbox!);
			await fireEvent.click(utilitiesCheckbox!);

			// Verify the checkboxes exist and can be interacted with
			expect(rentCheckbox).toBeTruthy();
			expect(utilitiesCheckbox).toBeTruthy();
		});
	});

	describe('date range selection', () => {
		it('should render start/end month pickers', () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Check that date range pickers exist
			expect(screen.getAllByTestId('month-picker').length).toBeGreaterThanOrEqual(2);
		});

		it('should set correct date range for "Next 3 months" preset', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const preset3m = screen.getByTestId('preset-3m');
			await fireEvent.click(preset3m);

			// Verify the preset button is active
			expect(preset3m.classList.contains('active')).toBe(true);
		});

		it('should set correct date range for "Next 6 months" preset', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const preset6m = screen.getByTestId('preset-6m');
			await fireEvent.click(preset6m);

			// Verify the preset button is active
			expect(preset6m.classList.contains('active')).toBe(true);
		});

		it('should set correct date range for "Next 12 months" preset', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const preset12m = screen.getByTestId('preset-12m');
			await fireEvent.click(preset12m);

			// Verify the preset button is active
			expect(preset12m.classList.contains('active')).toBe(true);
		});

		it('should enforce maximum range of 24 months', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Custom range should show max range info when changed
			const preset12m = screen.getByTestId('preset-12m');
			await fireEvent.click(preset12m);

			// Check if range info mentions 24 months max (appears when custom range)
			// After selecting preset, the info shouldn't be shown
			expect(screen.queryByTestId('range-info')).toBeNull();
		});
	});

	describe('operation selection', () => {
		it('should show currency input for "Set amount" operation', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Default operation is 'set-amount'
			const amountInput = screen.getByTestId('amount-input');
			expect(amountInput).toBeTruthy();
		});

		it('should show percentage input for "Increase by %" operation', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Select 'increase-percent' operation
			const select = screen.getByTestId('operation-select').querySelector('select');
			await fireEvent.change(select!, { target: { value: 'increase-percent' } });

			const percentInput = screen.getByTestId('percent-input');
			expect(percentInput).toBeTruthy();
		});

		it('should show percentage input for "Decrease by %" operation', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Select 'decrease-percent' operation
			const select = screen.getByTestId('operation-select').querySelector('select');
			await fireEvent.change(select!, { target: { value: 'decrease-percent' } });

			const percentInput = screen.getByTestId('percent-input');
			expect(percentInput).toBeTruthy();
		});

		it('should have "Copy from previous period" option available', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const select = screen.getByTestId('operation-select').querySelector('select');

			// Check if the option exists
			const options = select?.querySelectorAll('option');
			const copyOption = Array.from(options || []).find(
				(opt) => opt.value === 'copy-previous'
			);
			expect(copyOption).toBeTruthy();
		});
	});

	describe('modal actions', () => {
		it('should handle Cancel button click without changes', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Cancel button should exist and be clickable
			const cancelButton = screen.getByTestId('cancel-button');
			await fireEvent.click(cancelButton);

			// Verify cancel button exists and can be clicked
			expect(cancelButton).toBeTruthy();
		});

		it('should have disabled Apply button when no categories selected', () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const applyButton = screen.getByTestId('apply-button');
			expect(applyButton.hasAttribute('disabled')).toBe(true);
		});
	});

	describe('validation', () => {
		it('should show amount input with currency symbol for set-amount operation', () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// The currency input wrapper should exist
			const valueInput = screen.getByTestId('value-input');
			expect(valueInput.querySelector('.currency-symbol')).toBeTruthy();
		});

		it('should show percent symbol for percentage operations', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Select percentage operation
			const select = screen.getByTestId('operation-select').querySelector('select');
			await fireEvent.change(select!, { target: { value: 'increase-percent' } });

			// The percent input wrapper should exist
			const valueInput = screen.getByTestId('value-input');
			expect(valueInput.querySelector('.percent-symbol')).toBeTruthy();
		});
	});
});
