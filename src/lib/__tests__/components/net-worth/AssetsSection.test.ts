import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AssetsSection from '../../../components/net-worth/AssetsSection.svelte';
import type { AccountWithBalance } from '../../../api/netWorth';

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
	}
];

describe('AssetsSection', () => {
	it('should render "Assets" section title', () => {
		render(AssetsSection, {
			props: { accounts: mockAccounts, totalAssetsCents: 700000 }
		});

		const title = screen.getByTestId('assets-section-title');
		expect(title.textContent).toBe('Assets');
	});

	it('should render categories for Cash & Bank and Investments', () => {
		render(AssetsSection, {
			props: { accounts: mockAccounts, totalAssetsCents: 700000 }
		});

		const categories = screen.getByTestId('assets-section-categories');
		expect(categories).toBeTruthy();

		// Should have 2 categories: Cash & Bank, Investments
		expect(screen.getByTestId('assets-section-category-0')).toBeTruthy();
		expect(screen.getByTestId('assets-section-category-1')).toBeTruthy();
	});

	it('should group checking and savings into Cash & Bank', () => {
		render(AssetsSection, {
			props: { accounts: mockAccounts, totalAssetsCents: 700000 }
		});

		// First category should be Cash & Bank
		const label = screen.getByTestId('assets-section-category-0-label');
		expect(label.textContent).toBe('Cash & Bank Accounts');
	});

	it('should group investment into Investments', () => {
		render(AssetsSection, {
			props: { accounts: mockAccounts, totalAssetsCents: 700000 }
		});

		// Second category should be Investments
		const label = screen.getByTestId('assets-section-category-1-label');
		expect(label.textContent).toBe('Investments');
	});

	it('should not render Retirement category when no retirement accounts', () => {
		render(AssetsSection, {
			props: { accounts: mockAccounts, totalAssetsCents: 700000 }
		});

		// Should only have 2 categories, not 3
		expect(screen.queryByTestId('assets-section-category-2')).toBeNull();
	});

	it('should show empty state when no asset accounts', () => {
		render(AssetsSection, {
			props: { accounts: [], totalAssetsCents: 0 }
		});

		expect(screen.getByTestId('assets-section-empty')).toBeTruthy();
		expect(screen.getByTestId('assets-section-empty').textContent).toContain('No asset accounts');
	});

	it('should hide credit accounts (liabilities) from assets section', () => {
		const withCredit: AccountWithBalance[] = [
			...mockAccounts,
			{
				id: 'acc-credit',
				name: 'Credit Card',
				type: 'credit',
				institution: 'Visa',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				balanceCents: -75000,
				lastBalanceUpdate: null
			}
		];

		render(AssetsSection, {
			props: { accounts: withCredit, totalAssetsCents: 700000 }
		});

		// Credit accounts should not appear in any asset category
		const categories = screen.getByTestId('assets-section-categories');
		expect(categories.textContent).not.toContain('Credit Card');
	});

	it('should accept custom testId', () => {
		render(AssetsSection, {
			props: { accounts: mockAccounts, totalAssetsCents: 700000, testId: 'custom-assets' }
		});

		expect(screen.getByTestId('custom-assets')).toBeTruthy();
		expect(screen.getByTestId('custom-assets-title')).toBeTruthy();
	});
});
