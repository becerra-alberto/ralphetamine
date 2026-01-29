/**
 * Dashboard store for current month summary calculations
 */

import { writable, derived } from 'svelte/store';

export interface DashboardState {
	incomeCents: number;
	expensesCents: number;
	isLoading: boolean;
	error: string | null;
}

const initialState: DashboardState = {
	incomeCents: 0,
	expensesCents: 0,
	isLoading: false,
	error: null
};

function createDashboardStore() {
	const { subscribe, set, update } = writable<DashboardState>(initialState);

	return {
		subscribe,

		setSummary(incomeCents: number, expensesCents: number) {
			update((state) => ({
				...state,
				incomeCents,
				expensesCents,
				error: null
			}));
		},

		setLoading(isLoading: boolean) {
			update((state) => ({ ...state, isLoading }));
		},

		setError(error: string | null) {
			update((state) => ({ ...state, error, isLoading: false }));
		},

		reset() {
			set(initialState);
		}
	};
}

export const dashboardStore = createDashboardStore();

export const balanceCents = derived(
	dashboardStore,
	($store) => $store.incomeCents - $store.expensesCents
);

/**
 * Get current month as YYYY-MM string
 */
export function getCurrentMonth(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}

/**
 * Calculate income and expenses from a list of transactions.
 * Income = sum of positive amountCents
 * Expenses = sum of negative amountCents (returned as positive absolute value)
 */
export function calculateMonthSummary(transactions: { amountCents: number }[]): {
	incomeCents: number;
	expensesCents: number;
} {
	let incomeCents = 0;
	let expensesCents = 0;

	for (const t of transactions) {
		if (t.amountCents > 0) {
			incomeCents += t.amountCents;
		} else if (t.amountCents < 0) {
			expensesCents += Math.abs(t.amountCents);
		}
	}

	return { incomeCents, expensesCents };
}
