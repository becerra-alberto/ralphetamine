import { writable, derived } from 'svelte/store';
import type { Transaction } from '$lib/types/transaction';

export type SortableColumn = 'date' | 'payee' | 'category' | 'amount' | 'account';
export type SortDirection = 'asc' | 'desc';

export interface TransactionWithDisplay extends Transaction {
	categoryName: string | null;
	accountName: string;
}

export interface TransactionStoreState {
	transactions: TransactionWithDisplay[];
	pagination: {
		currentPage: number;
		itemsPerPage: number;
		totalItems: number;
	};
	sort: {
		column: SortableColumn;
		direction: SortDirection;
	};
	filters: {
		search: string;
		categoryId: string | null;
		accountId: string | null;
		dateRange: {
			start: string | null;
			end: string | null;
		};
	};
	selectedId: string | null;
	expandedId: string | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: TransactionStoreState = {
	transactions: [],
	pagination: {
		currentPage: 1,
		itemsPerPage: 50,
		totalItems: 0
	},
	sort: {
		column: 'date',
		direction: 'desc'
	},
	filters: {
		search: '',
		categoryId: null,
		accountId: null,
		dateRange: {
			start: null,
			end: null
		}
	},
	selectedId: null,
	expandedId: null,
	isLoading: false,
	error: null
};

function createTransactionStore() {
	const { subscribe, set, update } = writable<TransactionStoreState>(initialState);

	return {
		subscribe,

		setTransactions: (transactions: TransactionWithDisplay[], totalCount: number) => {
			update(state => ({
				...state,
				transactions,
				pagination: {
					...state.pagination,
					totalItems: totalCount
				},
				error: null
			}));
		},

		setPage: (page: number) => {
			update(state => ({
				...state,
				pagination: {
					...state.pagination,
					currentPage: page
				}
			}));
		},

		setSort: (column: SortableColumn, direction: SortDirection) => {
			update(state => ({
				...state,
				sort: { column, direction },
				pagination: {
					...state.pagination,
					currentPage: 1
				}
			}));
		},

		toggleSort: (column: SortableColumn) => {
			update(state => {
				const newDirection =
					state.sort.column === column && state.sort.direction === 'asc'
						? 'desc'
						: 'asc';
				return {
					...state,
					sort: { column, direction: newDirection },
					pagination: {
						...state.pagination,
						currentPage: 1
					}
				};
			});
		},

		setFilters: (filters: Partial<TransactionStoreState['filters']>) => {
			update(state => ({
				...state,
				filters: {
					...state.filters,
					...filters
				},
				pagination: {
					...state.pagination,
					currentPage: 1
				}
			}));
		},

		selectTransaction: (id: string | null) => {
			update(state => ({
				...state,
				selectedId: state.selectedId === id ? null : id
			}));
		},

		toggleExpanded: (id: string) => {
			update(state => ({
				...state,
				expandedId: state.expandedId === id ? null : id
			}));
		},

		setLoading: (isLoading: boolean) => {
			update(state => ({
				...state,
				isLoading
			}));
		},

		setError: (error: string | null) => {
			update(state => ({
				...state,
				error,
				isLoading: false
			}));
		},

		reset: () => {
			set(initialState);
		}
	};
}

export const transactionStore = createTransactionStore();

export const totalPages = derived(
	transactionStore,
	$store => Math.max(1, Math.ceil($store.pagination.totalItems / $store.pagination.itemsPerPage))
);
