import { describe, it, expect } from 'vitest';
import {
	groupAccountsByCategory,
	getAccountCategoryKey,
	getCategoryLabel,
	groupLiabilitiesByCategory,
	getLiabilityCategoryKey,
	getLiabilityCategoryLabel
} from '../../utils/accountGroups';
import type { AccountWithBalance } from '../../api/netWorth';

const mockAccounts: AccountWithBalance[] = [
	{
		id: 'acc-checking',
		name: 'Main Checking',
		type: 'checking',
		institution: 'ING',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 350000,
		lastBalanceUpdate: null
	},
	{
		id: 'acc-savings',
		name: 'Savings',
		type: 'savings',
		institution: 'ING',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 200000,
		lastBalanceUpdate: null
	},
	{
		id: 'acc-investment',
		name: 'ETF Portfolio',
		type: 'investment',
		institution: 'DEGIRO',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 150000,
		lastBalanceUpdate: null
	},
	{
		id: 'acc-cash',
		name: 'Cash',
		type: 'cash',
		institution: 'Cash',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 5000,
		lastBalanceUpdate: null
	}
];

describe('accountGroups', () => {
	describe('groupAccountsByCategory', () => {
		it('should group checking/savings/cash into Cash & Bank category', () => {
			const categories = groupAccountsByCategory(mockAccounts, 705000);
			const cashBank = categories.find((c) => c.key === 'cash_bank');

			expect(cashBank).toBeDefined();
			expect(cashBank!.label).toBe('Cash & Bank Accounts');
			expect(cashBank!.accounts).toHaveLength(3);
			expect(cashBank!.accounts.map((a) => a.type)).toEqual(
				expect.arrayContaining(['checking', 'savings', 'cash'])
			);
		});

		it('should group investment into Investments category', () => {
			const categories = groupAccountsByCategory(mockAccounts, 705000);
			const investments = categories.find((c) => c.key === 'investments');

			expect(investments).toBeDefined();
			expect(investments!.label).toBe('Investments');
			expect(investments!.accounts).toHaveLength(1);
			expect(investments!.accounts[0].type).toBe('investment');
		});

		it('should calculate correct category totals in cents', () => {
			const categories = groupAccountsByCategory(mockAccounts, 705000);
			const cashBank = categories.find((c) => c.key === 'cash_bank');
			const investments = categories.find((c) => c.key === 'investments');

			// Cash & Bank: 350000 + 200000 + 5000 = 555000
			expect(cashBank!.totalCents).toBe(555000);

			// Investments: 150000
			expect(investments!.totalCents).toBe(150000);
		});

		it('should calculate percentage of total assets', () => {
			const totalAssets = 705000;
			const categories = groupAccountsByCategory(mockAccounts, totalAssets);
			const cashBank = categories.find((c) => c.key === 'cash_bank');

			// 555000 / 705000 * 100 ≈ 78.7%
			expect(cashBank!.percentOfTotal).toBeCloseTo(78.7, 0);
		});

		it('should handle totalAssets=0 with 0% not NaN', () => {
			const categories = groupAccountsByCategory([], 0);
			// No categories returned for empty accounts
			expect(categories).toHaveLength(0);
		});

		it('should handle percentage with totalAssets=0 gracefully', () => {
			// accounts with balances but totalAssets passed as 0
			const categories = groupAccountsByCategory(mockAccounts, 0);
			for (const cat of categories) {
				expect(cat.percentOfTotal).toBe(0);
				expect(Number.isNaN(cat.percentOfTotal)).toBe(false);
			}
		});

		it('should hide empty categories (no accounts of that type)', () => {
			// Only checking accounts
			const onlyChecking: AccountWithBalance[] = [
				{
					id: 'acc-1',
					name: 'Checking',
					type: 'checking',
					institution: 'Bank',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: 100000,
					lastBalanceUpdate: null
				}
			];

			const categories = groupAccountsByCategory(onlyChecking, 100000);

			// Should only have Cash & Bank, not Investments or Retirement
			expect(categories).toHaveLength(1);
			expect(categories[0].key).toBe('cash_bank');
		});

		it('should exclude accounts with zero or negative balance', () => {
			const mixedAccounts: AccountWithBalance[] = [
				{
					id: 'acc-1',
					name: 'Positive',
					type: 'checking',
					institution: 'Bank',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: 100000,
					lastBalanceUpdate: null
				},
				{
					id: 'acc-2',
					name: 'Zero',
					type: 'savings',
					institution: 'Bank',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: 0,
					lastBalanceUpdate: null
				},
				{
					id: 'acc-3',
					name: 'Negative',
					type: 'cash',
					institution: 'Cash',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: -5000,
					lastBalanceUpdate: null
				}
			];

			const categories = groupAccountsByCategory(mixedAccounts, 100000);
			const cashBank = categories.find((c) => c.key === 'cash_bank');

			expect(cashBank!.accounts).toHaveLength(1);
			expect(cashBank!.accounts[0].name).toBe('Positive');
		});
	});

	describe('getAccountCategoryKey', () => {
		it('should map checking to cash_bank', () => {
			expect(getAccountCategoryKey('checking')).toBe('cash_bank');
		});

		it('should map savings to cash_bank', () => {
			expect(getAccountCategoryKey('savings')).toBe('cash_bank');
		});

		it('should map cash to cash_bank', () => {
			expect(getAccountCategoryKey('cash')).toBe('cash_bank');
		});

		it('should map investment to investments', () => {
			expect(getAccountCategoryKey('investment')).toBe('investments');
		});

		it('should map retirement to retirement', () => {
			expect(getAccountCategoryKey('retirement')).toBe('retirement');
		});

		it('should return null for unknown type', () => {
			expect(getAccountCategoryKey('credit')).toBeNull();
			expect(getAccountCategoryKey('unknown')).toBeNull();
		});
	});

	describe('getCategoryLabel', () => {
		it('should return correct label for cash_bank', () => {
			expect(getCategoryLabel('cash_bank')).toBe('Cash & Bank Accounts');
		});

		it('should return correct label for investments', () => {
			expect(getCategoryLabel('investments')).toBe('Investments');
		});

		it('should return correct label for retirement', () => {
			expect(getCategoryLabel('retirement')).toBe('Retirement');
		});
	});

	// --- Liability grouping tests ---

	describe('groupLiabilitiesByCategory', () => {
		const liabilityAccounts: AccountWithBalance[] = [
			{
				id: 'acc-credit-1',
				name: 'Visa Card',
				type: 'credit',
				institution: 'Visa',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				balanceCents: -75000,
				lastBalanceUpdate: null
			},
			{
				id: 'acc-credit-2',
				name: 'Mastercard',
				type: 'credit',
				institution: 'MC',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				balanceCents: -25000,
				lastBalanceUpdate: null
			}
		];

		it('should group credit accounts into Credit Cards category', () => {
			const categories = groupLiabilitiesByCategory(liabilityAccounts, 100000);
			const creditCards = categories.find((c) => c.key === 'credit_cards');

			expect(creditCards).toBeDefined();
			expect(creditCards!.label).toBe('Credit Cards');
			expect(creditCards!.accounts).toHaveLength(2);
		});

		it('should calculate category total as absolute sum', () => {
			const categories = groupLiabilitiesByCategory(liabilityAccounts, 100000);
			const creditCards = categories.find((c) => c.key === 'credit_cards');

			// |−75000| + |−25000| = 100000
			expect(creditCards!.totalCents).toBe(100000);
		});

		it('should calculate percentage of total liabilities', () => {
			const categories = groupLiabilitiesByCategory(liabilityAccounts, 100000);
			const creditCards = categories.find((c) => c.key === 'credit_cards');

			expect(creditCards!.percentOfTotal).toBe(100.0);
		});

		it('should handle totalLiabilities=0 with 0% not NaN', () => {
			const categories = groupLiabilitiesByCategory(liabilityAccounts, 0);
			for (const cat of categories) {
				expect(cat.percentOfTotal).toBe(0);
				expect(Number.isNaN(cat.percentOfTotal)).toBe(false);
			}
		});

		it('should exclude positive balance accounts', () => {
			const mixed: AccountWithBalance[] = [
				...liabilityAccounts,
				{
					id: 'acc-checking',
					name: 'Checking',
					type: 'checking',
					institution: 'Bank',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: 350000,
					lastBalanceUpdate: null
				}
			];

			const categories = groupLiabilitiesByCategory(mixed, 100000);
			expect(categories).toHaveLength(1);
			expect(categories[0].key).toBe('credit_cards');
		});

		it('should hide empty liability categories', () => {
			// Only credit accounts, no loans or mortgages
			const categories = groupLiabilitiesByCategory(liabilityAccounts, 100000);
			expect(categories).toHaveLength(1);
			expect(categories[0].key).toBe('credit_cards');
		});

		it('should return empty array when no liabilities', () => {
			const noLiabilities: AccountWithBalance[] = [
				{
					id: 'acc-1',
					name: 'Checking',
					type: 'checking',
					institution: 'Bank',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: 100000,
					lastBalanceUpdate: null
				}
			];
			const categories = groupLiabilitiesByCategory(noLiabilities, 0);
			expect(categories).toHaveLength(0);
		});
	});

	describe('getLiabilityCategoryKey', () => {
		it('should map credit to credit_cards', () => {
			expect(getLiabilityCategoryKey('credit')).toBe('credit_cards');
		});

		it('should map loan to loans', () => {
			expect(getLiabilityCategoryKey('loan')).toBe('loans');
		});

		it('should map mortgage to mortgages', () => {
			expect(getLiabilityCategoryKey('mortgage')).toBe('mortgages');
		});

		it('should return null for asset types', () => {
			expect(getLiabilityCategoryKey('checking')).toBeNull();
			expect(getLiabilityCategoryKey('savings')).toBeNull();
			expect(getLiabilityCategoryKey('investment')).toBeNull();
		});
	});

	describe('getLiabilityCategoryLabel', () => {
		it('should return "Credit Cards" for credit_cards', () => {
			expect(getLiabilityCategoryLabel('credit_cards')).toBe('Credit Cards');
		});

		it('should return "Loans" for loans', () => {
			expect(getLiabilityCategoryLabel('loans')).toBe('Loans');
		});

		it('should return "Mortgages" for mortgages', () => {
			expect(getLiabilityCategoryLabel('mortgages')).toBe('Mortgages');
		});
	});
});
