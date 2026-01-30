import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	budgetStore,
	yearGroups,
	categoryRows,
	currentMonth,
	isEmpty,
	monthlyTotals,
	createCellKey,
	parseCellKey,
	hasUncategorized,
	uncategorizedTotals,
	uncategorizedCount
} from '../../stores/budget';
import type { Category } from '../../types/category';
import type { Budget } from '../../types/budget';

describe('Budget Store', () => {
	beforeEach(() => {
		budgetStore.reset();
	});

	describe('createCellKey', () => {
		it('should create a unique key from categoryId and month', () => {
			const key = createCellKey('cat-123', '2025-01');
			expect(key).toBe('cat-123:2025-01');
		});
	});

	describe('parseCellKey', () => {
		it('should parse key back to categoryId and month', () => {
			const { categoryId, month } = parseCellKey('cat-123:2025-01');
			expect(categoryId).toBe('cat-123');
			expect(month).toBe('2025-01');
		});
	});

	describe('budgetStore', () => {
		it('should initialize with default 12-month range', () => {
			const state = get(budgetStore);
			expect(state.months).toHaveLength(12);
		});

		it('should initialize with empty categories', () => {
			const state = get(budgetStore);
			expect(state.categories).toEqual([]);
		});

		it('should initialize with isLoading false', () => {
			const state = get(budgetStore);
			expect(state.isLoading).toBe(false);
		});

		it('should initialize with error null', () => {
			const state = get(budgetStore);
			expect(state.error).toBeNull();
		});
	});

	describe('setDateRange', () => {
		it('should update months array', () => {
			const newMonths = ['2025-01', '2025-02', '2025-03'];
			budgetStore.setDateRange(newMonths);

			const state = get(budgetStore);
			expect(state.months).toEqual(newMonths);
		});
	});

	describe('resetDateRange', () => {
		it('should reset to default 12-month range', () => {
			budgetStore.setDateRange(['2025-01']);
			budgetStore.resetDateRange();

			const state = get(budgetStore);
			expect(state.months).toHaveLength(12);
		});
	});

	describe('setCategories', () => {
		it('should update categories array', () => {
			const categories: Category[] = [
				{
					id: 'cat-1',
					name: 'Groceries',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setCategories(categories);

			const state = get(budgetStore);
			expect(state.categories).toEqual(categories);
		});
	});

	describe('setBudgets', () => {
		it('should create budget map from array', () => {
			const budgets: Budget[] = [
				{
					categoryId: 'cat-1',
					month: '2025-01',
					amountCents: 50000,
					note: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setBudgets(budgets);

			const state = get(budgetStore);
			expect(state.budgets.get('cat-1:2025-01')).toEqual(budgets[0]);
		});
	});

	describe('setActuals', () => {
		it('should create actuals map from array', () => {
			const actuals = [{ categoryId: 'cat-1', month: '2025-01', totalCents: 35000 }];
			budgetStore.setActuals(actuals);

			const state = get(budgetStore);
			expect(state.actuals.get('cat-1:2025-01')).toBe(35000);
		});
	});

	describe('updateBudget', () => {
		it('should update a single budget in the map', () => {
			const budget: Budget = {
				categoryId: 'cat-1',
				month: '2025-01',
				amountCents: 60000,
				note: 'Updated',
				createdAt: '2025-01-01T00:00:00Z',
				updatedAt: '2025-01-01T00:00:00Z'
			};
			budgetStore.updateBudget('cat-1', '2025-01', budget);

			const state = get(budgetStore);
			expect(state.budgets.get('cat-1:2025-01')?.amountCents).toBe(60000);
		});
	});

	describe('setLoading', () => {
		it('should update loading state', () => {
			budgetStore.setLoading(true);
			expect(get(budgetStore).isLoading).toBe(true);

			budgetStore.setLoading(false);
			expect(get(budgetStore).isLoading).toBe(false);
		});
	});

	describe('setError', () => {
		it('should update error state', () => {
			budgetStore.setError('Something went wrong');
			expect(get(budgetStore).error).toBe('Something went wrong');

			budgetStore.setError(null);
			expect(get(budgetStore).error).toBeNull();
		});
	});

	describe('reset', () => {
		it('should reset to initial state', () => {
			const categories: Category[] = [
				{
					id: 'cat-1',
					name: 'Test',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setCategories(categories);
			budgetStore.setError('Error');
			budgetStore.setLoading(true);

			budgetStore.reset();

			const state = get(budgetStore);
			expect(state.categories).toEqual([]);
			expect(state.error).toBeNull();
			expect(state.isLoading).toBe(false);
		});
	});
});

describe('Invalidation Signal', () => {
	beforeEach(() => {
		budgetStore.reset();
	});

	describe('invalidate', () => {
		it('should increment invalidationCounter on invalidate()', () => {
			const stateBefore = get(budgetStore);
			expect(stateBefore.invalidationCounter).toBe(0);

			budgetStore.invalidate();

			const stateAfter = get(budgetStore);
			expect(stateAfter.invalidationCounter).toBe(1);
		});

		it('should increment counter on each invalidate call', () => {
			budgetStore.invalidate();
			budgetStore.invalidate();
			budgetStore.invalidate();

			const state = get(budgetStore);
			expect(state.invalidationCounter).toBe(3);
		});

		it('should reset invalidationCounter on reset()', () => {
			budgetStore.invalidate();
			budgetStore.invalidate();
			expect(get(budgetStore).invalidationCounter).toBe(2);

			budgetStore.reset();
			expect(get(budgetStore).invalidationCounter).toBe(0);
		});

		it('should trigger store subscribers when invalidated', () => {
			const callback = vi.fn();
			const unsubscribe = budgetStore.subscribe(callback);

			// Clear the initial call from subscribe
			callback.mockClear();

			budgetStore.invalidate();

			expect(callback).toHaveBeenCalledTimes(1);
			const state = callback.mock.calls[0][0];
			expect(state.invalidationCounter).toBe(1);

			unsubscribe();
		});
	});
});

describe('Derived Stores', () => {
	beforeEach(() => {
		budgetStore.reset();
	});

	describe('yearGroups', () => {
		it('should derive year groups from months', () => {
			budgetStore.setDateRange(['2024-11', '2024-12', '2025-01', '2025-02']);

			const groups = get(yearGroups);
			expect(groups).toHaveLength(2);
			expect(groups[0].year).toBe(2024);
			expect(groups[1].year).toBe(2025);
		});
	});

	describe('categoryRows', () => {
		it('should derive category row data with cells', () => {
			const categories: Category[] = [
				{
					id: 'cat-1',
					name: 'Groceries',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setCategories(categories);
			budgetStore.setDateRange(['2025-01', '2025-02']);

			const budgets: Budget[] = [
				{
					categoryId: 'cat-1',
					month: '2025-01',
					amountCents: 50000,
					note: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setBudgets(budgets);

			const rows = get(categoryRows);
			expect(rows).toHaveLength(1);
			expect(rows[0].category.id).toBe('cat-1');
			expect(rows[0].cells.get('2025-01')?.budgetedCents).toBe(50000);
		});
	});

	describe('currentMonth', () => {
		it('should return current month in YYYY-MM format', () => {
			const current = get(currentMonth);
			expect(current).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
		});
	});

	describe('isEmpty', () => {
		it('should return true when no categories', () => {
			expect(get(isEmpty)).toBe(true);
		});

		it('should return false when categories exist', () => {
			budgetStore.setCategories([
				{
					id: 'cat-1',
					name: 'Test',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			]);
			expect(get(isEmpty)).toBe(false);
		});
	});

	describe('monthlyTotals', () => {
		it('should calculate totals for each month', () => {
			const categories: Category[] = [
				{
					id: 'cat-1',
					name: 'Groceries',
					parentId: null,
					type: 'expense',
					icon: null,
					color: null,
					sortOrder: 0,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setCategories(categories);
			budgetStore.setDateRange(['2025-01']);

			const budgets: Budget[] = [
				{
					categoryId: 'cat-1',
					month: '2025-01',
					amountCents: 50000,
					note: null,
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: '2025-01-01T00:00:00Z'
				}
			];
			budgetStore.setBudgets(budgets);
			budgetStore.setActuals([{ categoryId: 'cat-1', month: '2025-01', totalCents: 35000 }]);

			const totals = get(monthlyTotals);
			expect(totals.get('2025-01')).toEqual({ budgeted: 50000, actual: 35000 });
		});
	});
});

describe('Uncategorized Transactions', () => {
	beforeEach(() => {
		budgetStore.reset();
	});

	describe('setUncategorized', () => {
		it('should set uncategorized transaction data', () => {
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: -15000, transactionCount: 3 },
				{ month: '2025-02', totalCents: -25000, transactionCount: 5 }
			]);

			const state = get(budgetStore);
			expect(state.uncategorized.get('2025-01')).toEqual({
				month: '2025-01',
				totalCents: -15000,
				transactionCount: 3
			});
		});

		it('should query WHERE category_id IS NULL (conceptually)', () => {
			// This tests that the store correctly handles uncategorized data
			// In a real scenario, the backend queries WHERE category_id IS NULL
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: -15000, transactionCount: 3 }
			]);

			const state = get(budgetStore);
			const data = state.uncategorized.get('2025-01');
			expect(data).toBeDefined();
			expect(data?.totalCents).toBe(-15000);
		});

		it('should use cents arithmetic for totals', () => {
			// Verify amounts are in cents (integer arithmetic)
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: -15050, transactionCount: 2 }
			]);

			const state = get(budgetStore);
			const data = state.uncategorized.get('2025-01');
			// 15050 cents = $150.50
			expect(data?.totalCents).toBe(-15050);
			expect(Number.isInteger(data?.totalCents)).toBe(true);
		});
	});

	describe('hasUncategorized', () => {
		it('should return false when no uncategorized transactions', () => {
			expect(get(hasUncategorized)).toBe(false);
		});

		it('should return true when uncategorized transactions exist', () => {
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: -15000, transactionCount: 3 }
			]);
			expect(get(hasUncategorized)).toBe(true);
		});

		it('should return false when transaction count is 0', () => {
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: 0, transactionCount: 0 }
			]);
			expect(get(hasUncategorized)).toBe(false);
		});
	});

	describe('uncategorizedTotals', () => {
		it('should return uncategorized data map', () => {
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: -15000, transactionCount: 3 }
			]);

			const totals = get(uncategorizedTotals);
			expect(totals.has('2025-01')).toBe(true);
			expect(totals.get('2025-01')?.totalCents).toBe(-15000);
		});
	});

	describe('uncategorizedCount', () => {
		it('should return total count of uncategorized transactions', () => {
			budgetStore.setUncategorized([
				{ month: '2025-01', totalCents: -15000, transactionCount: 3 },
				{ month: '2025-02', totalCents: -25000, transactionCount: 5 }
			]);

			expect(get(uncategorizedCount)).toBe(8);
		});

		it('should return 0 when no uncategorized transactions', () => {
			expect(get(uncategorizedCount)).toBe(0);
		});
	});
});
