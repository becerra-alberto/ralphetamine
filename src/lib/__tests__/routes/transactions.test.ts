import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TransactionsPage from '../../../routes/transactions/+page.svelte';

describe('Transactions Page', () => {
	it('renders "Transactions View" text', () => {
		const { getByText } = render(TransactionsPage);

		expect(getByText('Transactions View')).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(TransactionsPage);

		expect(getByTestId('transactions-page')).toBeTruthy();
	});

	it('contains placeholder text about Epic 4', () => {
		const { getByText } = render(TransactionsPage);

		expect(getByText(/Epic 4/)).toBeTruthy();
	});
});
