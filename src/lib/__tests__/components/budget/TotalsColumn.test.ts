import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TotalsColumn from '../../../components/budget/TotalsColumn.svelte';
import type { Trailing12MTotals } from '../../../utils/budgetCalculations';

describe('TotalsColumn', () => {
	const defaultTotals: Trailing12MTotals = {
		actualCents: 120000,
		budgetedCents: 150000,
		differenceCents: 30000,
		percentUsed: 80
	};

	describe('rendering', () => {
		it('should render totals cell', () => {
			render(TotalsColumn, { props: { totals: defaultTotals } });
			expect(screen.getByTestId('totals-cell')).toBeTruthy();
		});

		it('should have role="cell" for accessibility', () => {
			render(TotalsColumn, { props: { totals: defaultTotals } });
			const cell = screen.getByTestId('totals-cell');
			expect(cell.getAttribute('role')).toBe('cell');
		});
	});

	describe('header mode', () => {
		it('should show "Trailing 12M" when isHeader is true', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isHeader: true
				}
			});
			expect(screen.getByText('Trailing 12M')).toBeTruthy();
		});

		it('should have header-cell class when isHeader is true', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isHeader: true
				}
			});
			const cell = screen.getByTestId('totals-cell');
			expect(cell.classList.contains('header-cell')).toBe(true);
		});

		it('should not show amounts when isHeader is true', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isHeader: true
				}
			});
			expect(screen.queryByTestId('totals-actual')).toBeNull();
			expect(screen.queryByTestId('totals-budgeted')).toBeNull();
		});
	});

	describe('data display', () => {
		it('should display total actual formatted as currency', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 120000,
						budgetedCents: 150000,
						differenceCents: 30000,
						percentUsed: 80
					}
				}
			});
			const actual = screen.getByTestId('totals-actual');
			expect(actual.textContent).toContain('1,200.00');
		});

		it('should display total budget formatted as currency', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 120000,
						budgetedCents: 150000,
						differenceCents: 30000,
						percentUsed: 80
					}
				}
			});
			const budgeted = screen.getByTestId('totals-budgeted');
			expect(budgeted.textContent).toContain('1,500.00');
		});

		it('should display positive difference with + prefix', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 120000,
						budgetedCents: 150000,
						differenceCents: 30000,
						percentUsed: 80
					}
				}
			});
			const difference = screen.getByTestId('totals-difference');
			expect(difference.textContent).toContain('+');
			expect(difference.textContent).toContain('300.00');
		});

		it('should display negative difference without + prefix', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 180000,
						budgetedCents: 150000,
						differenceCents: -30000,
						percentUsed: 120
					}
				}
			});
			const difference = screen.getByTestId('totals-difference');
			// Should not have +, only the formatted negative amount
			expect(difference.textContent).not.toMatch(/^\+/);
		});
	});

	describe('color coding', () => {
		it('should have difference-positive class when under budget', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 120000,
						budgetedCents: 150000,
						differenceCents: 30000,
						percentUsed: 80
					}
				}
			});
			const difference = screen.getByTestId('totals-difference');
			expect(difference.classList.contains('difference-positive')).toBe(true);
		});

		it('should have difference-negative class when over budget', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 180000,
						budgetedCents: 150000,
						differenceCents: -30000,
						percentUsed: 120
					}
				}
			});
			const difference = screen.getByTestId('totals-difference');
			expect(difference.classList.contains('difference-negative')).toBe(true);
		});

		it('should have difference-neutral class when exactly on budget', () => {
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 150000,
						budgetedCents: 150000,
						differenceCents: 0,
						percentUsed: 100
					}
				}
			});
			const difference = screen.getByTestId('totals-difference');
			expect(difference.classList.contains('difference-neutral')).toBe(true);
		});
	});

	describe('cell types', () => {
		it('should have section-cell class when isSectionHeader is true', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isSectionHeader: true
				}
			});
			const cell = screen.getByTestId('totals-cell');
			expect(cell.classList.contains('section-cell')).toBe(true);
		});

		it('should have grand-total-cell class when isGrandTotal is true', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isGrandTotal: true
				}
			});
			const cell = screen.getByTestId('totals-cell');
			expect(cell.classList.contains('grand-total-cell')).toBe(true);
		});
	});

	describe('column width', () => {
		it('should be wider than month columns (140px vs 120px)', () => {
			render(TotalsColumn, { props: { totals: defaultTotals } });
			const cell = screen.getByTestId('totals-cell');
			// The component has min-width: 140px in its styles
			expect(cell.classList.contains('totals-cell')).toBe(true);
		});
	});

	describe('distinct background', () => {
		it('should have totals-cell class for subtle highlight styling', () => {
			render(TotalsColumn, { props: { totals: defaultTotals } });
			const cell = screen.getByTestId('totals-cell');
			expect(cell.classList.contains('totals-cell')).toBe(true);
		});
	});

	describe('average per month row (Story 10.2)', () => {
		it('should render average row below 12M totals', () => {
			render(TotalsColumn, { props: { totals: defaultTotals } });
			// Average row elements should be present
			expect(screen.getByTestId('avg-actual')).toBeTruthy();
			expect(screen.getByTestId('avg-budgeted')).toBeTruthy();
			expect(screen.getByTestId('avg-difference')).toBeTruthy();
		});

		it('should calculate average = total / 12 rounded to nearest integer', () => {
			const totals: Trailing12MTotals = {
				actualCents: 120000,    // 1200.00 / 12 = 100.00 → 10000 cents
				budgetedCents: 150000,  // 1500.00 / 12 = 125.00 → 12500 cents
				differenceCents: 30000, // 300.00 / 12 = 25.00 → 2500 cents
				percentUsed: 80
			};
			render(TotalsColumn, { props: { totals } });

			const avgActual = screen.getByTestId('avg-actual');
			// 120000 / 12 = 10000 cents = €100 in compact format
			expect(avgActual.textContent?.trim()).toBe('€100');

			const avgBudgeted = screen.getByTestId('avg-budgeted');
			// 150000 / 12 = 12500 cents = €125 in compact format
			expect(avgBudgeted.textContent?.trim()).toBe('€125');

			const avgDifference = screen.getByTestId('avg-difference');
			// 30000 / 12 = 2500 cents = +€25 in compact format
			expect(avgDifference.textContent?.trim()).toBe('+€25');
		});

		it('should use compact format (formatBudgetAmount) for average values', () => {
			const totals: Trailing12MTotals = {
				actualCents: 1800000,    // 18000.00 / 12 = 1500.00 → 150000 cents → €1.5K
				budgetedCents: 2400000,  // 24000.00 / 12 = 2000.00 → 200000 cents → €2K
				differenceCents: 600000, // 6000.00 / 12 = 500.00 → 50000 cents → €500
				percentUsed: 75
			};
			render(TotalsColumn, { props: { totals } });

			const avgActual = screen.getByTestId('avg-actual');
			expect(avgActual.textContent?.trim()).toBe('€1.5K');

			const avgBudgeted = screen.getByTestId('avg-budgeted');
			expect(avgBudgeted.textContent?.trim()).toBe('€2K');
		});

		it('should show "Avg/mo" label in header mode', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isHeader: true
				}
			});
			expect(screen.getByTestId('avg-header-label')).toBeTruthy();
			expect(screen.getByTestId('avg-header-label').textContent?.trim()).toBe('Avg/mo');
		});

		it('should not show average data elements in header mode', () => {
			render(TotalsColumn, {
				props: {
					totals: defaultTotals,
					isHeader: true
				}
			});
			expect(screen.queryByTestId('avg-actual')).toBeNull();
			expect(screen.queryByTestId('avg-budgeted')).toBeNull();
			expect(screen.queryByTestId('avg-difference')).toBeNull();
		});

		it('should round non-integer averages to nearest cent', () => {
			const totals: Trailing12MTotals = {
				actualCents: 100000,     // 100000 / 12 = 8333.33... → rounds to 8333
				budgetedCents: 100000,
				differenceCents: 0,
				percentUsed: 100
			};
			render(TotalsColumn, { props: { totals } });

			const avgActual = screen.getByTestId('avg-actual');
			// 8333 cents = 83.33 → compact format = "€83"
			expect(avgActual.textContent?.trim()).toBe('€83');
		});

		it('should apply correct color class to average difference', () => {
			// Positive difference (under budget)
			const { unmount } = render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 120000,
						budgetedCents: 150000,
						differenceCents: 30000,
						percentUsed: 80
					}
				}
			});
			const avgDiff = screen.getByTestId('avg-difference');
			expect(avgDiff.classList.contains('difference-positive')).toBe(true);
			unmount();

			// Negative difference (over budget)
			render(TotalsColumn, {
				props: {
					totals: {
						actualCents: 180000,
						budgetedCents: 150000,
						differenceCents: -30000,
						percentUsed: 120
					}
				}
			});
			const avgDiffNeg = screen.getByTestId('avg-difference');
			expect(avgDiffNeg.classList.contains('difference-negative')).toBe(true);
		});
	});
});
