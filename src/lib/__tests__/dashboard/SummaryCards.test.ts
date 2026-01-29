import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SummaryCards from '../../components/dashboard/SummaryCards.svelte';

describe('SummaryCards', () => {
	it('should render summary cards container', () => {
		render(SummaryCards);

		expect(screen.getByTestId('summary-cards')).toBeTruthy();
	});

	it('should display Income card with formatted currency value', () => {
		render(SummaryCards, {
			props: { incomeCents: 500000, expensesCents: 0 }
		});

		const incomeAmount = screen.getByTestId('summary-cards-income-amount');
		expect(incomeAmount).toBeTruthy();
		expect(incomeAmount.textContent?.trim()).toContain('5,000.00');
	});

	it('should display Expenses card with formatted currency value', () => {
		render(SummaryCards, {
			props: { incomeCents: 0, expensesCents: 200000 }
		});

		const expensesAmount = screen.getByTestId('summary-cards-expenses-amount');
		expect(expensesAmount).toBeTruthy();
		expect(expensesAmount.textContent?.trim()).toContain('2,000.00');
	});

	it('should display Balance card as Income minus Expenses', () => {
		render(SummaryCards, {
			props: { incomeCents: 500000, expensesCents: 200000 }
		});

		// Balance = 500000 - 200000 = 300000 cents = €3,000.00
		const balanceAmount = screen.getByTestId('summary-cards-balance-amount');
		expect(balanceAmount).toBeTruthy();
		expect(balanceAmount.textContent?.trim()).toContain('3,000.00');
	});

	it('should show green color class when balance is positive', () => {
		render(SummaryCards, {
			props: { incomeCents: 500000, expensesCents: 200000 }
		});

		const balanceCard = screen.getByTestId('summary-cards-balance');
		expect(balanceCard.classList.contains('balance-positive')).toBe(true);
		expect(balanceCard.classList.contains('balance-negative')).toBe(false);
	});

	it('should show red color class when balance is negative', () => {
		render(SummaryCards, {
			props: { incomeCents: 100000, expensesCents: 300000 }
		});

		const balanceCard = screen.getByTestId('summary-cards-balance');
		expect(balanceCard.classList.contains('balance-negative')).toBe(true);
		expect(balanceCard.classList.contains('balance-positive')).toBe(false);
	});

	it('should show balance-positive when balance is zero', () => {
		render(SummaryCards, {
			props: { incomeCents: 100000, expensesCents: 100000 }
		});

		const balanceCard = screen.getByTestId('summary-cards-balance');
		// balanceCents >= 0 is positive
		expect(balanceCard.classList.contains('balance-positive')).toBe(true);
	});

	it('should show €0.00 values and empty state when no transactions', () => {
		render(SummaryCards, {
			props: { incomeCents: 0, expensesCents: 0 }
		});

		const incomeAmount = screen.getByTestId('summary-cards-income-amount');
		const expensesAmount = screen.getByTestId('summary-cards-expenses-amount');
		const balanceAmount = screen.getByTestId('summary-cards-balance-amount');

		expect(incomeAmount.textContent?.trim()).toContain('0.00');
		expect(expensesAmount.textContent?.trim()).toContain('0.00');
		expect(balanceAmount.textContent?.trim()).toContain('0.00');
	});

	it('should show "Add your first transaction" prompt when empty', () => {
		render(SummaryCards, {
			props: { incomeCents: 0, expensesCents: 0 }
		});

		expect(screen.getByTestId('summary-cards-empty')).toBeTruthy();
		expect(screen.getByText('Add your first transaction')).toBeTruthy();
	});

	it('should show link to transactions in empty state', () => {
		render(SummaryCards, {
			props: { incomeCents: 0, expensesCents: 0 }
		});

		const link = screen.getByTestId('summary-cards-empty-link');
		expect(link).toBeTruthy();
		expect(link.getAttribute('href')).toBe('/transactions');
		expect(link.textContent).toContain('Go to Transactions');
	});

	it('should not show empty state when transactions exist', () => {
		render(SummaryCards, {
			props: { incomeCents: 100000, expensesCents: 0 }
		});

		expect(screen.queryByTestId('summary-cards-empty')).toBeNull();
	});

	it('should show card labels', () => {
		render(SummaryCards);

		expect(screen.getByTestId('summary-cards-income-label').textContent).toBe('Income this month');
		expect(screen.getByTestId('summary-cards-expenses-label').textContent).toBe('Expenses this month');
		expect(screen.getByTestId('summary-cards-balance-label').textContent).toBe('Balance');
	});

	it('should accept custom testId', () => {
		render(SummaryCards, {
			props: { testId: 'custom-cards' }
		});

		expect(screen.getByTestId('custom-cards')).toBeTruthy();
	});
});
