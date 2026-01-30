import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AssetCategory from '../../../components/net-worth/AssetCategory.svelte';
import type { AccountCategory } from '../../../utils/accountGroups';

const cashBankCategory: AccountCategory = {
	key: 'cash_bank',
	label: 'Cash & Bank Accounts',
	accounts: [
		{
			id: 'acc-1',
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
			id: 'acc-2',
			name: 'Savings',
			type: 'savings',
			institution: 'ING',
			currency: 'EUR',
			isActive: true,
			includeInNetWorth: true,
			balanceCents: 200000,
			lastBalanceUpdate: null
		}
	],
	totalCents: 550000,
	percentOfTotal: 78.7
};

const singleAccountCategory: AccountCategory = {
	key: 'investments',
	label: 'Investments',
	accounts: [
		{
			id: 'acc-3',
			name: 'ETF Portfolio',
			type: 'investment',
			institution: 'DEGIRO',
			currency: 'EUR',
			isActive: true,
			includeInNetWorth: true,
			balanceCents: 150000,
			lastBalanceUpdate: null
		}
	],
	totalCents: 150000,
	percentOfTotal: 21.3
};

describe('AssetCategory', () => {
	it('should display category label', () => {
		render(AssetCategory, { props: { category: cashBankCategory } });

		const label = screen.getByTestId('asset-category-label');
		expect(label.textContent).toBe('Cash & Bank Accounts');
	});

	it('should display category total in cents formatted as currency', () => {
		render(AssetCategory, { props: { category: cashBankCategory } });

		const total = screen.getByTestId('asset-category-total');
		// 550000 cents = €5,500.00
		expect(total.textContent).toContain('5,500.00');
	});

	it('should display percentage of total assets', () => {
		render(AssetCategory, { props: { category: cashBankCategory } });

		const percent = screen.getByTestId('asset-category-percent');
		expect(percent.textContent).toContain('78.7%');
	});

	it('should display 0% percentage edge case', () => {
		const zeroCat: AccountCategory = {
			...cashBankCategory,
			percentOfTotal: 0
		};
		render(AssetCategory, { props: { category: zeroCat } });

		const percent = screen.getByTestId('asset-category-percent');
		expect(percent.textContent).toContain('0.0%');
	});

	it('should render all accounts in the category', () => {
		render(AssetCategory, { props: { category: cashBankCategory } });

		const accountList = screen.getByTestId('asset-category-accounts');
		expect(accountList).toBeTruthy();

		// Two account rows
		expect(screen.getByTestId('asset-category-account-0')).toBeTruthy();
		expect(screen.getByTestId('asset-category-account-1')).toBeTruthy();
	});

	it('should render single account category correctly', () => {
		render(AssetCategory, { props: { category: singleAccountCategory } });

		expect(screen.getByTestId('asset-category-label').textContent).toBe('Investments');
		expect(screen.getByTestId('asset-category-account-0')).toBeTruthy();
	});

	it('should display account names within category', () => {
		render(AssetCategory, { props: { category: cashBankCategory } });

		expect(screen.getByTestId('asset-category-account-0-name').textContent).toBe(
			'Main Checking'
		);
		expect(screen.getByTestId('asset-category-account-1-name').textContent).toBe('Savings');
	});

	it('should accept custom testId', () => {
		render(AssetCategory, { props: { category: cashBankCategory, testId: 'custom-cat' } });

		expect(screen.getByTestId('custom-cat')).toBeTruthy();
		expect(screen.getByTestId('custom-cat-label')).toBeTruthy();
	});

	it('should display account rows within category in column alignment', () => {
		render(AssetCategory, { props: { category: cashBankCategory, editable: true } });

		// Verify each account row has the three-column structure
		const row0 = screen.getByTestId('asset-category-account-0');
		const row1 = screen.getByTestId('asset-category-account-1');

		// Both rows should have info and balance columns
		const info0 = screen.getByTestId('asset-category-account-0-info');
		const info1 = screen.getByTestId('asset-category-account-1-info');
		const balance0 = screen.getByTestId('asset-category-account-0-balance-col');
		const balance1 = screen.getByTestId('asset-category-account-1-balance-col');
		const menu0 = screen.getByTestId('asset-category-account-0-menu-col');
		const menu1 = screen.getByTestId('asset-category-account-1-menu-col');

		// All rows have the same column structure
		expect(row0.contains(info0)).toBe(true);
		expect(row0.contains(balance0)).toBe(true);
		expect(row0.contains(menu0)).toBe(true);
		expect(row1.contains(info1)).toBe(true);
		expect(row1.contains(balance1)).toBe(true);
		expect(row1.contains(menu1)).toBe(true);

		// Both info columns have the account-info class (which applies flex:1)
		expect(info0.classList.toString()).toContain('account-info');
		expect(info1.classList.toString()).toContain('account-info');
	});
});
