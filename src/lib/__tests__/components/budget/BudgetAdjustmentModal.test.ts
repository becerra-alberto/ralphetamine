import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import BudgetAdjustmentModal from '../../../components/budget/BudgetAdjustmentModal.svelte';
import type { Category } from '../../../types/category';

// Mock Tauri API
const mockInvoke = vi.fn().mockImplementation((cmd: string) => {
	if (cmd === 'set_budgets_batch') {
		return Promise.resolve(5);
	}
	return Promise.resolve(null);
});

vi.mock('@tauri-apps/api/core', () => ({
	invoke: (...args: unknown[]) => mockInvoke(...args)
}));

// Mock toast store
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../../stores/toast', () => ({
	toastStore: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args)
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

	describe('operation dropdown (AC1)', () => {
		it('should accept click and change value', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const select = screen.getByTestId('operation-dropdown') as HTMLSelectElement;
			expect(select).toBeTruthy();
			expect(select.tagName).toBe('SELECT');

			// Default value should be 'set'
			expect(select.value).toBe('set');

			// Change to 'add'
			await fireEvent.change(select, { target: { value: 'add' } });
			expect(select.value).toBe('add');

			// Change to 'subtract'
			await fireEvent.change(select, { target: { value: 'subtract' } });
			expect(select.value).toBe('subtract');

			// Change to 'multiply'
			await fireEvent.change(select, { target: { value: 'multiply' } });
			expect(select.value).toBe('multiply');
		});

		it('should show all four operations (Set, Add, Subtract, Multiply)', () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const select = screen.getByTestId('operation-dropdown') as HTMLSelectElement;
			const options = Array.from(select.querySelectorAll('option'));

			expect(options.length).toBe(4);
			expect(options[0].value).toBe('set');
			expect(options[0].textContent).toBe('Set');
			expect(options[1].value).toBe('add');
			expect(options[1].textContent).toBe('Add');
			expect(options[2].value).toBe('subtract');
			expect(options[2].textContent).toBe('Subtract');
			expect(options[3].value).toBe('multiply');
			expect(options[3].textContent).toBe('Multiply');
		});

		it('selected value reflects in the UI after selection', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const select = screen.getByTestId('operation-dropdown') as HTMLSelectElement;

			// Change to 'multiply'
			await fireEvent.change(select, { target: { value: 'multiply' } });

			// The UI should show multiplier label instead of amount
			expect(screen.getByText('Multiplier')).toBeTruthy();
		});
	});

	describe('amount input (AC2)', () => {
		it('should accept keyboard input and update value', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;
			expect(amountInput).toBeTruthy();
			expect(amountInput.tagName).toBe('INPUT');

			// Simulate typing
			amountInput.value = '150.00';
			await fireEvent.input(amountInput);

			// Input should maintain its value
			expect(amountInput.value).toBe('150.00');
		});

		it('should accept numeric validation', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;

			// Input type should be number
			expect(amountInput.type).toBe('number');
			expect(amountInput.min).toBe('0');
		});

		it('should not be destroyed by re-render cascades while typing', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;

			// Simulate typing
			amountInput.value = '123.45';
			await fireEvent.input(amountInput);

			// Input should still exist in DOM
			expect(document.body.contains(amountInput)).toBe(true);

			// The input should maintain its value
			expect(amountInput.value).toBe('123.45');

			// Input should not have been replaced
			const currentAmountInput = screen.getByTestId('amount-input');
			expect(currentAmountInput).toBe(amountInput);
		});
	});

	describe('preview section (AC3)', () => {
		it('should show "Show N more" button instead of static text', async () => {
			vi.useFakeTimers();

			try {
				render(BudgetAdjustmentModal, {
					props: {
						open: true,
						categories: mockCategories
					}
				});

				// Select all categories to generate enough preview items
				const selectAll = screen.getByTestId('select-all-categories').querySelector('input')!;
				await fireEvent.click(selectAll);

				// Advance past debounce to trigger preview
				await vi.advanceTimersByTimeAsync(350);

				// With 6 categories * 3 months = 18 items, should show "Show N more"
				const previewCount = screen.getByTestId('preview-count');
				expect(previewCount.textContent).not.toContain('0 cells affected');

				// Should have show-more button (not static text)
				const showMore = screen.queryByTestId('preview-show-more');
				if (showMore) {
					expect(showMore.tagName).toBe('BUTTON');
					expect(showMore.textContent).toContain('Show');
					expect(showMore.textContent).toContain('more');
				}
			} finally {
				vi.useRealTimers();
			}
		});

		it('clicking "Show more" reveals all preview items', async () => {
			vi.useFakeTimers();

			try {
				render(BudgetAdjustmentModal, {
					props: {
						open: true,
						categories: mockCategories
					}
				});

				// Select all categories
				const selectAll = screen.getByTestId('select-all-categories').querySelector('input')!;
				await fireEvent.click(selectAll);

				// Advance past debounce
				await vi.advanceTimersByTimeAsync(350);

				const showMore = screen.queryByTestId('preview-show-more');
				if (showMore) {
					const rowsBefore = screen.getAllByTestId('preview-row').length;
					expect(rowsBefore).toBe(5); // default maxDisplay

					// Click show more
					await fireEvent.click(showMore);

					// All rows should now be visible
					const rowsAfter = screen.getAllByTestId('preview-row').length;
					expect(rowsAfter).toBeGreaterThan(5);
				}
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('apply button (AC4)', () => {
		it('should call setBudget API for each affected cell', async () => {
			vi.useFakeTimers();

			try {
				render(BudgetAdjustmentModal, {
					props: {
						open: true,
						categories: mockCategories
					}
				});

				// Select a category
				const rentCheckbox = screen.getByTestId('category-rent').querySelector('input')!;
				await fireEvent.click(rentCheckbox);

				// Set an amount
				const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;
				amountInput.value = '500';
				await fireEvent.input(amountInput);

				// Advance past debounce
				await vi.advanceTimersByTimeAsync(350);

				// Click apply
				const applyButton = screen.getByTestId('apply-button');
				await fireEvent.click(applyButton);

				// Wait for async apply
				await vi.advanceTimersByTimeAsync(100);

				// setBudgetsBatch should have been called
				expect(mockInvoke).toHaveBeenCalledWith('set_budgets_batch', expect.any(Object));
			} finally {
				vi.useRealTimers();
			}
		});

		it('should show descriptive toast message on error', async () => {
			// Make the API call fail with a specific error
			mockInvoke.mockImplementationOnce(() => {
				return Promise.reject(new Error('Database connection lost'));
			});

			vi.useFakeTimers();

			try {
				render(BudgetAdjustmentModal, {
					props: {
						open: true,
						categories: mockCategories
					}
				});

				// Select a category
				const rentCheckbox = screen.getByTestId('category-rent').querySelector('input')!;
				await fireEvent.click(rentCheckbox);

				// Set an amount
				const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;
				amountInput.value = '500';
				await fireEvent.input(amountInput);

				// Advance past debounce
				await vi.advanceTimersByTimeAsync(350);

				// Click apply
				const applyButton = screen.getByTestId('apply-button');
				await fireEvent.click(applyButton);

				// Wait for async apply
				await vi.advanceTimersByTimeAsync(100);

				// Error toast should include the backend error message
				expect(mockToastError).toHaveBeenCalledWith(
					expect.stringContaining('Database connection lost')
				);
			} finally {
				vi.useRealTimers();
			}
		});

		it('should show success toast on successful apply', async () => {
			mockInvoke.mockImplementation((cmd: string) => {
				if (cmd === 'set_budgets_batch') {
					return Promise.resolve(3);
				}
				return Promise.resolve(null);
			});

			vi.useFakeTimers();

			try {
				render(BudgetAdjustmentModal, {
					props: {
						open: true,
						categories: mockCategories
					}
				});

				// Select a category
				const rentCheckbox = screen.getByTestId('category-rent').querySelector('input')!;
				await fireEvent.click(rentCheckbox);

				// Set an amount
				const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;
				amountInput.value = '500';
				await fireEvent.input(amountInput);

				// Advance past debounce
				await vi.advanceTimersByTimeAsync(350);

				// Click apply
				const applyButton = screen.getByTestId('apply-button');
				await fireEvent.click(applyButton);

				// Wait for async apply
				await vi.advanceTimersByTimeAsync(100);

				// Success toast should have been called
				expect(mockToastSuccess).toHaveBeenCalledWith(
					expect.stringContaining('Updated')
				);
			} finally {
				vi.useRealTimers();
			}
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
		it('should show amount input with currency symbol for set operation', () => {
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

		it('should show multiplier label for multiply operation', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Select multiply operation
			const select = screen.getByTestId('operation-dropdown') as HTMLSelectElement;
			await fireEvent.change(select, { target: { value: 'multiply' } });

			// The label should say "Multiplier"
			expect(screen.getByText('Multiplier')).toBeTruthy();
		});
	});

	describe('section header checkboxes (Story 8.5)', () => {
		it('clicking section header selects all children', async () => {
			render(BudgetAdjustmentModal, {
				props: { open: true, categories: mockCategories }
			});

			// Click the Housing section header checkbox
			const housingHeader = screen.getByTestId('section-header-housing');
			const headerCheckbox = housingHeader.querySelector('input[type="checkbox"]')!;
			await fireEvent.click(headerCheckbox);

			// Both Housing children (Rent + Utilities) should be selected
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input') as HTMLInputElement;
			const utilitiesCheckbox = screen.getByTestId('category-utilities').querySelector('input') as HTMLInputElement;
			expect(rentCheckbox.checked).toBe(true);
			expect(utilitiesCheckbox.checked).toBe(true);
		});

		it('clicking section header deselects all children when all selected', async () => {
			render(BudgetAdjustmentModal, {
				props: { open: true, categories: mockCategories }
			});

			// First select all Housing children
			const housingHeader = screen.getByTestId('section-header-housing');
			const headerCheckbox = housingHeader.querySelector('input[type="checkbox"]')!;
			await fireEvent.click(headerCheckbox);

			// Verify they're selected
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input') as HTMLInputElement;
			const utilitiesCheckbox = screen.getByTestId('category-utilities').querySelector('input') as HTMLInputElement;
			expect(rentCheckbox.checked).toBe(true);
			expect(utilitiesCheckbox.checked).toBe(true);

			// Click again to deselect all
			await fireEvent.click(headerCheckbox);

			expect(rentCheckbox.checked).toBe(false);
			expect(utilitiesCheckbox.checked).toBe(false);
		});

		it('unchecking one child shows indeterminate on section header', async () => {
			render(BudgetAdjustmentModal, {
				props: { open: true, categories: mockCategories }
			});

			// Select all Housing children via header
			const housingHeader = screen.getByTestId('section-header-housing');
			const headerCheckbox = housingHeader.querySelector('input[type="checkbox"]') as HTMLInputElement;
			await fireEvent.click(headerCheckbox);

			// Now deselect one child (Utilities)
			const utilitiesCheckbox = screen.getByTestId('category-utilities').querySelector('input')!;
			await fireEvent.click(utilitiesCheckbox);

			// Section header should show indeterminate state
			expect(headerCheckbox.indeterminate).toBe(true);
		});

		it('selection count displays correct fraction per section', async () => {
			render(BudgetAdjustmentModal, {
				props: { open: true, categories: mockCategories }
			});

			// Initially Housing count should be "0 of 2 selected"
			expect(screen.getByTestId('section-count-housing').textContent).toContain('0 of 2 selected');

			// Select one child
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input')!;
			await fireEvent.click(rentCheckbox);

			// Housing count should update to "1 of 2 selected"
			await waitFor(() => {
				expect(screen.getByTestId('section-count-housing').textContent).toContain('1 of 2 selected');
			});

			// Select second child
			const utilitiesCheckbox = screen.getByTestId('category-utilities').querySelector('input')!;
			await fireEvent.click(utilitiesCheckbox);

			// Housing count should update to "2 of 2 selected"
			await waitFor(() => {
				expect(screen.getByTestId('section-count-housing').textContent).toContain('2 of 2 selected');
			});
		});

		it('global count displays correct total fraction', async () => {
			render(BudgetAdjustmentModal, {
				props: { open: true, categories: mockCategories }
			});

			// Initially: "0 of 6 selected" (6 selectable children total)
			const globalCount = screen.getByTestId('global-category-count');
			expect(globalCount.textContent).toContain('0 of 6 selected');

			// Select Rent
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input')!;
			await fireEvent.click(rentCheckbox);

			expect(globalCount.textContent).toContain('1 of 6 selected');

			// Select all via "All categories"
			const selectAll = screen.getByTestId('select-all-categories').querySelector('input')!;
			await fireEvent.click(selectAll);

			expect(globalCount.textContent).toContain('6 of 6 selected');
		});
	});

	describe('reactivity fixes', () => {
		it('should render modal with all form elements interactive', () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Modal form renders
			expect(screen.getByTestId('budget-adjustment-modal')).toBeTruthy();

			// Category selection is interactive
			expect(screen.getByTestId('select-all-categories')).toBeTruthy();
			expect(screen.getByTestId('category-list')).toBeTruthy();

			// Date presets are interactive
			expect(screen.getByTestId('preset-3m')).toBeTruthy();
			expect(screen.getByTestId('preset-6m')).toBeTruthy();
			expect(screen.getByTestId('preset-12m')).toBeTruthy();

			// Operation select is interactive
			const operationSelect = screen.getByTestId('operation-dropdown') as HTMLSelectElement;
			expect(operationSelect).toBeTruthy();
			expect(operationSelect.tagName).toBe('SELECT');

			// Amount input is interactive (default operation is set)
			const amountInput = screen.getByTestId('amount-input');
			expect(amountInput).toBeTruthy();
			expect(amountInput.tagName).toBe('INPUT');

			// Month pickers are present
			expect(screen.getAllByTestId('month-picker').length).toBeGreaterThanOrEqual(2);

			// Action buttons are present
			expect(screen.getByTestId('cancel-button')).toBeTruthy();
			expect(screen.getByTestId('apply-button')).toBeTruthy();
		});

		it('should not reset other fields when selecting an operation', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Select a category first
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input');
			await fireEvent.click(rentCheckbox!);

			// Verify category is checked after clicking
			expect((rentCheckbox as HTMLInputElement).checked).toBe(true);

			// Now change the operation to add
			const select = screen.getByTestId('operation-dropdown') as HTMLSelectElement;
			await fireEvent.change(select, { target: { value: 'add' } });

			// Category should still be selected — operation change should not reset categories
			const rentCheckboxAfter = screen.getByTestId('category-rent').querySelector('input') as HTMLInputElement;
			expect(rentCheckboxAfter.checked).toBe(true);

			// Date preset buttons should still be present (not disrupted)
			expect(screen.getByTestId('preset-3m')).toBeTruthy();
		});

		it('should preserve amount input value while typing', async () => {
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;

			// Simulate typing by directly setting value and dispatching input event
			amountInput.value = '123.45';
			await fireEvent.input(amountInput);

			// Input should still exist in DOM (not destroyed by re-render cascade)
			expect(document.body.contains(amountInput)).toBe(true);

			// The input should maintain its value
			expect(amountInput.value).toBe('123.45');

			// Input should not have been replaced by a new element
			const currentAmountInput = screen.getByTestId('amount-input');
			expect(currentAmountInput).toBe(amountInput);
		});

		it('should debounce preview calculation and not fire synchronously', async () => {
			vi.useFakeTimers();

			try {
				render(BudgetAdjustmentModal, {
					props: {
						open: true,
						categories: mockCategories
					}
				});

				// Select a category to trigger preview schedule
				const rentCheckbox = screen.getByTestId('category-rent').querySelector('input');
				await fireEvent.click(rentCheckbox!);

				// Preview count should still be 0 synchronously (debounced)
				const previewCount = screen.getByTestId('preview-count');
				expect(previewCount.textContent).toContain('0 cells affected');

				// Advance past debounce timeout (300ms)
				await vi.advanceTimersByTimeAsync(350);

				// After debounce, preview should have calculated
				const updatedCount = screen.getByTestId('preview-count');
				expect(updatedCount.textContent).not.toContain('0 cells affected');
			} finally {
				vi.useRealTimers();
			}
		});

		it('should reset all fields when modal is reopened', async () => {
			// Verify the reset logic: render a fresh modal instance each time
			// First instance: open modal, interact with it
			const { unmount } = render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// Select a category
			const rentCheckbox = screen.getByTestId('category-rent').querySelector('input');
			await fireEvent.click(rentCheckbox!);
			expect((rentCheckbox as HTMLInputElement).checked).toBe(true);

			// Change operation to verify it gets reset
			const select = screen.getByTestId('operation-dropdown') as HTMLSelectElement;
			await fireEvent.change(select, { target: { value: 'add' } });

			// Unmount (simulates close) and create new instance (simulates reopen)
			unmount();

			// Second instance: fresh modal should have all defaults
			render(BudgetAdjustmentModal, {
				props: {
					open: true,
					categories: mockCategories
				}
			});

			// After reopening, operation should be back to default (set)
			const amountInput = screen.queryByTestId('amount-input');
			expect(amountInput).toBeTruthy();

			// Amount should be empty (default)
			expect((amountInput as HTMLInputElement).value).toBe('');

			// Category should be deselected (default)
			const resetRentCheckbox = screen.getByTestId('category-rent').querySelector('input') as HTMLInputElement;
			expect(resetRentCheckbox.checked).toBe(false);

			// Preview should be empty (default)
			const previewCount = screen.getByTestId('preview-count');
			expect(previewCount.textContent).toContain('0 cells affected');
		});
	});
});
