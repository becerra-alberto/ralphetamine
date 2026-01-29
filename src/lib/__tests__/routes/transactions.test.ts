import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TransactionsPage from '../../../routes/transactions/+page.svelte';

// Mock SvelteKit modules
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback({
				url: new URL('http://localhost/transactions'),
				params: {}
			});
			return () => {};
		})
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock API calls
vi.mock('$lib/api/transactions', () => ({
	getTransactions: vi.fn().mockResolvedValue([]),
	getTransactionsPaginated: vi.fn().mockResolvedValue({
		items: [],
		totalCount: 0,
		hasMore: false
	})
}));

vi.mock('$lib/api/categories', () => ({
	getCategories: vi.fn().mockResolvedValue([])
}));

vi.mock('$lib/api/accounts', () => ({
	getAccounts: vi.fn().mockResolvedValue([])
}));

describe('Transactions Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders with correct data-testid', () => {
		render(TransactionsPage);

		expect(screen.getByTestId('transactions-page')).toBeTruthy();
	});

	it('renders page title containing "Transactions"', () => {
		render(TransactionsPage);

		// The page has either "Transactions" or "Transactions View" as title
		const heading = screen.getByRole('heading');
		expect(heading.textContent).toMatch(/Transactions/i);
	});
});
