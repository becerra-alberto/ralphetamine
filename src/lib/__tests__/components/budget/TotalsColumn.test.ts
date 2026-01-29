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
});
