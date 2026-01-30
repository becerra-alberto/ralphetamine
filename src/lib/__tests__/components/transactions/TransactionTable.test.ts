import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TransactionTable from '../../../components/transactions/TransactionTable.svelte';
import type { TransactionWithDisplay } from '$lib/stores/transactions';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

function createMockTransaction(overrides: Partial<TransactionWithDisplay> = {}): TransactionWithDisplay {
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
		categoryName: 'Groceries',
		accountName: 'Checking',
		...overrides
	};
}

describe('TransactionTable', () => {
	describe('AC1: Table Structure - All 8 columns', () => {
		it('should render table with all 8 columns: Date, Payee, Category, Memo, Outflow, Inflow, Account, Tags', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			expect(screen.getByTestId('header-date')).toBeTruthy();
			expect(screen.getByTestId('header-payee')).toBeTruthy();
			expect(screen.getByTestId('header-category')).toBeTruthy();
			expect(screen.getByTestId('header-memo')).toBeTruthy();
			expect(screen.getByTestId('header-outflow')).toBeTruthy();
			expect(screen.getByTestId('header-inflow')).toBeTruthy();
			expect(screen.getByTestId('header-account')).toBeTruthy();
			expect(screen.getByTestId('header-tags')).toBeTruthy();
		});

		it('should render column headers with correct labels', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			expect(screen.getByTestId('header-date').textContent).toContain('Date');
			expect(screen.getByTestId('header-payee').textContent).toContain('Payee');
			expect(screen.getByTestId('header-category').textContent).toContain('Category');
			expect(screen.getByTestId('header-memo').textContent).toContain('Memo');
			expect(screen.getByTestId('header-outflow').textContent).toContain('Outflow');
			expect(screen.getByTestId('header-inflow').textContent).toContain('Inflow');
			expect(screen.getByTestId('header-account').textContent).toContain('Account');
			expect(screen.getByTestId('header-tags').textContent).toContain('Tags');
		});
	});

	describe('AC2: Default sort by date descending', () => {
		it('should show date column as sorted by default with descending direction', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const dateHeader = screen.getByTestId('header-date');
			expect(dateHeader.getAttribute('aria-sort')).toBe('descending');
		});

		it('should display sort indicator on sorted column', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const dateHeader = screen.getByTestId('header-date');
			expect(dateHeader.classList.contains('sorted')).toBe(true);
		});
	});

	describe('AC6: Empty state', () => {
		it('should render "No transactions yet" message when no transactions exist', () => {
			render(TransactionTable, {
				props: {
					transactions: [],
					totalItems: 0,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const emptyState = screen.getByTestId('empty-state');
			expect(emptyState).toBeTruthy();
			expect(emptyState.textContent).toContain('No transactions yet');
		});

		it('should show prompt to add first transaction in empty state', () => {
			render(TransactionTable, {
				props: {
					transactions: [],
					totalItems: 0,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const emptyState = screen.getByTestId('empty-state');
			expect(emptyState.textContent).toContain('Add your first transaction');
		});

		it('should not show empty state when transactions exist', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			expect(screen.queryByTestId('empty-state')).toBeNull();
		});
	});

	describe('AC7: Column sorting', () => {
		it('should mark sortable column headers as interactive with tabindex 0', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			// Sortable columns should have tabindex 0
			expect(screen.getByTestId('header-date').getAttribute('tabindex')).toBe('0');
			expect(screen.getByTestId('header-payee').getAttribute('tabindex')).toBe('0');
			expect(screen.getByTestId('header-category').getAttribute('tabindex')).toBe('0');
			expect(screen.getByTestId('header-outflow').getAttribute('tabindex')).toBe('0');
			expect(screen.getByTestId('header-inflow').getAttribute('tabindex')).toBe('0');
			expect(screen.getByTestId('header-account').getAttribute('tabindex')).toBe('0');
		});

		it('should handle clicking a sortable column header without error', async () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const payeeHeader = screen.getByTestId('header-payee');
			// Should not throw
			await fireEvent.click(payeeHeader);
			expect(payeeHeader.classList.contains('sortable')).toBe(true);
		});

		it('should handle clicking the same sorted column header (toggle)', async () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const dateHeader = screen.getByTestId('header-date');
			// Clicking the already-sorted column should toggle direction
			await fireEvent.click(dateHeader);
			// Should not throw - the sort event dispatch is internal
			expect(dateHeader.classList.contains('sorted')).toBe(true);
		});

		it('should show ascending sort indicator when sort direction is asc', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'asc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const dateHeader = screen.getByTestId('header-date');
			expect(dateHeader.getAttribute('aria-sort')).toBe('ascending');
		});

		it('should mark non-sortable columns (memo, tags) with tabindex -1', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			// Non-sortable columns should have tabindex -1
			expect(screen.getByTestId('header-memo').getAttribute('tabindex')).toBe('-1');
			expect(screen.getByTestId('header-tags').getAttribute('tabindex')).toBe('-1');
		});

		it('should support keyboard interaction on sortable headers', async () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const payeeHeader = screen.getByTestId('header-payee');
			// Should handle Enter key without error
			await fireEvent.keyDown(payeeHeader, { key: 'Enter' });
			// Should handle Space key without error
			await fireEvent.keyDown(payeeHeader, { key: ' ' });
			expect(payeeHeader.classList.contains('sortable')).toBe(true);
		});

		it('should show sort direction arrow on active sorted column', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const dateHeader = screen.getByTestId('header-date');
			const sortIndicator = dateHeader.querySelector('.sort-indicator.active');
			expect(sortIndicator).toBeTruthy();
			// Descending shows down arrow
			expect(sortIndicator?.textContent).toContain('↓');
		});

		it('should show up arrow for ascending sort', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'payee',
					sortDirection: 'asc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const payeeHeader = screen.getByTestId('header-payee');
			const sortIndicator = payeeHeader.querySelector('.sort-indicator.active');
			expect(sortIndicator).toBeTruthy();
			expect(sortIndicator?.textContent).toContain('↑');
		});
	});

	describe('Table rendering', () => {
		it('should render the transaction-table container', () => {
			render(TransactionTable, {
				props: {
					transactions: [],
					totalItems: 0,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			expect(screen.getByTestId('transaction-table')).toBeTruthy();
		});

		it('should render transaction rows for each transaction', () => {
			const transactions = [
				createMockTransaction({ id: 'txn-1', payee: 'Store A' }),
				createMockTransaction({ id: 'txn-2', payee: 'Store B' }),
				createMockTransaction({ id: 'txn-3', payee: 'Store C' })
			];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 3,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const rows = screen.getAllByTestId('transaction-row');
			expect(rows.length).toBe(3);
		});

		it('should show loading overlay when isLoading is true', () => {
			render(TransactionTable, {
				props: {
					transactions: [],
					totalItems: 0,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: true,
					selectedId: null,
					expandedId: null
				}
			});

			expect(screen.getByTestId('loading-overlay')).toBeTruthy();
		});

		it('should use grid role and aria-label for accessibility', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const table = screen.getByRole('grid');
			expect(table).toBeTruthy();
			expect(table.getAttribute('aria-label')).toBe('Transaction list');
		});
	});

	describe('Story 8.10: Edit button integration', () => {
		it('should render edit icon buttons in transaction rows', () => {
			const transactions = [
				createMockTransaction({ id: 'txn-1', payee: 'Store A' }),
				createMockTransaction({ id: 'txn-2', payee: 'Store B' })
			];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 2,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const editBtns = screen.getAllByTestId('edit-icon-btn');
			expect(editBtns.length).toBe(2);
		});

		it('should show expansion row when expandedId matches a transaction', () => {
			const transactions = [
				createMockTransaction({ id: 'txn-expand-1', payee: 'Store A' }),
				createMockTransaction({ id: 'txn-expand-2', payee: 'Store B' })
			];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 2,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: 'txn-expand-1'
				}
			});

			const expansionRows = screen.getAllByTestId('expansion-row');
			expect(expansionRows.length).toBe(1);
		});

		it('should only expand one row at a time', () => {
			const transactions = [
				createMockTransaction({ id: 'txn-only-1', payee: 'Store A' }),
				createMockTransaction({ id: 'txn-only-2', payee: 'Store B' }),
				createMockTransaction({ id: 'txn-only-3', payee: 'Store C' })
			];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 3,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: 'txn-only-2'
				}
			});

			const expansionRows = screen.getAllByTestId('expansion-row');
			// Only 1 expansion row should exist
			expect(expansionRows.length).toBe(1);
		});

		it('should render actions column header', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 1,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const actionsHeader = screen.getByTestId('header-actions');
			expect(actionsHeader).toBeTruthy();
		});
	});

	describe('Pagination integration', () => {
		it('should render pagination component with correct page info', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 100,
					currentPage: 2,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const pageIndicator = screen.getByTestId('page-indicator');
			expect(pageIndicator.textContent).toContain('Page 2 of 2');
		});

		it('should render Next/Previous buttons in pagination', () => {
			const transactions = [createMockTransaction()];

			render(TransactionTable, {
				props: {
					transactions,
					totalItems: 100,
					currentPage: 1,
					itemsPerPage: 50,
					sortColumn: 'date',
					sortDirection: 'desc',
					isLoading: false,
					selectedId: null,
					expandedId: null
				}
			});

			const prevBtn = screen.getByTestId('pagination-prev');
			const nextBtn = screen.getByTestId('pagination-next');
			expect(prevBtn).toBeTruthy();
			expect(nextBtn).toBeTruthy();
			// On first page, prev should be disabled
			expect(prevBtn.hasAttribute('disabled')).toBe(true);
			// On first page with more items, next should be enabled
			expect(nextBtn.hasAttribute('disabled')).toBe(false);
		});
	});
});
