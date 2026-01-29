import { writable, derived } from 'svelte/store';
import type { TransactionFilters } from '$lib/types/transaction';
import type { TransactionWithDisplay } from './transactions';

export type { CategoryNode, TagInfo } from '$lib/types/ui';

export interface FilterDateRange {
	start: string | null;
	end: string | null;
	preset: string | null;
}

export interface TransactionFilterState {
	isOpen: boolean;
	dateRange: FilterDateRange;
	accountIds: string[];
	categoryIds: string[];
	tagNames: string[];
	amountRange: {
		min: number | null;
		max: number | null;
	};
	type: 'all' | 'income' | 'expense';
}

const defaultState: TransactionFilterState = {
	isOpen: false,
	dateRange: { start: null, end: null, preset: null },
	accountIds: [],
	categoryIds: [],
	tagNames: [],
	amountRange: { min: null, max: null },
	type: 'all'
};

function createTransactionFilterStore() {
	const { subscribe, set, update } = writable<TransactionFilterState>({ ...defaultState });

	return {
		subscribe,

		toggle: () => {
			update((state) => ({ ...state, isOpen: !state.isOpen }));
		},

		open: () => {
			update((state) => ({ ...state, isOpen: true }));
		},

		close: () => {
			update((state) => ({ ...state, isOpen: false }));
		},

		setDateRange: (dateRange: FilterDateRange) => {
			update((state) => ({ ...state, dateRange }));
		},

		setDatePreset: (preset: string) => {
			const now = new Date();
			let start: string | null = null;
			let end: string | null = null;

			switch (preset) {
				case 'today': {
					const d = formatDate(now);
					start = d;
					end = d;
					break;
				}
				case 'this-week': {
					const day = now.getDay();
					const monday = new Date(now);
					monday.setDate(now.getDate() - ((day + 6) % 7));
					const sunday = new Date(monday);
					sunday.setDate(monday.getDate() + 6);
					start = formatDate(monday);
					end = formatDate(sunday);
					break;
				}
				case 'this-month': {
					const y = now.getFullYear();
					const m = now.getMonth();
					start = formatDate(new Date(y, m, 1));
					end = formatDate(new Date(y, m + 1, 0));
					break;
				}
				case 'last-30-days': {
					const thirtyAgo = new Date(now);
					thirtyAgo.setDate(now.getDate() - 30);
					start = formatDate(thirtyAgo);
					end = formatDate(now);
					break;
				}
				case 'this-year': {
					const yr = now.getFullYear();
					start = `${yr}-01-01`;
					end = `${yr}-12-31`;
					break;
				}
			}

			update((state) => ({
				...state,
				dateRange: { start, end, preset }
			}));
		},

		setAccountIds: (accountIds: string[]) => {
			update((state) => ({ ...state, accountIds }));
		},

		toggleAccountId: (id: string) => {
			update((state) => {
				const exists = state.accountIds.includes(id);
				return {
					...state,
					accountIds: exists
						? state.accountIds.filter((a) => a !== id)
						: [...state.accountIds, id]
				};
			});
		},

		setCategoryIds: (categoryIds: string[]) => {
			update((state) => ({ ...state, categoryIds }));
		},

		toggleCategoryId: (id: string) => {
			update((state) => {
				const exists = state.categoryIds.includes(id);
				return {
					...state,
					categoryIds: exists
						? state.categoryIds.filter((c) => c !== id)
						: [...state.categoryIds, id]
				};
			});
		},

		setTagNames: (tagNames: string[]) => {
			update((state) => ({ ...state, tagNames }));
		},

		toggleTag: (tag: string) => {
			update((state) => {
				const exists = state.tagNames.includes(tag);
				return {
					...state,
					tagNames: exists
						? state.tagNames.filter((t) => t !== tag)
						: [...state.tagNames, tag]
				};
			});
		},

		setAmountRange: (min: number | null, max: number | null) => {
			update((state) => ({ ...state, amountRange: { min, max } }));
		},

		setType: (type: 'all' | 'income' | 'expense') => {
			update((state) => ({ ...state, type }));
		},

		clearAll: () => {
			update((state) => ({
				...defaultState,
				isOpen: state.isOpen
			}));
		},

		reset: () => {
			set({ ...defaultState });
		}
	};
}

function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export const transactionFilterStore = createTransactionFilterStore();

export const isFilterPanelOpen = derived(
	transactionFilterStore,
	($store) => $store.isOpen
);

export const activeFilterCount = derived(transactionFilterStore, ($store) => {
	let count = 0;
	if ($store.dateRange.start || $store.dateRange.end) count++;
	if ($store.accountIds.length > 0) count++;
	if ($store.categoryIds.length > 0) count++;
	if ($store.tagNames.length > 0) count++;
	if ($store.amountRange.min !== null || $store.amountRange.max !== null) count++;
	if ($store.type !== 'all') count++;
	return count;
});

export const hasActiveFilters = derived(activeFilterCount, ($count) => $count > 0);

/**
 * Apply all filters to a transaction array using AND logic.
 * Each active filter narrows the results.
 */
export function applyTransactionFilters(
	transactions: TransactionWithDisplay[],
	filters: TransactionFilterState
): TransactionWithDisplay[] {
	let result = transactions;

	// Date range filter
	if (filters.dateRange.start) {
		result = result.filter((t) => t.date >= filters.dateRange.start!);
	}
	if (filters.dateRange.end) {
		result = result.filter((t) => t.date <= filters.dateRange.end!);
	}

	// Account filter
	if (filters.accountIds.length > 0) {
		result = result.filter((t) => filters.accountIds.includes(t.accountId));
	}

	// Category filter
	if (filters.categoryIds.length > 0) {
		result = result.filter(
			(t) => t.categoryId !== null && filters.categoryIds.includes(t.categoryId)
		);
	}

	// Tags filter (match any selected tag)
	if (filters.tagNames.length > 0) {
		result = result.filter((t) =>
			t.tags.some((tag) => filters.tagNames.includes(tag))
		);
	}

	// Amount range filter (values in cents)
	if (filters.amountRange.min !== null) {
		const minCents = filters.amountRange.min;
		result = result.filter((t) => Math.abs(t.amountCents) >= minCents);
	}
	if (filters.amountRange.max !== null) {
		const maxCents = filters.amountRange.max;
		result = result.filter((t) => Math.abs(t.amountCents) <= maxCents);
	}

	// Type filter
	if (filters.type === 'income') {
		result = result.filter((t) => t.amountCents > 0);
	} else if (filters.type === 'expense') {
		result = result.filter((t) => t.amountCents < 0);
	}

	return result;
}

/**
 * Convert dollars to cents for filter amount values
 */
export function dollarsToCents(dollars: number): number {
	return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars for display
 */
export function centsToDollars(cents: number): number {
	return cents / 100;
}

/**
 * Build TransactionFilters object for API calls from filter state
 */
export function buildApiFilters(state: TransactionFilterState): Partial<TransactionFilters> {
	const filters: Partial<TransactionFilters> = {};

	if (state.dateRange.start) {
		filters.startDate = state.dateRange.start;
	}
	if (state.dateRange.end) {
		filters.endDate = state.dateRange.end;
	}
	if (state.accountIds.length > 0) {
		filters.accountIds = state.accountIds;
	}
	if (state.categoryIds.length > 0) {
		filters.categoryIds = state.categoryIds;
	}
	if (state.tagNames.length > 0) {
		filters.tags = state.tagNames;
	}
	if (state.amountRange.min !== null) {
		filters.minAmountCents = dollarsToCents(state.amountRange.min);
	}
	if (state.amountRange.max !== null) {
		filters.maxAmountCents = dollarsToCents(state.amountRange.max);
	}
	if (state.type !== 'all') {
		filters.transactionType = state.type;
	}

	return filters;
}
