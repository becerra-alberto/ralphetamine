import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import UncategorizedRow from '../../../components/budget/UncategorizedRow.svelte';
import type { MonthString } from '../../../types/budget';
import type { Trailing12MTotals } from '../../../utils/budgetCalculations';

// Mock goto function
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

import { goto } from '$app/navigation';

describe('UncategorizedRow', () => {
	const months: MonthString[] = ['2025-01', '2025-02', '2025-03'];
	const currentMonth = '2025-02';

	const mockMonthlyTotals = new Map<MonthString, { totalCents: number; transactionCount: number }>([
		['2025-01', { totalCents: -15000, transactionCount: 3 }],
		['2025-02', { totalCents: -25000, transactionCount: 5 }],
		['2025-03', { totalCents: 0, transactionCount: 0 }]
	]);

	const mockTotals12M: Trailing12MTotals = {
		actualCents: 40000,
		budgetedCents: 0,
		differenceCents: -40000,
		percentUsed: 0
	};

	describe('rendering', () => {
		it('should render with "Uncategorized" label', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			expect(screen.getByText('Uncategorized')).toBeTruthy();
		});

		it('should have role="row" for accessibility', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const row = screen.getByTestId('uncategorized-row');
			expect(row.getAttribute('role')).toBe('row');
		});

		it('should have data-testid="uncategorized-row"', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			expect(screen.getByTestId('uncategorized-row')).toBeTruthy();
		});
	});

	describe('transaction count display', () => {
		it('should show "(X transactions)" count badge', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const countBadge = screen.getByTestId('transaction-count');
			expect(countBadge.textContent).toContain('8');
			expect(countBadge.textContent).toContain('transactions');
		});

		it('should use singular "transaction" when count is 1', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 1
				}
			});

			const countBadge = screen.getByTestId('transaction-count');
			expect(countBadge.textContent).toContain('1 transaction');
			expect(countBadge.textContent).not.toContain('transactions');
		});
	});

	describe('monthly cells', () => {
		it('should render a cell for each month', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const cells = screen.getAllByTestId('uncategorized-cell');
			expect(cells).toHaveLength(3);
		});

		it('should show SUM of uncategorized transactions formatted as currency', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			// Find cells with data-month attribute
			const jan = screen.getByTestId('uncategorized-row').querySelector('[data-month="2025-01"]');
			expect(jan?.textContent).toContain('150.00'); // 15000 cents = $150.00
		});

		it('should show dash for months with no uncategorized transactions', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const march = screen.getByTestId('uncategorized-row').querySelector('[data-month="2025-03"]');
			expect(march?.textContent).toContain('—');
		});

		it('should only show actual (no budget for uncategorized)', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			// Verify there's only one value per cell (actual), not two (actual + budget)
			const cells = screen.getAllByTestId('uncategorized-cell');
			cells.forEach((cell) => {
				// Each cell should have only one span with a value (or dash)
				const spans = cell.querySelectorAll('span');
				expect(spans.length).toBeLessThanOrEqual(1);
			});
		});
	});

	describe('visual styling', () => {
		it('should have warning/yellow tint background class', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const row = screen.getByTestId('uncategorized-row');
			expect(row.classList.contains('uncategorized-row')).toBe(true);
		});

		it('should highlight current month cell', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const currentMonthCell = screen.getByTestId('uncategorized-row').querySelector('[data-month="2025-02"]');
			expect(currentMonthCell?.classList.contains('current-month')).toBe(true);
		});

		it('should have label text in warning color', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const labelText = screen.getByText('Uncategorized');
			expect(labelText.classList.contains('label-text')).toBe(true);
		});
	});

	describe('click navigation', () => {
		it('should navigate to /transactions?filter=uncategorized on click', async () => {
			const mockGoto = vi.mocked(goto);
			mockGoto.mockClear();

			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const row = screen.getByTestId('uncategorized-row');
			await fireEvent.click(row);

			expect(mockGoto).toHaveBeenCalledWith('/transactions?filter=uncategorized');
		});

		it('should navigate on Enter key press', async () => {
			const mockGoto = vi.mocked(goto);
			mockGoto.mockClear();

			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const row = screen.getByTestId('uncategorized-row');
			await fireEvent.keyDown(row, { key: 'Enter' });

			expect(mockGoto).toHaveBeenCalledWith('/transactions?filter=uncategorized');
		});

		it('should navigate on Space key press', async () => {
			const mockGoto = vi.mocked(goto);
			mockGoto.mockClear();

			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const row = screen.getByTestId('uncategorized-row');
			await fireEvent.keyDown(row, { key: ' ' });

			expect(mockGoto).toHaveBeenCalledWith('/transactions?filter=uncategorized');
		});

		it('should be focusable with tabindex', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			const row = screen.getByTestId('uncategorized-row');
			expect(row.getAttribute('tabindex')).toBe('0');
		});
	});

	describe('12M totals column', () => {
		it('should render TotalsColumn when totals12M is provided', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8,
					totals12M: mockTotals12M
				}
			});

			const totalsCell = screen.getByTestId('totals-cell');
			expect(totalsCell).toBeTruthy();
		});

		it('should show total uncategorized over 12 months', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8,
					totals12M: mockTotals12M
				}
			});

			const totalsCell = screen.getByTestId('totals-cell');
			// 40000 cents = $400.00
			expect(totalsCell.textContent).toContain('400.00');
		});

		it('should render placeholder when totals12M is not provided', () => {
			render(UncategorizedRow, {
				props: {
					months,
					currentMonth,
					monthlyTotals: mockMonthlyTotals,
					totalTransactionCount: 8
				}
			});

			// Should have a placeholder div when no 12M totals
			const row = screen.getByTestId('uncategorized-row');
			const placeholder = row.querySelector('.totals-placeholder');
			expect(placeholder).toBeTruthy();
		});
	});

	describe('currency formatting', () => {
		it('should format amounts as currency with absolute values', () => {
			const monthlyTotalsWithNegative = new Map<MonthString, { totalCents: number; transactionCount: number }>([
				['2025-01', { totalCents: -15000, transactionCount: 3 }]
			]);

			render(UncategorizedRow, {
				props: {
					months: ['2025-01'],
					currentMonth: '2025-01',
					monthlyTotals: monthlyTotalsWithNegative,
					totalTransactionCount: 3
				}
			});

			// Should show positive currency value (absolute)
			const cell = screen.getByTestId('uncategorized-cell');
			expect(cell.textContent).toContain('150.00');
			// Should not have a negative sign visible
			expect(cell.textContent).not.toMatch(/-\$?150/);
		});
	});
});
