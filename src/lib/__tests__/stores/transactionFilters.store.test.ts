import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	transactionFilterStore,
	activeFilterCount,
	hasActiveFilters,
	applyTransactionFilters,
	buildApiFilters,
	dollarsToCents,
	centsToDollars,
	type TransactionFilterState
} from '../../stores/transactionFilters';
import type { TransactionWithDisplay } from '../../stores/transactions';

function createMockTransaction(
	overrides: Partial<TransactionWithDisplay> = {}
): TransactionWithDisplay {
	return {
		id: 'txn-' + Math.random().toString(36).substring(7),
		date: '2025-06-15',
		payee: 'Test Payee',
		categoryId: 'cat-1',
		memo: 'Test memo',
		amountCents: -5000,
		accountId: 'acc-1',
		tags: [],
		isReconciled: false,
		importSource: null,
		createdAt: '2025-06-15T10:00:00Z',
		updatedAt: '2025-06-15T10:00:00Z',
		categoryName: 'Groceries',
		accountName: 'Checking',
		...overrides
	};
}

function getDefaultFilterState(): TransactionFilterState {
	return {
		isOpen: false,
		dateRange: { start: null, end: null, preset: null },
		accountIds: [],
		categoryIds: [],
		tagNames: [],
		amountRange: { min: null, max: null },
		type: 'all'
	};
}

describe('transactionFilterStore', () => {
	beforeEach(() => {
		transactionFilterStore.reset();
	});

	describe('applyTransactionFilters - AND logic', () => {
		const sampleTransactions: TransactionWithDisplay[] = [
			createMockTransaction({
				id: 'txn-1',
				date: '2025-06-01',
				amountCents: -3000,
				accountId: 'acc-checking',
				categoryId: 'cat-groceries',
				tags: ['food', 'weekly'],
				accountName: 'Checking',
				categoryName: 'Groceries'
			}),
			createMockTransaction({
				id: 'txn-2',
				date: '2025-06-10',
				amountCents: 150000,
				accountId: 'acc-checking',
				categoryId: 'cat-salary',
				tags: ['recurring'],
				accountName: 'Checking',
				categoryName: 'Salary'
			}),
			createMockTransaction({
				id: 'txn-3',
				date: '2025-07-05',
				amountCents: -12000,
				accountId: 'acc-savings',
				categoryId: 'cat-utilities',
				tags: ['bills', 'recurring'],
				accountName: 'Savings',
				categoryName: 'Utilities'
			}),
			createMockTransaction({
				id: 'txn-4',
				date: '2025-07-20',
				amountCents: -500,
				accountId: 'acc-credit',
				categoryId: null,
				tags: [],
				accountName: 'Credit Card',
				categoryName: null
			}),
			createMockTransaction({
				id: 'txn-5',
				date: '2025-08-01',
				amountCents: 50000,
				accountId: 'acc-savings',
				categoryId: 'cat-interest',
				tags: ['passive'],
				accountName: 'Savings',
				categoryName: 'Interest'
			})
		];

		it('should filter transactions by date range', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-06-01', end: '2025-06-30', preset: null }
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-2']);
		});

		it('should filter transactions by start date only', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-07-01', end: null, preset: null }
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(3);
			expect(result.map((t) => t.id)).toEqual(['txn-3', 'txn-4', 'txn-5']);
		});

		it('should filter transactions by end date only', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: null, end: '2025-06-10', preset: null }
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-2']);
		});

		it('should filter transactions by account IDs', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				accountIds: ['acc-checking']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-2']);
		});

		it('should filter transactions by multiple account IDs', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				accountIds: ['acc-checking', 'acc-savings']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(4);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-2', 'txn-3', 'txn-5']);
		});

		it('should filter transactions by category IDs', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				categoryIds: ['cat-groceries', 'cat-utilities']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-3']);
		});

		it('should exclude transactions with null categoryId when category filter is active', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				categoryIds: ['cat-groceries']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('txn-1');
			expect(result.find((t) => t.id === 'txn-4')).toBeUndefined();
		});

		it('should filter transactions by tags (match any selected tag)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				tagNames: ['food']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('txn-1');
		});

		it('should match any of the selected tags (OR within tags)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				tagNames: ['food', 'passive']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-5']);
		});

		it('should exclude transactions with no matching tags', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				tagNames: ['recurring']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-2', 'txn-3']);
			expect(result.find((t) => t.id === 'txn-4')).toBeUndefined();
		});

		it('should filter transactions by amount range (min only)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				amountRange: { min: 10000, max: null }
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(3);
			expect(result.map((t) => t.id)).toEqual(['txn-2', 'txn-3', 'txn-5']);
		});

		it('should filter transactions by amount range (max only)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				amountRange: { min: null, max: 5000 }
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-4']);
		});

		it('should filter transactions by amount range (min and max)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				amountRange: { min: 3000, max: 50000 }
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(3);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-3', 'txn-5']);
		});

		it('should filter transactions by type income (positive amounts)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				type: 'income'
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-2', 'txn-5']);
			result.forEach((t) => {
				expect(t.amountCents).toBeGreaterThan(0);
			});
		});

		it('should filter transactions by type expense (negative amounts)', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				type: 'expense'
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(3);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-3', 'txn-4']);
			result.forEach((t) => {
				expect(t.amountCents).toBeLessThan(0);
			});
		});

		it('should not filter by type when set to all', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				type: 'all'
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(5);
		});

		it('should combine date + type + account filters with AND logic', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-06-01', end: '2025-07-31', preset: null },
				type: 'expense',
				accountIds: ['acc-checking', 'acc-savings']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			// Date range: txn-1, txn-2, txn-3, txn-4
			// AND expense: txn-1, txn-3, txn-4
			// AND accounts (checking, savings): txn-1, txn-3
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-1', 'txn-3']);
		});

		it('should combine all filters simultaneously', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-06-01', end: '2025-08-31', preset: null },
				accountIds: ['acc-checking', 'acc-savings'],
				categoryIds: ['cat-groceries', 'cat-utilities', 'cat-salary'],
				tagNames: ['recurring'],
				amountRange: { min: null, max: null },
				type: 'all'
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			// Date: txn-1, txn-2, txn-3, txn-4, txn-5
			// Accounts (checking, savings): txn-1, txn-2, txn-3, txn-5
			// Categories (groceries, utilities, salary): txn-1, txn-2, txn-3
			// Tags (recurring): txn-2, txn-3
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toEqual(['txn-2', 'txn-3']);
		});

		it('should return empty array when no transactions match combined filters', () => {
			const filters: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-06-01', end: '2025-06-30', preset: null },
				type: 'income',
				accountIds: ['acc-credit']
			};

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(0);
		});

		it('should return all transactions when no filters are active', () => {
			const filters: TransactionFilterState = getDefaultFilterState();

			const result = applyTransactionFilters(sampleTransactions, filters);

			expect(result).toHaveLength(5);
		});
	});

	describe('clearAll', () => {
		it('should reset every filter to default state while preserving isOpen', () => {
			transactionFilterStore.open();
			transactionFilterStore.setDateRange({
				start: '2025-01-01',
				end: '2025-12-31',
				preset: 'this-year'
			});
			transactionFilterStore.setAccountIds(['acc-1', 'acc-2']);
			transactionFilterStore.setCategoryIds(['cat-1', 'cat-2']);
			transactionFilterStore.setTagNames(['food', 'bills']);
			transactionFilterStore.setAmountRange(1000, 50000);
			transactionFilterStore.setType('expense');

			const beforeClear = get(transactionFilterStore);
			expect(beforeClear.dateRange.start).toBe('2025-01-01');
			expect(beforeClear.accountIds).toHaveLength(2);
			expect(beforeClear.categoryIds).toHaveLength(2);
			expect(beforeClear.tagNames).toHaveLength(2);
			expect(beforeClear.amountRange.min).toBe(1000);
			expect(beforeClear.amountRange.max).toBe(50000);
			expect(beforeClear.type).toBe('expense');
			expect(beforeClear.isOpen).toBe(true);

			transactionFilterStore.clearAll();

			const state = get(transactionFilterStore);
			expect(state.dateRange).toEqual({ start: null, end: null, preset: null });
			expect(state.accountIds).toEqual([]);
			expect(state.categoryIds).toEqual([]);
			expect(state.tagNames).toEqual([]);
			expect(state.amountRange).toEqual({ min: null, max: null });
			expect(state.type).toBe('all');
			expect(state.isOpen).toBe(true);
		});

		it('should preserve isOpen as false when panel was closed', () => {
			transactionFilterStore.setType('income');
			transactionFilterStore.close();

			transactionFilterStore.clearAll();

			const state = get(transactionFilterStore);
			expect(state.type).toBe('all');
			expect(state.isOpen).toBe(false);
		});
	});

	describe('activeFilterCount', () => {
		it('should return 0 when no filters are active', () => {
			expect(get(activeFilterCount)).toBe(0);
		});

		it('should count date range as 1 filter', () => {
			transactionFilterStore.setDateRange({
				start: '2025-01-01',
				end: '2025-12-31',
				preset: null
			});

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count date range with only start date as 1 filter', () => {
			transactionFilterStore.setDateRange({
				start: '2025-01-01',
				end: null,
				preset: null
			});

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count account IDs as 1 filter regardless of count', () => {
			transactionFilterStore.setAccountIds(['acc-1', 'acc-2', 'acc-3']);

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count category IDs as 1 filter', () => {
			transactionFilterStore.setCategoryIds(['cat-1']);

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count tag names as 1 filter', () => {
			transactionFilterStore.setTagNames(['food', 'bills']);

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count amount range as 1 filter when min is set', () => {
			transactionFilterStore.setAmountRange(1000, null);

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count amount range as 1 filter when max is set', () => {
			transactionFilterStore.setAmountRange(null, 5000);

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should count type filter when not "all"', () => {
			transactionFilterStore.setType('income');

			expect(get(activeFilterCount)).toBe(1);
		});

		it('should not count type filter when set to "all"', () => {
			transactionFilterStore.setType('all');

			expect(get(activeFilterCount)).toBe(0);
		});

		it('should count all active filters correctly', () => {
			transactionFilterStore.setDateRange({
				start: '2025-01-01',
				end: '2025-12-31',
				preset: null
			});
			transactionFilterStore.setAccountIds(['acc-1']);
			transactionFilterStore.setCategoryIds(['cat-1']);
			transactionFilterStore.setTagNames(['food']);
			transactionFilterStore.setAmountRange(100, 5000);
			transactionFilterStore.setType('expense');

			expect(get(activeFilterCount)).toBe(6);
		});

		it('should update hasActiveFilters derived store', () => {
			expect(get(hasActiveFilters)).toBe(false);

			transactionFilterStore.setType('income');

			expect(get(hasActiveFilters)).toBe(true);

			transactionFilterStore.setType('all');

			expect(get(hasActiveFilters)).toBe(false);
		});
	});

	describe('buildApiFilters', () => {
		it('should return empty object for default state', () => {
			const result = buildApiFilters(getDefaultFilterState());

			expect(result).toEqual({});
		});

		it('should map date range to startDate and endDate', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-01-01', end: '2025-12-31', preset: null }
			};

			const result = buildApiFilters(state);

			expect(result.startDate).toBe('2025-01-01');
			expect(result.endDate).toBe('2025-12-31');
		});

		it('should map only startDate when end is null', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: '2025-06-01', end: null, preset: null }
			};

			const result = buildApiFilters(state);

			expect(result.startDate).toBe('2025-06-01');
			expect(result.endDate).toBeUndefined();
		});

		it('should map only endDate when start is null', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				dateRange: { start: null, end: '2025-12-31', preset: null }
			};

			const result = buildApiFilters(state);

			expect(result.startDate).toBeUndefined();
			expect(result.endDate).toBe('2025-12-31');
		});

		it('should map accountIds', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				accountIds: ['acc-1', 'acc-2']
			};

			const result = buildApiFilters(state);

			expect(result.accountIds).toEqual(['acc-1', 'acc-2']);
		});

		it('should not include accountIds when empty', () => {
			const state: TransactionFilterState = getDefaultFilterState();

			const result = buildApiFilters(state);

			expect(result.accountIds).toBeUndefined();
		});

		it('should map categoryIds', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				categoryIds: ['cat-1', 'cat-2']
			};

			const result = buildApiFilters(state);

			expect(result.categoryIds).toEqual(['cat-1', 'cat-2']);
		});

		it('should map tagNames to tags', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				tagNames: ['food', 'bills']
			};

			const result = buildApiFilters(state);

			expect(result.tags).toEqual(['food', 'bills']);
		});

		it('should not include tags when tagNames is empty', () => {
			const state: TransactionFilterState = getDefaultFilterState();

			const result = buildApiFilters(state);

			expect(result.tags).toBeUndefined();
		});

		it('should convert amountRange min from dollars to cents for minAmountCents', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				amountRange: { min: 50, max: null }
			};

			const result = buildApiFilters(state);

			expect(result.minAmountCents).toBe(5000);
			expect(result.maxAmountCents).toBeUndefined();
		});

		it('should convert amountRange max from dollars to cents for maxAmountCents', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				amountRange: { min: null, max: 200 }
			};

			const result = buildApiFilters(state);

			expect(result.minAmountCents).toBeUndefined();
			expect(result.maxAmountCents).toBe(20000);
		});

		it('should map type to transactionType when not "all"', () => {
			const incomeState: TransactionFilterState = {
				...getDefaultFilterState(),
				type: 'income'
			};

			expect(buildApiFilters(incomeState).transactionType).toBe('income');

			const expenseState: TransactionFilterState = {
				...getDefaultFilterState(),
				type: 'expense'
			};

			expect(buildApiFilters(expenseState).transactionType).toBe('expense');
		});

		it('should not include transactionType when type is "all"', () => {
			const state: TransactionFilterState = {
				...getDefaultFilterState(),
				type: 'all'
			};

			const result = buildApiFilters(state);

			expect(result.transactionType).toBeUndefined();
		});

		it('should build full API filters from fully populated state', () => {
			const state: TransactionFilterState = {
				isOpen: true,
				dateRange: { start: '2025-01-01', end: '2025-12-31', preset: 'this-year' },
				accountIds: ['acc-1'],
				categoryIds: ['cat-1', 'cat-2'],
				tagNames: ['food'],
				amountRange: { min: 10, max: 500 },
				type: 'expense'
			};

			const result = buildApiFilters(state);

			expect(result).toEqual({
				startDate: '2025-01-01',
				endDate: '2025-12-31',
				accountIds: ['acc-1'],
				categoryIds: ['cat-1', 'cat-2'],
				tags: ['food'],
				minAmountCents: 1000,
				maxAmountCents: 50000,
				transactionType: 'expense'
			});
		});
	});

	describe('dollarsToCents', () => {
		it('should convert whole dollar amounts', () => {
			expect(dollarsToCents(1)).toBe(100);
			expect(dollarsToCents(50)).toBe(5000);
			expect(dollarsToCents(1000)).toBe(100000);
		});

		it('should convert fractional dollar amounts', () => {
			expect(dollarsToCents(1.5)).toBe(150);
			expect(dollarsToCents(19.99)).toBe(1999);
			expect(dollarsToCents(0.01)).toBe(1);
		});

		it('should handle zero', () => {
			expect(dollarsToCents(0)).toBe(0);
		});

		it('should round to avoid floating point issues', () => {
			expect(dollarsToCents(0.1 + 0.2)).toBe(30);
		});

		it('should handle negative values', () => {
			expect(dollarsToCents(-25.5)).toBe(-2550);
		});
	});

	describe('centsToDollars', () => {
		it('should convert whole cent amounts', () => {
			expect(centsToDollars(100)).toBe(1);
			expect(centsToDollars(5000)).toBe(50);
			expect(centsToDollars(100000)).toBe(1000);
		});

		it('should convert fractional cent results', () => {
			expect(centsToDollars(150)).toBe(1.5);
			expect(centsToDollars(1999)).toBe(19.99);
			expect(centsToDollars(1)).toBe(0.01);
		});

		it('should handle zero', () => {
			expect(centsToDollars(0)).toBe(0);
		});

		it('should handle negative values', () => {
			expect(centsToDollars(-2550)).toBe(-25.5);
		});

		it('should be the inverse of dollarsToCents for integer cent values', () => {
			expect(centsToDollars(dollarsToCents(42.99))).toBe(42.99);
			expect(dollarsToCents(centsToDollars(4299))).toBe(4299);
		});
	});
});
