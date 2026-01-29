/**
 * Account grouping utilities for the net worth view.
 * Groups accounts by category (Cash & Bank, Investments, Retirement).
 */

import type { AccountWithBalance } from '../api/netWorth';

export interface AccountCategory {
	key: string;
	label: string;
	accounts: AccountWithBalance[];
	totalCents: number;
	percentOfTotal: number;
}

export type AssetCategoryKey = 'cash_bank' | 'investments' | 'retirement';

const ASSET_CATEGORIES: { key: AssetCategoryKey; label: string; types: string[] }[] = [
	{ key: 'cash_bank', label: 'Cash & Bank Accounts', types: ['checking', 'savings', 'cash'] },
	{ key: 'investments', label: 'Investments', types: ['investment'] },
	{ key: 'retirement', label: 'Retirement', types: ['retirement'] }
];

/**
 * Group accounts by asset category type.
 * Returns only categories that have at least one account (non-empty).
 */
export function groupAccountsByCategory(
	accounts: AccountWithBalance[],
	totalAssetsCents: number
): AccountCategory[] {
	return ASSET_CATEGORIES.map((cat) => {
		const catAccounts = accounts.filter(
			(a) => cat.types.includes(a.type) && a.balanceCents > 0
		);
		const totalCents = catAccounts.reduce((sum, a) => sum + a.balanceCents, 0);
		const percentOfTotal = totalAssetsCents > 0
			? Math.round((totalCents / totalAssetsCents) * 1000) / 10
			: 0;

		return {
			key: cat.key,
			label: cat.label,
			accounts: catAccounts,
			totalCents,
			percentOfTotal
		};
	}).filter((cat) => cat.accounts.length > 0);
}

/**
 * Get the category key for an account type.
 */
export function getAccountCategoryKey(accountType: string): AssetCategoryKey | null {
	for (const cat of ASSET_CATEGORIES) {
		if (cat.types.includes(accountType)) {
			return cat.key;
		}
	}
	return null;
}

/**
 * Get the display label for a category key.
 */
export function getCategoryLabel(key: AssetCategoryKey): string {
	const cat = ASSET_CATEGORIES.find((c) => c.key === key);
	return cat?.label ?? key;
}
