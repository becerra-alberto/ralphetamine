import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	transactionStore,
	filterTransactionsBySearch,
	totalPages,
	searchQuery,
	isSearchActive,
	type TransactionWithDisplay
} from '../../stores/transactions';

function createMockTransaction(
	overrides: Partial<TransactionWithDisplay> = {}
): TransactionWithDisplay {
	return {
		id: 'test-id-' + Math.random().toString(36).substring(7),
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

describe('transactionStore', () => {
	beforeEach(() => {
		transactionStore.reset();
	});

	describe('search functionality', () => {
		it('should set search query', () => {
			transactionStore.setSearch('test query');

			const state = get(transactionStore);
			expect(state.filters.search).toBe('test query');
		});

		it('should reset page to 1 when setting search', () => {
			transactionStore.setPage(5);
			transactionStore.setSearch('test');

			const state = get(transactionStore);
			expect(state.pagination.currentPage).toBe(1);
		});

		it('should clear search query', () => {
			transactionStore.setSearch('test query');
			transactionStore.clearSearch();

			const state = get(transactionStore);
			expect(state.filters.search).toBe('');
		});

		it('should reset page to 1 when clearing search', () => {
			transactionStore.setSearch('test');
			transactionStore.setPage(3);
			transactionStore.clearSearch();

			const state = get(transactionStore);
			expect(state.pagination.currentPage).toBe(1);
		});
	});

	describe('derived stores', () => {
		it('should expose searchQuery derived store', () => {
			transactionStore.setSearch('my query');

			const query = get(searchQuery);
			expect(query).toBe('my query');
		});

		it('should expose isSearchActive derived store', () => {
			expect(get(isSearchActive)).toBe(false);

			transactionStore.setSearch('a');
			expect(get(isSearchActive)).toBe(false);

			transactionStore.setSearch('ab');
			expect(get(isSearchActive)).toBe(true);
		});

		it('should update totalPages when totalItems changes', () => {
			const transactions = [createMockTransaction()];
			transactionStore.setTransactions(transactions, 150);

			expect(get(totalPages)).toBe(3);
		});
	});

	describe('setTransactions', () => {
		it('should store unfilteredTotalItems', () => {
			const transactions = [createMockTransaction()];
			transactionStore.setTransactions(transactions, 25, 100);

			const state = get(transactionStore);
			expect(state.pagination.totalItems).toBe(25);
			expect(state.unfilteredTotalItems).toBe(100);
		});

		it('should default unfilteredTotalItems to totalCount if not provided', () => {
			const transactions = [createMockTransaction()];
			transactionStore.setTransactions(transactions, 50);

			const state = get(transactionStore);
			expect(state.pagination.totalItems).toBe(50);
			expect(state.unfilteredTotalItems).toBe(50);
		});
	});
});

describe('filterTransactionsBySearch', () => {
	const transactions: TransactionWithDisplay[] = [
		createMockTransaction({ id: '1', payee: 'Grocery Store', memo: 'Weekly groceries' }),
		createMockTransaction({ id: '2', payee: 'Gas Station', memo: 'Fuel for car' }),
		createMockTransaction({ id: '3', payee: 'Amazon', memo: 'Electronics purchase' }),
		createMockTransaction({ id: '4', payee: 'Coffee Shop', memo: 'Morning coffee' }),
		createMockTransaction({ id: '5', payee: 'Restaurant', memo: null })
	];

	describe('basic matching', () => {
		it('should return all transactions for empty query', () => {
			const result = filterTransactionsBySearch(transactions, '');
			expect(result.length).toBe(5);
		});

		it('should return all transactions for query under 2 characters', () => {
			const result = filterTransactionsBySearch(transactions, 'a');
			expect(result.length).toBe(5);
		});

		it('should filter by payee field', () => {
			const result = filterTransactionsBySearch(transactions, 'Grocery');
			expect(result.length).toBe(1);
			expect(result[0].payee).toBe('Grocery Store');
		});

		it('should filter by memo field', () => {
			const result = filterTransactionsBySearch(transactions, 'coffee');
			expect(result.length).toBe(1);
			expect(result[0].memo).toBe('Morning coffee');
		});

		it('should match across both payee and memo fields', () => {
			const resultPayee = filterTransactionsBySearch(transactions, 'Amazon');
			expect(resultPayee.length).toBe(1);

			const resultMemo = filterTransactionsBySearch(transactions, 'Electronics');
			expect(resultMemo.length).toBe(1);
			expect(resultMemo[0].id).toBe(resultPayee[0].id);
		});
	});

	describe('case-insensitive matching', () => {
		it('should match uppercase queries', () => {
			const result = filterTransactionsBySearch(transactions, 'GROCERY');
			expect(result.length).toBe(1);
			expect(result[0].payee).toBe('Grocery Store');
		});

		it('should match lowercase queries', () => {
			const result = filterTransactionsBySearch(transactions, 'grocery');
			expect(result.length).toBe(1);
			expect(result[0].payee).toBe('Grocery Store');
		});

		it('should match mixed case queries', () => {
			const result = filterTransactionsBySearch(transactions, 'GrOcErY');
			expect(result.length).toBe(1);
			expect(result[0].payee).toBe('Grocery Store');
		});
	});

	describe('partial matching', () => {
		it('should match partial payee strings', () => {
			const result = filterTransactionsBySearch(transactions, 'Sta');
			// Matches "Gas Station" and "Restaurant" (both contain "sta")
			expect(result.length).toBe(2);
			const payees = result.map((t) => t.payee);
			expect(payees).toContain('Gas Station');
			expect(payees).toContain('Restaurant');
		});

		it('should match partial memo strings', () => {
			const result = filterTransactionsBySearch(transactions, 'Elect');
			expect(result.length).toBe(1);
			expect(result[0].memo).toBe('Electronics purchase');
		});
	});

	describe('edge cases', () => {
		it('should handle null memo gracefully', () => {
			const result = filterTransactionsBySearch(transactions, 'Restaurant');
			expect(result.length).toBe(1);
			expect(result[0].memo).toBeNull();
		});

		it('should return empty array when no matches found', () => {
			const result = filterTransactionsBySearch(transactions, 'nonexistent');
			expect(result.length).toBe(0);
		});

		it('should handle empty transactions array', () => {
			const result = filterTransactionsBySearch([], 'test');
			expect(result.length).toBe(0);
		});

		it('should handle special characters in query', () => {
			const specialTransactions = [
				createMockTransaction({ payee: 'Store & Co.', memo: 'Test (memo)' })
			];
			const result = filterTransactionsBySearch(specialTransactions, '&');
			expect(result.length).toBe(1);
		});
	});
});
