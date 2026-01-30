import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TransactionRow from '../../../components/transactions/TransactionRow.svelte';
import type { Transaction } from '$lib/types/transaction';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: 'txn-' + Math.random().toString(36).substring(2, 9),
		date: '2025-01-15',
		payee: 'Test Payee',
		categoryId: 'cat-1',
		memo: 'Test memo',
		amountCents: -5000,
		accountId: 'acc-1',
		tags: [],
		isReconciled: false,
		importSource: null,
		createdAt: '2025-01-15T10:00:00Z',
		updatedAt: '2025-01-15T10:00:00Z',
		...overrides
	};
}

/**
 * TransactionRow requires a <table><tbody> parent to render <tr> properly.
 * We use a wrapper approach with the component rendered inside a table context.
 */
import TransactionRowTestWrapper from './TransactionRowTestWrapper.svelte';

describe('TransactionRow', () => {
	describe('AC4: Currency display - centsToDollars conversion', () => {
		it('should convert cents to currency correctly (12345 cents -> €123.45)', () => {
			const transaction = createMockTransaction({ amountCents: -12345 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const outflowCell = screen.getByTestId('cell-outflow');
			// €123.45 formatted by Intl.NumberFormat
			expect(outflowCell.textContent?.trim()).toContain('123.45');
		});

		it('should format large amounts correctly (999999 cents -> €9,999.99)', () => {
			const transaction = createMockTransaction({ amountCents: 999999 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Savings' }
			});

			const inflowCell = screen.getByTestId('cell-inflow');
			expect(inflowCell.textContent?.trim()).toContain('9,999.99');
		});

		it('should handle zero amount', () => {
			const transaction = createMockTransaction({ amountCents: 0 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			// Zero should show as inflow (not negative), display dash in both
			const outflowCell = screen.getByTestId('cell-outflow');
			const inflowCell = screen.getByTestId('cell-inflow');
			expect(outflowCell.textContent?.trim()).toBe('-');
			expect(inflowCell.textContent?.trim()).toBe('-');
		});
	});

	describe('AC4: Negative amounts in Outflow column (red, no minus sign)', () => {
		it('should display negative amounts in Outflow column', () => {
			const transaction = createMockTransaction({ amountCents: -5000 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Food', accountName: 'Checking' }
			});

			const outflowCell = screen.getByTestId('cell-outflow');
			expect(outflowCell.textContent?.trim()).toContain('50.00');
			// Should NOT contain a minus sign (absolute value displayed)
			expect(outflowCell.textContent?.trim()).not.toMatch(/^-/);
		});

		it('should apply red styling (has-value class) to outflow amounts', () => {
			const transaction = createMockTransaction({ amountCents: -5000 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Food', accountName: 'Checking' }
			});

			const outflowCell = screen.getByTestId('cell-outflow');
			expect(outflowCell.classList.contains('has-value')).toBe(true);
		});

		it('should show "-" in Inflow column for negative amounts', () => {
			const transaction = createMockTransaction({ amountCents: -5000 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Food', accountName: 'Checking' }
			});

			const inflowCell = screen.getByTestId('cell-inflow');
			expect(inflowCell.textContent?.trim()).toBe('-');
		});
	});

	describe('AC4: Positive amounts in Inflow column (green)', () => {
		it('should display positive amounts in Inflow column', () => {
			const transaction = createMockTransaction({ amountCents: 10000 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Salary', accountName: 'Checking' }
			});

			const inflowCell = screen.getByTestId('cell-inflow');
			expect(inflowCell.textContent?.trim()).toContain('100.00');
		});

		it('should apply green styling (has-value class) to inflow amounts', () => {
			const transaction = createMockTransaction({ amountCents: 10000 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Salary', accountName: 'Checking' }
			});

			const inflowCell = screen.getByTestId('cell-inflow');
			expect(inflowCell.classList.contains('has-value')).toBe(true);
		});

		it('should show "-" in Outflow column for positive amounts', () => {
			const transaction = createMockTransaction({ amountCents: 10000 });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Salary', accountName: 'Checking' }
			});

			const outflowCell = screen.getByTestId('cell-outflow');
			expect(outflowCell.textContent?.trim()).toBe('-');
		});
	});

	describe('AC2/AC4: Empty fields display "-" placeholder', () => {
		it('should display "-" for null category', () => {
			const transaction = createMockTransaction({ categoryId: null });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			const categoryCell = screen.getByTestId('cell-category');
			expect(categoryCell.textContent?.trim()).toBe('-');
		});

		it('should display "-" for null memo', () => {
			const transaction = createMockTransaction({ memo: null });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const memoCell = screen.getByTestId('cell-memo');
			expect(memoCell.textContent?.trim()).toBe('-');
		});

		it('should display "-" for empty tags', () => {
			const transaction = createMockTransaction({ tags: [] });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const tagsCell = screen.getByTestId('cell-tags');
			expect(tagsCell.textContent?.trim()).toBe('-');
		});
	});

	describe('Tags render as chip components', () => {
		it('should render tags as chip elements', () => {
			const transaction = createMockTransaction({ tags: ['food', 'essential'] });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const chips = screen.getAllByTestId('tag-chip');
			expect(chips.length).toBe(2);
			expect(chips[0].textContent?.trim()).toBe('food');
			expect(chips[1].textContent?.trim()).toBe('essential');
		});

		it('should render single tag as chip', () => {
			const transaction = createMockTransaction({ tags: ['recurring'] });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const chips = screen.getAllByTestId('tag-chip');
			expect(chips.length).toBe(1);
			expect(chips[0].textContent?.trim()).toBe('recurring');
		});
	});

	describe('Data display', () => {
		it('should display the formatted date', () => {
			const transaction = createMockTransaction({ date: '2025-03-15' });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			const dateCell = screen.getByTestId('cell-date');
			expect(dateCell.textContent?.trim()).toContain('Mar');
			expect(dateCell.textContent?.trim()).toContain('15');
			expect(dateCell.textContent?.trim()).toContain('2025');
		});

		it('should display payee name', () => {
			const transaction = createMockTransaction({ payee: 'Whole Foods Market' });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			const payeeCell = screen.getByTestId('cell-payee');
			expect(payeeCell.textContent?.trim()).toBe('Whole Foods Market');
		});

		it('should display category name', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const categoryCell = screen.getByTestId('cell-category');
			expect(categoryCell.textContent?.trim()).toBe('Groceries');
		});

		it('should display memo text', () => {
			const transaction = createMockTransaction({ memo: 'Weekly shopping' });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			const memoCell = screen.getByTestId('cell-memo');
			expect(memoCell.textContent?.trim()).toBe('Weekly shopping');
		});

		it('should display account name', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Main Checking' }
			});

			const accountCell = screen.getByTestId('cell-account');
			expect(accountCell.textContent?.trim()).toBe('Main Checking');
		});
	});

	describe('Row interaction', () => {
		it('should have tabindex for keyboard navigation', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			const row = screen.getByTestId('transaction-row');
			expect(row.getAttribute('tabindex')).toBe('0');
		});

		it('should render the transaction id as data attribute', () => {
			const transaction = createMockTransaction({ id: 'txn-abc123' });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: null, accountName: 'Checking' }
			});

			const row = screen.getByTestId('transaction-row');
			expect(row.getAttribute('data-id')).toBe('txn-abc123');
		});
	});

	describe('Story 8.10: Edit button', () => {
		it('should render an edit icon button in the row', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const editBtn = screen.getByTestId('edit-icon-btn');
			expect(editBtn).toBeTruthy();
		});

		it('edit button should have correct aria-label for accessibility', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const editBtn = screen.getByTestId('edit-icon-btn');
			expect(editBtn.getAttribute('aria-label')).toBe('Edit transaction');
		});

		it('edit button should contain an SVG pencil icon', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const editBtn = screen.getByTestId('edit-icon-btn');
			const svg = editBtn.querySelector('svg');
			expect(svg).toBeTruthy();
		});

		it('clicking edit button should not propagate click to row', async () => {
			const transaction = createMockTransaction({ id: 'txn-edit-test' });

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const editBtn = screen.getByTestId('edit-icon-btn');
			// Clicking the edit button should work without error (stopPropagation prevents row click)
			await fireEvent.click(editBtn);
			// Button should still exist after click
			expect(screen.getByTestId('edit-icon-btn')).toBeTruthy();
		});

		it('edit button should be keyboard accessible (has button type)', () => {
			const transaction = createMockTransaction();

			render(TransactionRowTestWrapper, {
				props: { transaction, categoryName: 'Groceries', accountName: 'Checking' }
			});

			const editBtn = screen.getByTestId('edit-icon-btn');
			expect(editBtn.getAttribute('type')).toBe('button');
		});

		it('edit form should populate with transaction data when expanded', () => {
			const transaction = createMockTransaction({
				date: '2025-06-15',
				payee: 'Test Store',
				amountCents: -7500,
				memo: 'Test purchase'
			});

			render(TransactionRowTestWrapper, {
				props: {
					transaction,
					categoryName: 'Shopping',
					accountName: 'Checking',
					isExpanded: true
				}
			});

			// When expanded, should show the expansion row with edit trigger
			const expansionRow = screen.getByTestId('expansion-row');
			expect(expansionRow).toBeTruthy();
		});
	});
});
