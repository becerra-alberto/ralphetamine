import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BudgetCell from '../../../components/budget/BudgetCell.svelte';

describe('BudgetCell', () => {
	describe('cell layout', () => {
		it('should render actual on top and budget below', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');

			expect(actual).toBeTruthy();
			expect(budgeted).toBeTruthy();

			// Verify order by checking DOM positions
			const cell = screen.getByTestId('budget-cell');
			const children = cell.querySelectorAll('span');
			expect(children[0].getAttribute('data-testid')).toBe('cell-actual');
			expect(children[1].getAttribute('data-testid')).toBe('cell-budgeted');
		});

		it('should have cell-actual class with 14px/500 weight styling', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			expect(actual.classList.contains('cell-actual')).toBe(true);
		});

		it('should have cell-budgeted class with 12px/secondary styling', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const budgeted = screen.getByTestId('cell-budgeted');
			expect(budgeted.classList.contains('cell-budgeted')).toBe(true);
		});

		it('should have minimum cell width via budget-cell class', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('budget-cell')).toBe(true);
		});

		it('should have proper vertical alignment via flex column', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('budget-cell')).toBe(true);
		});
	});

	describe('no data handling', () => {
		it('should show €0.00 when no transactions exist', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: 0,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			expect(actual.textContent).toContain('€0.00');
		});

		it('should show €0.00 when no budget is set', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 0,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const budgeted = screen.getByTestId('cell-budgeted');
			expect(budgeted.textContent).toContain('€0.00');
		});

		it('should show €0.00 for both when no data', () => {
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

	describe('currency formatting', () => {
		it('should format actual amount as currency', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			// en-US locale: -€350.00
			expect(actual.textContent).toContain('350.00');
			expect(actual.textContent).toContain('€');
		});

		it('should format budget amount as currency', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const budgeted = screen.getByTestId('cell-budgeted');
			// en-US locale: €500.00
			expect(budgeted.textContent).toContain('€500.00');
		});
	});

	describe('current month highlighting', () => {
		it('should have current-month class when isCurrent is true', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: true,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('current-month')).toBe(true);
		});

		it('should not have current-month class when isCurrent is false', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('current-month')).toBe(false);
		});
	});

	describe('status indicators', () => {
		it('should have status-success when expense is under 90% of budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -25000, // 50% used (under 90%)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(true);
		});

		it('should have status-warning when expense is 90-99% of budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -47500, // 95% used (between 90-99%)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-warning')).toBe(true);
		});

		it('should have status-neutral when expense is within 1% of budget', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -50000, // exactly 100% (on budget)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-neutral')).toBe(true);
		});

		it('should have status-danger when expense exceeds budget by more than 1%', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -60000, // 120% used (over budget)
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-danger')).toBe(true);
		});

		it('should not have status class when no budget set', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 0,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(false);
			expect(cell.classList.contains('status-warning')).toBe(false);
			expect(cell.classList.contains('status-danger')).toBe(false);
			expect(cell.classList.contains('status-neutral')).toBe(false);
		});
	});

	describe('income category display', () => {
		it('should have status-success when income exceeds target by more than 1%', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000,
					actualCents: 550000, // 110% achieved (over target = good for income)
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(true);
		});

		it('should have status-warning when income is 90-99% of target', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000,
					actualCents: 475000, // 95% achieved (approaching)
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-warning')).toBe(true);
		});

		it('should have status-danger when income is below 90% of target', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000,
					actualCents: 300000, // 60% achieved (under = bad for income)
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-danger')).toBe(true);
		});

		it('should display positive amounts for income', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 500000,
					actualCents: 550000,
					isCurrent: false,
					categoryType: 'income'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			// en-US locale: €5,500.00
			expect(actual.textContent).toContain('5,500.00');
			expect(actual.textContent).toContain('€');
		});
	});

	describe('accessibility', () => {
		it('should have cell role', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			expect(screen.getByRole('cell')).toBeTruthy();
		});

		it('should have data-month attribute', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.getAttribute('data-month')).toBe('2025-01');
		});
	});

	describe('color coding (Story 2.6)', () => {
		it('should apply status-success class for under budget (green background)', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -50000, // 50% = under budget
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-success')).toBe(true);
		});

		it('should apply status-danger class for over budget (red background)', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -120000, // 120% = over budget
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-danger')).toBe(true);
		});

		it('should apply status-neutral class for on-budget (neutral styling)', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -100000, // 100% = on budget
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-neutral')).toBe(true);
		});

		it('should apply status-warning class for approaching limit (warning indicator)', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 100000,
					actualCents: -95000, // 95% = approaching
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('status-warning')).toBe(true);
		});

		it('should not apply color coding when no budget set', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 0,
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
});
