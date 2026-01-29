import { describe, it, expect } from 'vitest';
import {
	groupAccountsByCategory,
	getAccountCategoryKey,
	getCategoryLabel
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
		id: 'acc-investment',
		name: 'ETF Portfolio',
		type: 'investment',
		institution: 'DEGIRO',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 150000
	},
	{
		id: 'acc-cash',
		name: 'Cash',
		type: 'cash',
		institution: 'Cash',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 5000
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
					balanceCents: 100000
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
					balanceCents: 100000
				},
				{
					id: 'acc-2',
					name: 'Zero',
					type: 'savings',
					institution: 'Bank',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: 0
				},
				{
					id: 'acc-3',
					name: 'Negative',
					type: 'cash',
					institution: 'Cash',
					currency: 'EUR',
					isActive: true,
					includeInNetWorth: true,
					balanceCents: -5000
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
});
