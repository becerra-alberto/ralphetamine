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
			balanceCents: 350000
		},
		{
			id: 'acc-2',
			name: 'Savings',
			type: 'savings',
			institution: 'ING',
			currency: 'EUR',
			isActive: true,
			includeInNetWorth: true,
			balanceCents: 200000
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
			balanceCents: 150000
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
});
