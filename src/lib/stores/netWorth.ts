/**
 * Net Worth store for managing net worth summary state
 */

import { writable, derived } from 'svelte/store';
import type { NetWorthSummaryData, AccountWithBalance, MomChangeData } from '../api/netWorth';

export interface NetWorthStoreState {
	totalAssetsCents: number;
	totalLiabilitiesCents: number;
	netWorthCents: number;
	accounts: AccountWithBalance[];
	momChange: MomChangeData | null;
	isLoading: boolean;
	error: string | null;
}

const initialState: NetWorthStoreState = {
	totalAssetsCents: 0,
	totalLiabilitiesCents: 0,
	netWorthCents: 0,
	accounts: [],
	momChange: null,
	isLoading: false,
	error: null
};

function createNetWorthStore() {
	const { subscribe, set, update } = writable<NetWorthStoreState>(initialState);

	return {
		subscribe,

		setSummary(data: NetWorthSummaryData) {
			update((state) => ({
				...state,
				totalAssetsCents: data.totalAssetsCents,
				totalLiabilitiesCents: data.totalLiabilitiesCents,
				netWorthCents: data.netWorthCents,
				accounts: data.accounts,
				isLoading: false,
				error: null
			}));
		},

		setLoading(loading: boolean) {
			update((state) => ({ ...state, isLoading: loading }));
		},

		setMomChange(data: MomChangeData) {
			update((state) => ({ ...state, momChange: data }));
		},

		setError(error: string) {
			update((state) => ({ ...state, isLoading: false, error }));
		},

		reset() {
			set(initialState);
		}
	};
}

export const netWorthStore = createNetWorthStore();

export const isNetWorthPositive = derived(netWorthStore, ($store) => $store.netWorthCents >= 0);

export const assetAccounts = derived(netWorthStore, ($store) =>
	$store.accounts.filter((a) => a.type !== 'credit' && a.balanceCents > 0)
);

export const liabilityAccounts = derived(netWorthStore, ($store) =>
	$store.accounts.filter((a) => a.type === 'credit' && a.balanceCents < 0)
);

export const assetsProgressPercent = derived(netWorthStore, ($store) => {
	const total = $store.totalAssetsCents + $store.totalLiabilitiesCents;
	if (total === 0) return 0;
	return Math.round(($store.totalAssetsCents / total) * 100);
});

export const liabilitiesProgressPercent = derived(netWorthStore, ($store) => {
	const total = $store.totalAssetsCents + $store.totalLiabilitiesCents;
	if (total === 0) return 0;
	return Math.round(($store.totalLiabilitiesCents / total) * 100);
});
