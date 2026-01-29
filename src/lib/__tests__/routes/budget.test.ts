import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import BudgetPage from '../../../routes/budget/+page.svelte';

describe('Budget Page', () => {
	it('renders "Budget" heading', () => {
		const { getByRole } = render(BudgetPage);

		expect(getByRole('heading', { name: 'Budget' })).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(BudgetPage);

		expect(getByTestId('budget-page')).toBeTruthy();
	});

	it('renders budget grid component', () => {
		const { getByRole } = render(BudgetPage);

		expect(getByRole('region', { name: 'Budget Grid' })).toBeTruthy();
	});
});
