import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import HomePage from '../../../routes/+page.svelte';

describe('Home Page', () => {
	it('renders "Home Dashboard" text', () => {
		const { getByText } = render(HomePage);

		expect(getByText('Home Dashboard')).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(HomePage);

		expect(getByTestId('home-page')).toBeTruthy();
	});

	it('contains navigation links to other views', () => {
		const { container } = render(HomePage);

		const budgetLink = container.querySelector('a[href="/budget"]');
		const transactionsLink = container.querySelector('a[href="/transactions"]');
		const netWorthLink = container.querySelector('a[href="/net-worth"]');

		expect(budgetLink).toBeTruthy();
		expect(transactionsLink).toBeTruthy();
		expect(netWorthLink).toBeTruthy();
	});
});
