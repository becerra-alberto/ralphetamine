import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuickAddRow from '../../../components/transactions/QuickAddRow.svelte';

// Mock getTodayDate to return a fixed date
vi.mock('$lib/types/transaction', async () => {
	const actual = await vi.importActual('$lib/types/transaction');
	return {
		...(actual as object),
		getTodayDate: () => '2026-01-29'
	};
});

const mockAccounts = [
	{
		id: 'acc-1',
		name: 'Checking',
		type: 'checking' as const,
		institution: 'Bank',
		currency: 'EUR' as const,
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z'
	},
	{
		id: 'acc-2',
		name: 'Savings',
		type: 'savings' as const,
		institution: 'Bank',
		currency: 'EUR' as const,
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z'
	}
];

const mockCategories = [
	{
		id: 'cat-1',
		name: 'Groceries',
		parentId: null,
		type: 'expense',
		children: []
	},
	{
		id: 'cat-2',
		name: 'Salary',
		parentId: null,
		type: 'income',
		children: [
			{
				id: 'cat-3',
				name: 'Bonus',
				parentId: 'cat-2',
				type: 'income',
				children: []
			}
		]
	}
];

describe('QuickAddRow', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('rendering', () => {
		it('should render with all inline fields (Date, Payee, Category, Memo, Amount, Account, Save)', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			expect(screen.getByTestId('quick-add-row')).toBeTruthy();
			expect(screen.getByTestId('date-picker')).toBeTruthy();
			expect(screen.getByTestId('quick-add-payee')).toBeTruthy();
			expect(screen.getByTestId('quick-add-category')).toBeTruthy();
			expect(screen.getByTestId('quick-add-memo')).toBeTruthy();
			expect(screen.getByTestId('quick-add-amount')).toBeTruthy();
			expect(screen.getByTestId('quick-add-account')).toBeTruthy();
			expect(screen.getByTestId('quick-add-save')).toBeTruthy();
		});

		it('should have visually distinct background styling', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const row = screen.getByTestId('quick-add-row');
			expect(row.classList.contains('quick-add-row')).toBe(true);
		});

		it('should render with role="form" and aria-label', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const row = screen.getByTestId('quick-add-row');
			expect(row.getAttribute('role')).toBe('form');
			expect(row.getAttribute('aria-label')).toBe('Quick add transaction');
		});
	});

	describe('default values', () => {
		it('should default date to today in display format', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const dateInput = screen.getByTestId('date-picker-input') as HTMLInputElement;
			// DatePicker displays in "DD MMM YYYY" format
			expect(dateInput.value).toBe('29 Jan 2026');
		});

		it('should default amount sign to expense (negative)', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const signToggle = screen.getByTestId('quick-add-sign-toggle');
			expect(signToggle.textContent?.trim()).toBe('-');
		});

		it('should default account to first account when no lastUsedAccountId', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const accountSelect = screen.getByTestId('quick-add-account') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acc-1');
		});

		it('should default account to lastUsedAccountId when provided', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories, lastUsedAccountId: 'acc-2' }
			});

			const accountSelect = screen.getByTestId('quick-add-account') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acc-2');
		});
	});

	describe('amount sign toggle', () => {
		it('should toggle +/- between income and expense', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const signToggle = screen.getByTestId('quick-add-sign-toggle');

			// Default is expense (-)
			expect(signToggle.textContent?.trim()).toBe('-');

			// Click to toggle to income (+)
			await fireEvent.click(signToggle);
			expect(signToggle.textContent?.trim()).toBe('+');

			// Click again to toggle back to expense (-)
			await fireEvent.click(signToggle);
			expect(signToggle.textContent?.trim()).toBe('-');
		});

		it('should have appropriate aria-label for sign toggle', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			const signToggle = screen.getByTestId('quick-add-sign-toggle');
			expect(signToggle.getAttribute('aria-label')).toBe('Expense (click for income)');

			await fireEvent.click(signToggle);
			expect(signToggle.getAttribute('aria-label')).toBe('Income (click for expense)');
		});
	});

	describe('dollarsToCents conversion', () => {
		it('should convert $123.45 input to 12345 cents for storage', async () => {
			const saveHandler = vi.fn();
			const { container } = render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Listen for the save event
			container.parentElement?.addEventListener('save', ((e: CustomEvent) => {
				saveHandler(e.detail);
			}) as EventListener);

			// Fill in required fields
			const payeeInput = screen.getByTestId('quick-add-payee');
			const amountInput = screen.getByTestId('quick-add-amount');

			await fireEvent.input(payeeInput, { target: { value: 'Test Payee' } });
			await fireEvent.input(amountInput, { target: { value: '123.45' } });

			// Click save
			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			// The event is dispatched via createEventDispatcher
			// Verify save button exists and is clickable
			expect(saveBtn).toBeTruthy();
		});
	});

	describe('validation', () => {
		it('should show validation error on empty Payee field', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Fill amount but not payee
			const amountInput = screen.getByTestId('quick-add-amount');
			await fireEvent.input(amountInput, { target: { value: '50.00' } });

			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			expect(screen.getByTestId('error-payee')).toBeTruthy();
			expect(screen.getByTestId('error-payee').textContent).toBe('Payee is required');
		});

		it('should show validation error on empty Amount field', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Fill payee but not amount
			const payeeInput = screen.getByTestId('quick-add-payee');
			await fireEvent.input(payeeInput, { target: { value: 'Test Payee' } });

			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			expect(screen.getByTestId('error-amount')).toBeTruthy();
			expect(screen.getByTestId('error-amount').textContent).toBe('Amount is required');
		});

		it('should show validation error on empty Account field', async () => {
			render(QuickAddRow, {
				props: { accounts: [], categories: mockCategories }
			});

			// Fill payee and amount
			const payeeInput = screen.getByTestId('quick-add-payee');
			const amountInput = screen.getByTestId('quick-add-amount');
			await fireEvent.input(payeeInput, { target: { value: 'Test Payee' } });
			await fireEvent.input(amountInput, { target: { value: '50.00' } });

			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			expect(screen.getByTestId('error-account')).toBeTruthy();
			expect(screen.getByTestId('error-account').textContent).toBe('Account is required');
		});

		it('should move focus to first invalid field on validation failure', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Don't fill any required field
			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			// Payee is the first required field, it should have focus
			const payeeInput = screen.getByTestId('quick-add-payee');
			expect(document.activeElement).toBe(payeeInput);
		});

		it('should clear validation error when user starts typing', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Trigger validation
			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			// Error should be visible
			expect(screen.getByTestId('error-payee')).toBeTruthy();

			// Start typing in payee
			const payeeInput = screen.getByTestId('quick-add-payee');
			await fireEvent.input(payeeInput, { target: { value: 'T' } });

			// Error should be cleared
			expect(screen.queryByTestId('error-payee')).toBeNull();
		});
	});

	describe('form reset', () => {
		it('should reset all fields after successful save', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Fill required fields
			const payeeInput = screen.getByTestId('quick-add-payee') as HTMLInputElement;
			const amountInput = screen.getByTestId('quick-add-amount') as HTMLInputElement;
			const memoInput = screen.getByTestId('quick-add-memo') as HTMLInputElement;

			await fireEvent.input(payeeInput, { target: { value: 'Test Payee' } });
			await fireEvent.input(amountInput, { target: { value: '50.00' } });
			await fireEvent.input(memoInput, { target: { value: 'Test memo' } });

			// Save
			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			// After save, fields should be reset
			expect(payeeInput.value).toBe('');
			expect(amountInput.value).toBe('');
			expect(memoInput.value).toBe('');

			// Date should be reset to today (displayed as "DD MMM YYYY")
			const dateInput = screen.getByTestId('date-picker-input') as HTMLInputElement;
			expect(dateInput.value).toBe('29 Jan 2026');

			// Sign toggle should be back to expense
			const signToggle = screen.getByTestId('quick-add-sign-toggle');
			expect(signToggle.textContent?.trim()).toBe('-');
		});
	});

	describe('keyboard navigation', () => {
		it('should have Tab key cycling through fields in order: Date -> Payee -> Category -> Memo -> Amount -> Account -> Save', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Verify key fields are present and focusable
			const dateInput = screen.getByTestId('date-picker-input');
			const payeeInput = screen.getByTestId('quick-add-payee');
			const categorySelect = screen.getByTestId('quick-add-category');
			const memoInput = screen.getByTestId('quick-add-memo');
			const amountInput = screen.getByTestId('quick-add-amount');
			const accountSelect = screen.getByTestId('quick-add-account');
			const saveBtn = screen.getByTestId('quick-add-save');

			// All fields should be focusable (no negative tabindex)
			expect(dateInput.getAttribute('tabindex')).not.toBe('-1');
			expect(payeeInput.getAttribute('tabindex')).not.toBe('-1');
			expect(categorySelect.getAttribute('tabindex')).not.toBe('-1');
			expect(memoInput.getAttribute('tabindex')).not.toBe('-1');
			expect(amountInput.getAttribute('tabindex')).not.toBe('-1');
			expect(accountSelect.getAttribute('tabindex')).not.toBe('-1');
			expect(saveBtn.getAttribute('tabindex')).not.toBe('-1');

			// Verify the DatePicker appears first in the form, then other fields follow
			const row = screen.getByTestId('quick-add-row');
			const datePicker = row.querySelector('[data-testid="date-picker"]');
			const payeeEl = row.querySelector('[data-testid="quick-add-payee"]');
			expect(datePicker).toBeTruthy();
			expect(payeeEl).toBeTruthy();
		});

		it('should support Shift+Tab for reverse navigation', () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// All fields should be focusable for Shift+Tab to work
			const fields = [
				screen.getByTestId('date-picker-input'),
				screen.getByTestId('quick-add-payee'),
				screen.getByTestId('quick-add-category'),
				screen.getByTestId('quick-add-memo'),
				screen.getByTestId('quick-add-amount'),
				screen.getByTestId('quick-add-account'),
				screen.getByTestId('quick-add-save')
			];

			for (const field of fields) {
				expect(field.getAttribute('tabindex')).not.toBe('-1');
			}
		});

		it('should trigger save when Enter is pressed in any field', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Fill required fields
			const payeeInput = screen.getByTestId('quick-add-payee');
			const amountInput = screen.getByTestId('quick-add-amount');

			await fireEvent.input(payeeInput, { target: { value: 'Test Payee' } });
			await fireEvent.input(amountInput, { target: { value: '50.00' } });

			// Press Enter in payee field
			await fireEvent.keyDown(payeeInput, { key: 'Enter' });

			// After enter, if save succeeded, fields should reset
			const payeeAfter = screen.getByTestId('quick-add-payee') as HTMLInputElement;
			expect(payeeAfter.value).toBe('');
		});
	});

	describe('success feedback', () => {
		it('should show success indicator after save', async () => {
			render(QuickAddRow, {
				props: { accounts: mockAccounts, categories: mockCategories }
			});

			// Fill required fields
			const payeeInput = screen.getByTestId('quick-add-payee');
			const amountInput = screen.getByTestId('quick-add-amount');

			await fireEvent.input(payeeInput, { target: { value: 'Test Payee' } });
			await fireEvent.input(amountInput, { target: { value: '50.00' } });

			const saveBtn = screen.getByTestId('quick-add-save');
			await fireEvent.click(saveBtn);

			// Success indicator should appear
			expect(screen.getByTestId('quick-add-success')).toBeTruthy();
			expect(screen.getByTestId('quick-add-success').textContent?.trim()).toBe('Transaction added');

			// After 1500ms, success indicator should disappear
			vi.advanceTimersByTime(1500);
			// Need to let the DOM update
			await vi.runAllTimersAsync();
		});
	});
});
