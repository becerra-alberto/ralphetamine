import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LiabilitiesSection from '../../../components/net-worth/LiabilitiesSection.svelte';
import type { AccountWithBalance } from '../../../api/netWorth';

const mockAccounts: AccountWithBalance[] = [
	{
		id: 'acc-credit1',
		name: 'Visa Card',
		type: 'credit',
		institution: 'Visa',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: -75000
	},
	{
		id: 'acc-credit2',
		name: 'Mastercard',
		type: 'credit',
		institution: 'MC',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: -25000
	},
	{
		id: 'acc-checking',
		name: 'Main Checking',
		type: 'checking',
		institution: 'ING',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		balanceCents: 350000
	}
];

describe('LiabilitiesSection', () => {
	it('should render "Liabilities" section title', () => {
		render(LiabilitiesSection, {
			props: { accounts: mockAccounts, totalLiabilitiesCents: 100000 }
		});

		const title = screen.getByTestId('liabilities-section-title');
		expect(title.textContent).toBe('Liabilities');
	});

	it('should render Credit Cards category for credit accounts', () => {
		render(LiabilitiesSection, {
			props: { accounts: mockAccounts, totalLiabilitiesCents: 100000 }
		});

		const categories = screen.getByTestId('liabilities-section-categories');
		expect(categories).toBeTruthy();

		// Should have 1 category: Credit Cards
		expect(screen.getByTestId('liabilities-section-category-0')).toBeTruthy();
	});

	it('should group credit accounts into Credit Cards category', () => {
		render(LiabilitiesSection, {
			props: { accounts: mockAccounts, totalLiabilitiesCents: 100000 }
		});

		const label = screen.getByTestId('liabilities-section-category-0-label');
		expect(label.textContent).toBe('Credit Cards');
	});

	it('should not show Loans or Mortgages when no such accounts exist', () => {
		render(LiabilitiesSection, {
			props: { accounts: mockAccounts, totalLiabilitiesCents: 100000 }
		});

		// Only 1 category should exist
		expect(screen.queryByTestId('liabilities-section-category-1')).toBeNull();
	});

	it('should not include asset accounts in liabilities', () => {
		render(LiabilitiesSection, {
			props: { accounts: mockAccounts, totalLiabilitiesCents: 100000 }
		});

		// Checking account should not appear
		const categories = screen.getByTestId('liabilities-section-categories');
		expect(categories.textContent).not.toContain('Main Checking');
	});

	it('should show debt-free message when no liabilities', () => {
		const assetOnly: AccountWithBalance[] = [
			{
				id: 'acc-checking',
				name: 'Checking',
				type: 'checking',
				institution: 'Bank',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				balanceCents: 100000
			}
		];

		render(LiabilitiesSection, {
			props: { accounts: assetOnly, totalLiabilitiesCents: 0 }
		});

		const empty = screen.getByTestId('liabilities-section-empty');
		expect(empty.textContent).toContain('No liabilities');
		expect(empty.textContent).toContain('debt-free');
	});

	it('should show debt-free message with empty accounts', () => {
		render(LiabilitiesSection, {
			props: { accounts: [], totalLiabilitiesCents: 0 }
		});

		expect(screen.getByTestId('liabilities-section-empty')).toBeTruthy();
	});

	it('should accept custom testId', () => {
		render(LiabilitiesSection, {
			props: { accounts: mockAccounts, totalLiabilitiesCents: 100000, testId: 'custom-liab' }
		});

		expect(screen.getByTestId('custom-liab')).toBeTruthy();
		expect(screen.getByTestId('custom-liab-title')).toBeTruthy();
	});
});
