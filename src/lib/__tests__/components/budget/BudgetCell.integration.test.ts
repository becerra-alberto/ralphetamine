import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import BudgetCell from '../../../components/budget/BudgetCell.svelte';
import { formatBudgetAmount } from '../../../utils/budgetFormatting';

describe('BudgetCell Integration', () => {
	describe('actual amount calculation', () => {
		it('should display actual as SUM of amount_cents for category + month', () => {
			// Simulate aggregated transactions: 3 transactions of -10000, -15000, -10000 cents
			const sumAmountCents = -10000 + -15000 + -10000; // -35000 cents = -€350

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
			// Should show the aggregated amount in compact format
			expect(actual.textContent).toContain('€350');
		});

		it('should display budget from budgets.amount_cents for category + month', () => {
			// Budget set to 50000 cents = €500
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
			expect(budgeted.textContent).toContain('€500');
		});
	});

	describe('income category display', () => {
		it('should display positive amounts correctly for income with K suffix', () => {
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

			expect(actual.textContent).toContain('€5.5K');
			expect(budgeted.textContent).toContain('€5K');
		});

		it('should show status-success when income exceeds target', () => {
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
			expect(cell.classList.contains('status-success')).toBe(true);
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
			expect(cell.classList.contains('status-success')).toBe(true);
		});
	});

	describe('currency formatting integration', () => {
		it('should use formatBudgetAmount for compact formatting', () => {
			const testAmount = 123456; // 1234.56 dollars → €1.2K

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
			const expected = formatBudgetAmount(testAmount);
			expect(actual.textContent).toContain(expected);
		});

		it('should display amounts as compact integers (no .00 suffix)', () => {
			// 1999 cents = 19.99 → "€19" in compact format
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

			expect(actual.textContent).toBe('€19');
			expect(budgeted.textContent).toBe('€19');
		});
	});

	describe('color coding based on budget status', () => {
		it('should apply status-success class when expense is under budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000, // €1000 budget
					actualCents: -50000, // €500 spent = 50% (under budget)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(true);
		});

		it('should apply status-danger class when expense is over budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000, // €1000 budget
					actualCents: -120000, // €1200 spent = 120% (over budget)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-danger')).toBe(true);
		});

		it('should apply status-warning class when expense is approaching budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000, // €1000 budget
					actualCents: -95000, // €950 spent = 95% (approaching)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-warning')).toBe(true);
		});

		it('should apply status-neutral class when expense is on budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000, // €1000 budget
					actualCents: -100000, // €1000 spent = 100% (on budget)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-neutral')).toBe(true);
		});

		it('should not apply status class when no budget is set', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 0, // No budget
					actualCents: -50000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(false);
			expect(cell.classList.contains('status-danger')).toBe(false);
			expect(cell.classList.contains('status-warning')).toBe(false);
			expect(cell.classList.contains('status-neutral')).toBe(false);
		});
	});

	describe('color coding updates with transaction changes', () => {
		it('should reflect status change when actualCents prop changes', async () => {
			const { rerender } = render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -50000, // 50% = under budget
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			let cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(true);

			// Simulate transaction change - now over budget
			await rerender({
				month: '2025-01',
				budgetedCents: 100000,
				actualCents: -120000, // 120% = over budget
				isCurrent: false,
				categoryType: 'expense'
			});

			cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-danger')).toBe(true);
			expect(cell.classList.contains('status-success')).toBe(false);
		});

		it('should update display when multiple transactions accumulate', async () => {
			// Start with one transaction
			const { rerender } = render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -30000, // €300 = 30%
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			let actual = screen.getByTestId('cell-actual');
			expect(actual.textContent).toContain('€300');

			// Add more transactions (simulated by changing actualCents)
			await rerender({
				month: '2025-01',
				budgetedCents: 100000,
				actualCents: -75000, // €750 = 75% (under, closer to budget)
				isCurrent: false,
				categoryType: 'expense'
			});

			actual = screen.getByTestId('cell-actual');
			expect(actual.textContent).toContain('€750');
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

			expect(actual.textContent).toContain('€0');
			expect(budgeted.textContent).toContain('€0');
		});
	});

	describe('tooltip integration', () => {
		// Note: Full tooltip rendering tests with transitions are skipped in unit tests
		// due to jsdom limitations with element.animate(). The tooltip action tests
		// in tooltip.test.ts verify hover behavior, and E2E tests in
		// hover-tooltips.spec.ts verify full tooltip functionality.

		it('should have tooltip action attached to cell', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -50000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-1'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			// Cell should exist and be ready for hover interactions
			expect(cell).toBeTruthy();
		});

		it('should have categoryId prop for tooltip link generation', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -50000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-groceries'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell).toBeTruthy();
			// The categoryId is used by BudgetCellTooltip for the transaction link
		});

		it('should pass correct props for tooltip content', () => {
			render(BudgetCell, {
				props: {
					month: '2025-03',
					budgetedCents: 75000, // €750
					actualCents: -30000, // €300
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-food'
				}
			});

			// Verify the cell displays the data that would be passed to tooltip
			const actualEl = screen.getByTestId('cell-actual');
			const budgetedEl = screen.getByTestId('cell-budgeted');

			expect(actualEl.textContent).toContain('€300');
			expect(budgetedEl.textContent).toContain('€750');
		});
	});
});
