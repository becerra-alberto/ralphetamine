import { describe, it, expect } from 'vitest';
import {
	calculateExpenseStatus,
	calculateIncomeStatus,
	getBudgetStatus,
	getStatusClass,
	getBudgetStatusWithClass,
	type BudgetStatus
} from '../../utils/budgetStatus';

describe('Budget Status Utilities', () => {
	describe('calculateExpenseStatus', () => {
		it('should return "under" when actual < 90% of budget', () => {
			// 50000 cents spent of 100000 budget = 50%
			const result = calculateExpenseStatus(-50000, 100000);
			expect(result.status).toBe('under');
			expect(result.percentUsed).toBe(50);
		});

		it('should return "over" when actual > budget', () => {
			// 120000 cents spent of 100000 budget = 120%
			const result = calculateExpenseStatus(-120000, 100000);
			expect(result.status).toBe('over');
			expect(result.percentUsed).toBe(120);
		});

		it('should return "on-budget" when actual within 1% of budget', () => {
			// 99500 cents spent of 100000 budget = 99.5%
			const result = calculateExpenseStatus(-99500, 100000);
			expect(result.status).toBe('on-budget');
			expect(result.percentUsed).toBeCloseTo(99.5, 1);
		});

		it('should return "on-budget" when exactly at budget', () => {
			const result = calculateExpenseStatus(-100000, 100000);
			expect(result.status).toBe('on-budget');
			expect(result.percentUsed).toBe(100);
		});

		it('should return "approaching" when actual between 90-99% of budget', () => {
			// 95000 cents spent of 100000 budget = 95%
			const result = calculateExpenseStatus(-95000, 100000);
			expect(result.status).toBe('approaching');
			expect(result.percentUsed).toBe(95);
		});

		it('should return "none" when budget is 0 cents', () => {
			const result = calculateExpenseStatus(-50000, 0);
			expect(result.status).toBe('none');
			expect(result.percentUsed).toBe(0);
		});

		it('should use cents to avoid floating point errors', () => {
			// 1999 cents = exactly €19.99, avoid floating point issues
			const result = calculateExpenseStatus(-1999, 2000);
			expect(result.status).toBe('on-budget');
			expect(result.percentUsed).toBeCloseTo(99.95, 2);
		});

		it('should handle positive actual values (using absolute)', () => {
			// Should work even if actual is positive (takes abs)
			const result = calculateExpenseStatus(50000, 100000);
			expect(result.status).toBe('under');
			expect(result.percentUsed).toBe(50);
		});
	});

	describe('calculateIncomeStatus', () => {
		it('should return "over" (good) when actual >= 101% of budget', () => {
			// 110000 cents income of 100000 target = 110%
			const result = calculateIncomeStatus(110000, 100000);
			expect(result.status).toBe('over');
			expect(result.percentUsed).toBeCloseTo(110, 1);
		});

		it('should return "under" (bad) when actual < 90% of budget', () => {
			// 50000 cents income of 100000 target = 50%
			const result = calculateIncomeStatus(50000, 100000);
			expect(result.status).toBe('under');
			expect(result.percentUsed).toBe(50);
		});

		it('should return "on-budget" when actual within 1% of budget', () => {
			// 100500 cents income of 100000 target = 100.5%
			const result = calculateIncomeStatus(100500, 100000);
			expect(result.status).toBe('on-budget');
			expect(result.percentUsed).toBeCloseTo(100.5, 1);
		});

		it('should return "approaching" when actual between 90-99% of budget', () => {
			// 95000 cents income of 100000 target = 95%
			const result = calculateIncomeStatus(95000, 100000);
			expect(result.status).toBe('approaching');
			expect(result.percentUsed).toBe(95);
		});

		it('should return "none" when budget is 0', () => {
			const result = calculateIncomeStatus(50000, 0);
			expect(result.status).toBe('none');
			expect(result.percentUsed).toBe(0);
		});

		it('should use cents for income calculations', () => {
			// 199999 cents = exactly €1999.99
			const result = calculateIncomeStatus(199999, 200000);
			expect(result.status).toBe('on-budget');
		});
	});

	describe('getBudgetStatus', () => {
		it('should use expense logic for expense categories', () => {
			const result = getBudgetStatus(-50000, 100000, 'expense');
			expect(result.status).toBe('under');
		});

		it('should use income logic for income categories', () => {
			const result = getBudgetStatus(110000, 100000, 'income');
			expect(result.status).toBe('over');
		});

		it('should treat transfers as expenses', () => {
			const result = getBudgetStatus(-50000, 100000, 'transfer');
			expect(result.status).toBe('under');
		});
	});

	describe('getStatusClass', () => {
		describe('expense categories', () => {
			it('should return status-success for under budget (expense)', () => {
				expect(getStatusClass('under', 'expense')).toBe('status-success');
			});

			it('should return status-danger for over budget', () => {
				expect(getStatusClass('over', 'expense')).toBe('status-danger');
			});

			it('should return status-warning for approaching', () => {
				expect(getStatusClass('approaching', 'expense')).toBe('status-warning');
			});

			it('should return status-neutral for on-budget', () => {
				expect(getStatusClass('on-budget', 'expense')).toBe('status-neutral');
			});

			it('should return empty string for none', () => {
				expect(getStatusClass('none', 'expense')).toBe('');
			});
		});

		describe('income categories (inverted logic)', () => {
			it('should return status-success for over (income exceeded target)', () => {
				expect(getStatusClass('over', 'income')).toBe('status-success');
			});

			it('should return status-danger for under (income shortfall)', () => {
				expect(getStatusClass('under', 'income')).toBe('status-danger');
			});

			it('should return status-warning for approaching', () => {
				expect(getStatusClass('approaching', 'income')).toBe('status-warning');
			});

			it('should return status-neutral for on-budget', () => {
				expect(getStatusClass('on-budget', 'income')).toBe('status-neutral');
			});
		});
	});

	describe('getBudgetStatusWithClass', () => {
		it('should return status, percentUsed, and className', () => {
			const result = getBudgetStatusWithClass(-50000, 100000, 'expense');
			expect(result.status).toBe('under');
			expect(result.percentUsed).toBe(50);
			expect(result.className).toBe('status-success');
		});

		it('should handle income categories with inverted classes', () => {
			const result = getBudgetStatusWithClass(110000, 100000, 'income');
			expect(result.status).toBe('over');
			expect(result.percentUsed).toBeCloseTo(110, 1);
			expect(result.className).toBe('status-success');
		});

		it('should return empty className for no budget', () => {
			const result = getBudgetStatusWithClass(-50000, 0, 'expense');
			expect(result.status).toBe('none');
			expect(result.className).toBe('');
		});
	});

	describe('threshold edge cases', () => {
		it('should handle exactly 90% as approaching', () => {
			const result = calculateExpenseStatus(-90000, 100000);
			expect(result.status).toBe('approaching');
		});

		it('should handle 89.9% as under', () => {
			const result = calculateExpenseStatus(-89900, 100000);
			expect(result.status).toBe('under');
		});

		it('should handle exactly 99% as on-budget', () => {
			const result = calculateExpenseStatus(-99000, 100000);
			expect(result.status).toBe('on-budget');
		});

		it('should handle exactly 101% as on-budget', () => {
			const result = calculateExpenseStatus(-101000, 100000);
			expect(result.status).toBe('on-budget');
		});

		it('should handle 101.1% as over', () => {
			const result = calculateExpenseStatus(-101100, 100000);
			expect(result.status).toBe('over');
		});

		it('should handle zero actual with positive budget', () => {
			const result = calculateExpenseStatus(0, 100000);
			expect(result.status).toBe('under');
			expect(result.percentUsed).toBe(0);
		});
	});
});
