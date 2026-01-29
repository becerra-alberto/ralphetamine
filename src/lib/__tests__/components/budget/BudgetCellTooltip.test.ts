import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BudgetCellTooltip from '../../../components/budget/BudgetCellTooltip.svelte';

describe('BudgetCellTooltip', () => {
	describe('content display', () => {
		it('should display "Actual: €X,XXX.XX" formatted correctly', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000,
					budgetCents: 50000,
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			expect(screen.getByText('Actual:')).toBeTruthy();
			// -€350.00
			expect(screen.getByText(/-?€?350\.00/)).toBeTruthy();
		});

		it('should display "Budget: €X,XXX.XX" formatted correctly', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000,
					budgetCents: 50000,
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			expect(screen.getByText('Budget:')).toBeTruthy();
			// €500.00
			expect(screen.getByText(/€?500\.00/)).toBeTruthy();
		});

		it('should display "Difference: €X,XXX.XX" calculated in cents', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000, // spent €350
					budgetCents: 50000, // budget €500
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			expect(screen.getByText('Difference:')).toBeTruthy();
			// Remaining: €150.00
			const differenceElement = screen.getByTestId('difference-positive');
			expect(differenceElement.textContent).toContain('150');
			expect(differenceElement.textContent).toContain('remaining');
		});

		it('should display "Usage: XX%" rounded to 1 decimal place', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000, // 70% of budget
					budgetCents: 50000,
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			expect(screen.getByText('Usage:')).toBeTruthy();
			expect(screen.getByText('70.0%')).toBeTruthy();
		});

		it('should show "N/A" for usage when budget is €0', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000,
					budgetCents: 0,
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			expect(screen.getByText('N/A')).toBeTruthy();
		});
	});

	describe('difference display', () => {
		it('should show "+€XXX.XX remaining" in green when under budget', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000, // spent €350
					budgetCents: 50000, // budget €500
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			const differenceElement = screen.getByTestId('difference-positive');
			expect(differenceElement).toBeTruthy();
			expect(differenceElement.textContent).toContain('remaining');
			expect(differenceElement.classList.contains('difference-positive')).toBe(true);
		});

		it('should show "-€XXX.XX over" in red when over budget', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -60000, // spent €600
					budgetCents: 50000, // budget €500
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			const differenceElement = screen.getByTestId('difference-negative');
			expect(differenceElement).toBeTruthy();
			expect(differenceElement.textContent).toContain('over');
			expect(differenceElement.classList.contains('difference-negative')).toBe(true);
		});

		it('should show "On budget" in neutral when exactly on budget', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -50000, // spent €500
					budgetCents: 50000, // budget €500
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			const differenceElement = screen.getByTestId('difference-neutral');
			expect(differenceElement).toBeTruthy();
			expect(differenceElement.textContent).toContain('On budget');
			expect(differenceElement.classList.contains('difference-neutral')).toBe(true);
		});
	});

	describe('view transactions link', () => {
		it('should have "View transactions →" link present', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000,
					budgetCents: 50000,
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			const link = screen.getByTestId('view-transactions-link');
			expect(link).toBeTruthy();
			expect(link.textContent).toContain('View transactions');
		});

		it('should have correct href with category and month params', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: -35000,
					budgetCents: 50000,
					categoryId: 'cat-123',
					month: '2025-01'
				}
			});

			const link = screen.getByTestId('view-transactions-link') as HTMLAnchorElement;
			expect(link.getAttribute('href')).toBe('/transactions?category=cat-123&month=2025-01');
		});
	});

	describe('edge cases', () => {
		it('should handle zero actual amount', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: 0,
					budgetCents: 50000,
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			expect(screen.getByText('0.0%')).toBeTruthy();
		});

		it('should handle income categories with positive actual', () => {
			render(BudgetCellTooltip, {
				props: {
					actualCents: 55000, // income received
					budgetCents: 50000, // income target
					categoryId: 'cat-1',
					month: '2025-01'
				}
			});

			// Should show usage over 100%
			expect(screen.getByText('110.0%')).toBeTruthy();
		});
	});
});
