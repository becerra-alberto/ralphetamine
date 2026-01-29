/**
 * Budget store for managing budget view state
 *
 * Handles date range, category data, and budget values for the grid.
 */

import { writable, derived, type Readable, type Writable } from 'svelte/store';
import type { MonthString, Budget, BudgetWithCategory, CategoryBudgetComparison } from '$lib/types/budget';
import type { Category } from '$lib/types/category';
import { getDefaultDateRange, getCurrentMonth, groupMonthsByYear, type YearGroup } from '$lib/utils/dates';

/**
 * Budget cell data for a single category/month intersection
 */
export interface BudgetCell {
	categoryId: string;
	month: MonthString;
	budgetedCents: number;
	actualCents: number;
	remainingCents: number;
}

/**
 * Category row data including all month cells
 */
export interface CategoryRowData {
	category: Category;
	cells: Map<MonthString, BudgetCell>;
}

/**
 * Budget grid state
 */
export interface BudgetGridState {
	months: MonthString[];
	categories: Category[];
	budgets: Map<string, Budget>;
	actuals: Map<string, number>;
	isLoading: boolean;
	error: string | null;
}

/**
 * Create the key for budget/actual maps
 */
export function createCellKey(categoryId: string, month: MonthString): string {
	return `${categoryId}:${month}`;
}

/**
 * Parse a cell key back to categoryId and month
 */
export function parseCellKey(key: string): { categoryId: string; month: MonthString } {
	const [categoryId, month] = key.split(':');
	return { categoryId, month };
}

// Initialize with default 12-month range
const initialState: BudgetGridState = {
	months: getDefaultDateRange(),
	categories: [],
	budgets: new Map(),
	actuals: new Map(),
	isLoading: false,
	error: null
};

/**
 * Create the budget grid store
 */
function createBudgetStore() {
	const { subscribe, set, update }: Writable<BudgetGridState> = writable(initialState);

	return {
		subscribe,

		/**
		 * Set the date range for the grid
		 */
		setDateRange: (months: MonthString[]) => {
			update((state) => ({ ...state, months }));
		},

		/**
		 * Reset to default 12-month range
		 */
		resetDateRange: () => {
			update((state) => ({ ...state, months: getDefaultDateRange() }));
		},

		/**
		 * Set categories
		 */
		setCategories: (categories: Category[]) => {
			update((state) => ({ ...state, categories }));
		},

		/**
		 * Set budgets from API response
		 */
		setBudgets: (budgets: Budget[]) => {
			const budgetMap = new Map<string, Budget>();
			budgets.forEach((budget) => {
				const key = createCellKey(budget.categoryId, budget.month);
				budgetMap.set(key, budget);
			});
			update((state) => ({ ...state, budgets: budgetMap }));
		},

		/**
		 * Set actual spending from API response
		 */
		setActuals: (actuals: Array<{ categoryId: string; month: MonthString; totalCents: number }>) => {
			const actualMap = new Map<string, number>();
			actuals.forEach((actual) => {
				const key = createCellKey(actual.categoryId, actual.month);
				actualMap.set(key, actual.totalCents);
			});
			update((state) => ({ ...state, actuals: actualMap }));
		},

		/**
		 * Update a single budget value
		 */
		updateBudget: (categoryId: string, month: MonthString, budget: Budget) => {
			update((state) => {
				const newBudgets = new Map(state.budgets);
				const key = createCellKey(categoryId, month);
				newBudgets.set(key, budget);
				return { ...state, budgets: newBudgets };
			});
		},

		/**
		 * Set loading state
		 */
		setLoading: (isLoading: boolean) => {
			update((state) => ({ ...state, isLoading }));
		},

		/**
		 * Set error state
		 */
		setError: (error: string | null) => {
			update((state) => ({ ...state, error }));
		},

		/**
		 * Reset the store to initial state
		 */
		reset: () => {
			set(initialState);
		}
	};
}

// Create the store singleton
export const budgetStore = createBudgetStore();

/**
 * Derived store for year groups (for rendering year headers)
 */
export const yearGroups: Readable<YearGroup[]> = derived(budgetStore, ($budgetStore) =>
	groupMonthsByYear($budgetStore.months)
);

/**
 * Derived store for category row data with cell values
 */
export const categoryRows: Readable<CategoryRowData[]> = derived(budgetStore, ($budgetStore) => {
	return $budgetStore.categories.map((category) => {
		const cells = new Map<MonthString, BudgetCell>();

		$budgetStore.months.forEach((month) => {
			const key = createCellKey(category.id, month);
			const budget = $budgetStore.budgets.get(key);
			const actual = $budgetStore.actuals.get(key) ?? 0;
			const budgeted = budget?.amountCents ?? 0;

			cells.set(month, {
				categoryId: category.id,
				month,
				budgetedCents: budgeted,
				actualCents: actual,
				remainingCents: budgeted - Math.abs(actual)
			});
		});

		return { category, cells };
	});
});

/**
 * Derived store for current month (for highlighting)
 */
export const currentMonth: Readable<MonthString> = derived(budgetStore, () => getCurrentMonth());

/**
 * Derived store to check if store is empty (no categories)
 */
export const isEmpty: Readable<boolean> = derived(
	budgetStore,
	($budgetStore) => $budgetStore.categories.length === 0
);

/**
 * Derived store for total budgeted per month
 */
export const monthlyTotals: Readable<Map<MonthString, { budgeted: number; actual: number }>> =
	derived(budgetStore, ($budgetStore) => {
		const totals = new Map<MonthString, { budgeted: number; actual: number }>();

		$budgetStore.months.forEach((month) => {
			let budgeted = 0;
			let actual = 0;

			$budgetStore.categories.forEach((category) => {
				const key = createCellKey(category.id, month);
				const budget = $budgetStore.budgets.get(key);
				const actualValue = $budgetStore.actuals.get(key) ?? 0;

				budgeted += budget?.amountCents ?? 0;
				actual += actualValue;
			});

			totals.set(month, { budgeted, actual });
		});

		return totals;
	});
