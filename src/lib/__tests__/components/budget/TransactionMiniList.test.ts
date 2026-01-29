import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TransactionMiniList from '../../../components/budget/TransactionMiniList.svelte';
import type { MiniTransaction } from '../../../components/budget/TransactionMiniList.svelte';

// Sample transactions for testing
const sampleTransactions: MiniTransaction[] = [
	{ id: '1', date: '2025-01-15', payee: 'Grocery Store', amountCents: -5000 },
	{ id: '2', date: '2025-01-10', payee: 'Coffee Shop', amountCents: -350 },
	{ id: '3', date: '2025-01-05', payee: 'Restaurant', amountCents: -2500 }
];

describe('TransactionMiniList', () => {
	describe('rendering', () => {
		it('should render the transaction mini list container', () => {
			render(TransactionMiniList, { props: { transactions: sampleTransactions } });

			const list = screen.getByTestId('transaction-mini-list');
			expect(list).toBeInTheDocument();
		});

		it('should render transaction items', () => {
			render(TransactionMiniList, { props: { transactions: sampleTransactions } });

			const items = screen.getAllByTestId('transaction-item');
			expect(items).toHaveLength(3);
		});

		it('should render empty state when no transactions', () => {
			render(TransactionMiniList, { props: { transactions: [] } });

			const emptyState = screen.getByTestId('empty-state');
			expect(emptyState).toBeInTheDocument();
			expect(emptyState).toHaveTextContent('No transactions for this month');
		});
	});

	describe('transaction display', () => {
		it('should display date in DD MMM format', () => {
			render(TransactionMiniList, { props: { transactions: sampleTransactions } });

			const dates = screen.getAllByTestId('transaction-date');
			// January 15
			expect(dates[0]).toHaveTextContent('15 Jan');
		});

		it('should display payee name', () => {
			render(TransactionMiniList, { props: { transactions: sampleTransactions } });

			const payees = screen.getAllByTestId('transaction-payee');
			// After sorting by date desc, first is '15 Jan' = 'Grocery Store'
			expect(payees[0]).toHaveTextContent('Grocery Store');
		});

		it('should display amount formatted as currency', () => {
			render(TransactionMiniList, { props: { transactions: sampleTransactions } });

			const amounts = screen.getAllByTestId('transaction-amount');
			// -5000 cents = -$50.00
			expect(amounts[0].textContent).toMatch(/50\.00/);
		});

		it('should format amounts correctly using cents', () => {
			const transactions: MiniTransaction[] = [
				{ id: '1', date: '2025-01-01', payee: 'Test', amountCents: -12345 } // $123.45
			];

			render(TransactionMiniList, { props: { transactions } });

			const amount = screen.getByTestId('transaction-amount');
			expect(amount.textContent).toMatch(/123\.45/);
		});
	});

	describe('sorting', () => {
		it('should sort transactions by date descending', () => {
			const unsortedTransactions: MiniTransaction[] = [
				{ id: '1', date: '2025-01-05', payee: 'First', amountCents: -100 },
				{ id: '2', date: '2025-01-15', payee: 'Second', amountCents: -200 },
				{ id: '3', date: '2025-01-10', payee: 'Third', amountCents: -300 }
			];

			render(TransactionMiniList, { props: { transactions: unsortedTransactions } });

			const payees = screen.getAllByTestId('transaction-payee');
			// Sorted by date desc: Jan 15, Jan 10, Jan 5
			expect(payees[0]).toHaveTextContent('Second'); // Jan 15
			expect(payees[1]).toHaveTextContent('Third'); // Jan 10
			expect(payees[2]).toHaveTextContent('First'); // Jan 5
		});
	});

	describe('maximum items', () => {
		it('should limit displayed transactions to maxItems', () => {
			const manyTransactions: MiniTransaction[] = Array.from({ length: 15 }, (_, i) => ({
				id: String(i),
				date: `2025-01-${String(i + 1).padStart(2, '0')}`,
				payee: `Payee ${i}`,
				amountCents: -(i + 1) * 100
			}));

			render(TransactionMiniList, { props: { transactions: manyTransactions, maxItems: 10 } });

			const items = screen.getAllByTestId('transaction-item');
			expect(items).toHaveLength(10);
		});

		it('should use default maxItems of 10', () => {
			const manyTransactions: MiniTransaction[] = Array.from({ length: 20 }, (_, i) => ({
				id: String(i),
				date: `2025-01-${String(i + 1).padStart(2, '0')}`,
				payee: `Payee ${i}`,
				amountCents: -(i + 1) * 100
			}));

			render(TransactionMiniList, { props: { transactions: manyTransactions } });

			const items = screen.getAllByTestId('transaction-item');
			expect(items).toHaveLength(10);
		});

		it('should allow custom maxItems value', () => {
			const transactions: MiniTransaction[] = Array.from({ length: 10 }, (_, i) => ({
				id: String(i),
				date: `2025-01-${String(i + 1).padStart(2, '0')}`,
				payee: `Payee ${i}`,
				amountCents: -(i + 1) * 100
			}));

			render(TransactionMiniList, { props: { transactions, maxItems: 5 } });

			const items = screen.getAllByTestId('transaction-item');
			expect(items).toHaveLength(5);
		});
	});

	describe('accessibility', () => {
		it('should have list role', () => {
			render(TransactionMiniList, { props: { transactions: sampleTransactions } });

			const list = screen.getByRole('list');
			expect(list).toBeInTheDocument();
		});

		it('should include payee as title attribute for truncated text', () => {
			const transactions: MiniTransaction[] = [
				{ id: '1', date: '2025-01-01', payee: 'Very Long Payee Name That Might Get Truncated', amountCents: -100 }
			];

			render(TransactionMiniList, { props: { transactions } });

			const payee = screen.getByTestId('transaction-payee');
			expect(payee).toHaveAttribute('title', 'Very Long Payee Name That Might Get Truncated');
		});
	});
});
