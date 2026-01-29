import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import BudgetPage from '../../../routes/budget/+page.svelte';

describe('Budget Page', () => {
	it('renders "Budget View" text', () => {
		const { getByText } = render(BudgetPage);

		expect(getByText('Budget View')).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(BudgetPage);

		expect(getByTestId('budget-page')).toBeTruthy();
	});

	it('contains placeholder text about Epic 2', () => {
		const { getByText } = render(BudgetPage);

		expect(getByText(/Epic 2/)).toBeTruthy();
	});
});
