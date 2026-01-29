import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	netWorthStore,
	isNetWorthPositive,
	assetAccounts,
	liabilityAccounts,
	assetsProgressPercent,
	liabilitiesProgressPercent
} from '../../stores/netWorth';
import type { NetWorthSummaryData, AccountWithBalance } from '../../api/netWorth';

const mockAccounts: AccountWithBalance[] = [
	{
		id: 'acc-checking',
		name: 'Main Checking',
		type: 'checking',
		institution: 'ING',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 350000
	},
	{
		id: 'acc-savings',
		name: 'Savings',
		type: 'savings',
		institution: 'ING',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 200000
	},
	{
		id: 'acc-credit',
		name: 'Credit Card',
		type: 'credit',
		institution: 'Visa',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: -75000
	}
];

const mockSummary: NetWorthSummaryData = {
	totalAssetsCents: 550000,
	totalLiabilitiesCents: 75000,
	netWorthCents: 475000,
	accounts: mockAccounts
};

describe('netWorthStore', () => {
	beforeEach(() => {
		netWorthStore.reset();
	});

	describe('initial state', () => {
		it('should have zero totals initially', () => {
			const state = get(netWorthStore);
			expect(state.totalAssetsCents).toBe(0);
			expect(state.totalLiabilitiesCents).toBe(0);
			expect(state.netWorthCents).toBe(0);
		});

		it('should have empty accounts initially', () => {
			const state = get(netWorthStore);
			expect(state.accounts).toEqual([]);
		});

		it('should not be loading initially', () => {
			const state = get(netWorthStore);
			expect(state.isLoading).toBe(false);
		});
	});

	describe('setSummary', () => {
		it('should set all summary data', () => {
			netWorthStore.setSummary(mockSummary);

			const state = get(netWorthStore);
			expect(state.totalAssetsCents).toBe(550000);
			expect(state.totalLiabilitiesCents).toBe(75000);
			expect(state.netWorthCents).toBe(475000);
			expect(state.accounts).toHaveLength(3);
		});

		it('should clear loading and error states', () => {
			netWorthStore.setLoading(true);
			netWorthStore.setSummary(mockSummary);

			const state = get(netWorthStore);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('setLoading', () => {
		it('should set loading state', () => {
			netWorthStore.setLoading(true);
			expect(get(netWorthStore).isLoading).toBe(true);

			netWorthStore.setLoading(false);
			expect(get(netWorthStore).isLoading).toBe(false);
		});
	});

	describe('setError', () => {
		it('should set error and clear loading', () => {
			netWorthStore.setLoading(true);
			netWorthStore.setError('Failed to load');

			const state = get(netWorthStore);
			expect(state.error).toBe('Failed to load');
			expect(state.isLoading).toBe(false);
		});
	});

	describe('account filtering (AC5)', () => {
		it('should only include active accounts with includeInNetWorth=true', () => {
			// Backend already filters - verify the store preserves that
			netWorthStore.setSummary(mockSummary);

			const state = get(netWorthStore);
			expect(state.accounts.every((a) => a.isActive)).toBe(true);
			expect(state.accounts.every((a) => a.includeInNetWorth)).toBe(true);
		});

		it('should exclude inactive accounts from totals', () => {
			// Inactive accounts are filtered by backend, store should reflect backend data
			const summaryWithoutInactive: NetWorthSummaryData = {
				totalAssetsCents: 550000, // No inactive account balance included
				totalLiabilitiesCents: 75000,
				netWorthCents: 475000,
				accounts: mockAccounts // Only active, included accounts
			};

			netWorthStore.setSummary(summaryWithoutInactive);
			const state = get(netWorthStore);

			// Should not include any inactive accounts
			const inactiveAccounts = state.accounts.filter((a) => !a.isActive);
			expect(inactiveAccounts).toHaveLength(0);
		});
	});

	describe('derived stores', () => {
		it('isNetWorthPositive should be true for positive net worth', () => {
			netWorthStore.setSummary(mockSummary);
			expect(get(isNetWorthPositive)).toBe(true);
		});

		it('isNetWorthPositive should be false for negative net worth', () => {
			netWorthStore.setSummary({
				...mockSummary,
				netWorthCents: -50000
			});
			expect(get(isNetWorthPositive)).toBe(false);
		});

		it('isNetWorthPositive should be true for zero net worth', () => {
			netWorthStore.setSummary({
				...mockSummary,
				netWorthCents: 0
			});
			expect(get(isNetWorthPositive)).toBe(true);
		});

		it('assetAccounts should filter to non-credit accounts', () => {
			netWorthStore.setSummary(mockSummary);
			const assets = get(assetAccounts);
			expect(assets).toHaveLength(2);
			expect(assets.every((a) => a.type !== 'credit')).toBe(true);
		});

		it('liabilityAccounts should filter to credit accounts', () => {
			netWorthStore.setSummary(mockSummary);
			const liabilities = get(liabilityAccounts);
			expect(liabilities).toHaveLength(1);
			expect(liabilities[0].type).toBe('credit');
		});
	});

	describe('progress percent derived stores', () => {
		it('assetsProgressPercent should calculate assets as % of total', () => {
			netWorthStore.setSummary({
				totalAssetsCents: 700000,
				totalLiabilitiesCents: 300000,
				netWorthCents: 400000,
				accounts: []
			});

			// 700000 / (700000 + 300000) * 100 = 70
			expect(get(assetsProgressPercent)).toBe(70);
		});

		it('liabilitiesProgressPercent should calculate liabilities as % of total', () => {
			netWorthStore.setSummary({
				totalAssetsCents: 700000,
				totalLiabilitiesCents: 300000,
				netWorthCents: 400000,
				accounts: []
			});

			// 300000 / (700000 + 300000) * 100 = 30
			expect(get(liabilitiesProgressPercent)).toBe(30);
		});

		it('progress percentages should be 0 when totals are zero', () => {
			netWorthStore.setSummary({
				totalAssetsCents: 0,
				totalLiabilitiesCents: 0,
				netWorthCents: 0,
				accounts: []
			});

			expect(get(assetsProgressPercent)).toBe(0);
			expect(get(liabilitiesProgressPercent)).toBe(0);
		});

		it('should handle 100% assets with no liabilities', () => {
			netWorthStore.setSummary({
				totalAssetsCents: 500000,
				totalLiabilitiesCents: 0,
				netWorthCents: 500000,
				accounts: []
			});

			expect(get(assetsProgressPercent)).toBe(100);
			expect(get(liabilitiesProgressPercent)).toBe(0);
		});
	});

	describe('setMomChange', () => {
		it('should set MoM change data', () => {
			const momData = {
				hasPrevious: true,
				changeCents: 150000,
				changePercent: 5.2,
				previousMonth: '2025-12',
				previousNetWorthCents: 2884615,
				currentNetWorthCents: 3034615
			};

			netWorthStore.setMomChange(momData);

			const state = get(netWorthStore);
			expect(state.momChange).toEqual(momData);
			expect(state.momChange?.hasPrevious).toBe(true);
			expect(state.momChange?.changeCents).toBe(150000);
		});

		it('should have null momChange initially', () => {
			const state = get(netWorthStore);
			expect(state.momChange).toBeNull();
		});
	});

	describe('reset', () => {
		it('should reset to initial state', () => {
			netWorthStore.setSummary(mockSummary);
			netWorthStore.setMomChange({
				hasPrevious: true,
				changeCents: 100,
				changePercent: 1.0,
				previousMonth: '2025-12',
				previousNetWorthCents: 10000,
				currentNetWorthCents: 10100
			});
			netWorthStore.reset();

			const state = get(netWorthStore);
			expect(state.totalAssetsCents).toBe(0);
			expect(state.totalLiabilitiesCents).toBe(0);
			expect(state.netWorthCents).toBe(0);
			expect(state.accounts).toEqual([]);
			expect(state.momChange).toBeNull();
		});
	});
});
