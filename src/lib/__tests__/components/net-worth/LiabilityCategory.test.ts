import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LiabilityCategory from '../../../components/net-worth/LiabilityCategory.svelte';
import type { AccountCategory } from '../../../utils/accountGroups';

const creditCardsCategory: AccountCategory = {
	key: 'credit_cards',
	label: 'Credit Cards',
	accounts: [
		{
			id: 'acc-credit-1',
			name: 'Visa Platinum',
			type: 'credit',
			institution: 'Visa',
			currency: 'EUR',
			isActive: true,
			includeInNetWorth: true,
			balanceCents: -75000
		},
		{
			id: 'acc-credit-2',
			name: 'Mastercard',
			type: 'credit',
			institution: 'MC Bank',
			currency: 'EUR',
			isActive: true,
			includeInNetWorth: true,
			balanceCents: -25000
		}
	],
	totalCents: 100000, // absolute value: 75000 + 25000
	percentOfTotal: 100.0
};

describe('LiabilityCategory', () => {
	it('should display category label', () => {
		render(LiabilityCategory, { props: { category: creditCardsCategory } });

		const label = screen.getByTestId('liability-category-label');
		expect(label.textContent).toBe('Credit Cards');
	});

	it('should display category total as positive (amount owed)', () => {
		render(LiabilityCategory, { props: { category: creditCardsCategory } });

		const total = screen.getByTestId('liability-category-total');
		// 100000 cents = €1,000.00
		expect(total.textContent).toContain('1,000.00');
	});

	it('should display percentage of total liabilities', () => {
		render(LiabilityCategory, { props: { category: creditCardsCategory } });

		const percent = screen.getByTestId('liability-category-percent');
		expect(percent.textContent).toContain('100.0%');
	});

	it('should display 0% when percentage is zero', () => {
		const zeroCat: AccountCategory = {
			...creditCardsCategory,
			percentOfTotal: 0
		};
		render(LiabilityCategory, { props: { category: zeroCat } });

		const percent = screen.getByTestId('liability-category-percent');
		expect(percent.textContent).toContain('0.0%');
	});

	it('should render all accounts in the category', () => {
		render(LiabilityCategory, { props: { category: creditCardsCategory } });

		expect(screen.getByTestId('liability-category-account-0')).toBeTruthy();
		expect(screen.getByTestId('liability-category-account-1')).toBeTruthy();
	});

	it('should display account names', () => {
		render(LiabilityCategory, { props: { category: creditCardsCategory } });

		expect(screen.getByTestId('liability-category-account-0-name').textContent).toBe(
			'Visa Platinum'
		);
		expect(screen.getByTestId('liability-category-account-1-name').textContent).toBe(
			'Mastercard'
		);
	});

	it('should display liability balance as positive (amount owed)', () => {
		render(LiabilityCategory, { props: { category: creditCardsCategory } });

		const balance = screen.getByTestId('liability-category-account-0-balance');
		// -75000 cents shown as positive = €750.00
		expect(balance.textContent).toContain('750.00');
		expect(balance.textContent).not.toContain('-');
	});

	it('should accept custom testId', () => {
		render(LiabilityCategory, {
			props: { category: creditCardsCategory, testId: 'custom-liability' }
		});

		expect(screen.getByTestId('custom-liability')).toBeTruthy();
		expect(screen.getByTestId('custom-liability-label')).toBeTruthy();
	});
});
