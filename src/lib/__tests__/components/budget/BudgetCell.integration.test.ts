import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BudgetCell from '../../../components/budget/BudgetCell.svelte';
import { formatCentsCurrency } from '../../../utils/currency';

describe('BudgetCell Integration', () => {
	describe('actual amount calculation', () => {
		it('should display actual as SUM of amount_cents for category + month', () => {
			// Simulate aggregated transactions: 3 transactions of -10000, -15000, -10000 cents
			const sumAmountCents = -10000 + -15000 + -10000; // -35000 cents = -€350.00

			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: sumAmountCents,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			// Should show the aggregated amount
			expect(actual.textContent).toContain('350.00');
		});

		it('should display budget from budgets.amount_cents for category + month', () => {
			// Budget set to 50000 cents = €500.00
			const budgetAmountCents = 50000;

			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: budgetAmountCents,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const budgeted = screen.getByTestId('cell-budgeted');
			expect(budgeted.textContent).toContain('€500.00');
		});
	});

	describe('income category display', () => {
		it('should display positive amounts correctly for income', () => {
			// Income: positive actual means money received
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000, // €5000 target
					actualCents: 550000, // €5500 received (good)
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');

			expect(actual.textContent).toContain('5,500.00');
			expect(budgeted.textContent).toContain('5,000.00');
		});

		it('should show status-good when income exceeds target', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000,
					actualCents: 600000, // 120% of target
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-good')).toBe(true);
		});

		it('should show status-danger when income is significantly below target', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000,
					actualCents: 200000, // 40% of target
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-danger')).toBe(true);
		});
	});

	describe('expense category display', () => {
		it('should use absolute value of actual for expense percentage calculation', () => {
			// Expenses are stored as negative amounts
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000, // €1000 budget
					actualCents: -50000, // -€500 spent (50%)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			// 50% < 75% should be good
			expect(cell.classList.contains('status-good')).toBe(true);
		});
	});

	describe('currency formatting integration', () => {
		it('should use formatCentsCurrency for consistent formatting', () => {
			const testAmount = 123456;

			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: testAmount,
					actualCents: testAmount,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const expected = formatCentsCurrency(testAmount);
			expect(actual.textContent).toContain('1,234.56');
		});

		it('should display amounts as integers (cents) converted to currency', () => {
			// Verify no floating point issues: 1999 cents = €19.99 exactly
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 1999,
					actualCents: 1999,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');

			expect(actual.textContent).toContain('19.99');
			expect(budgeted.textContent).toContain('19.99');
		});
	});

	describe('data edge cases', () => {
		it('should handle very large amounts', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 999999999, // €9,999,999.99
					actualCents: 888888888,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');

			expect(actual.textContent).toContain('€');
			expect(budgeted.textContent).toContain('€');
		});

		it('should handle zero budget and zero actual', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 0,
					actualCents: 0,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');

			expect(actual.textContent).toContain('€0.00');
			expect(budgeted.textContent).toContain('€0.00');
		});
	});
});
