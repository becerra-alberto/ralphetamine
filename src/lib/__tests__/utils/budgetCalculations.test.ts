import { describe, it, expect } from 'vitest';
import {
	getTrailing12MRange,
	calculate12MTotals,
	calculateSection12MTotals,
	calculateGrand12MTotals,
	get12MDifferenceClass,
	type Trailing12MTotals
} from '../../utils/budgetCalculations';
import type { BudgetCell } from '../../stores/budget';

describe('Budget Calculations', () => {
	describe('getTrailing12MRange', () => {
		it('should return 12 months ending with the given month', () => {
			const range = getTrailing12MRange('2025-06');
			expect(range).toHaveLength(12);
			expect(range[0]).toBe('2024-07');
			expect(range[11]).toBe('2025-06');
		});

		it('should handle year boundary correctly', () => {
			const range = getTrailing12MRange('2025-01');
			expect(range).toHaveLength(12);
			expect(range[0]).toBe('2024-02');
			expect(range[11]).toBe('2025-01');
		});

		it('should calculate trailing 12M from END of visible range', () => {
			// Example from spec: If viewing Jan-Jun 2025, 12M = Jul 2024 - Jun 2025
			const range = getTrailing12MRange('2025-06');
			expect(range[0]).toBe('2024-07');
			expect(range[11]).toBe('2025-06');
		});

		it('should return months in chronological order', () => {
			const range = getTrailing12MRange('2025-12');
			for (let i = 1; i < range.length; i++) {
				expect(range[i] > range[i - 1]).toBe(true);
			}
		});
	});

	describe('calculate12MTotals', () => {
		const createMockCellsMap = (
			entries: Array<{ categoryId: string; month: string; actualCents: number; budgetedCents: number }>
		): Map<string, BudgetCell> => {
			const map = new Map<string, BudgetCell>();
			entries.forEach((entry) => {
				const key = `${entry.categoryId}:${entry.month}`;
				map.set(key, {
					categoryId: entry.categoryId,
					month: entry.month,
					actualCents: entry.actualCents,
					budgetedCents: entry.budgetedCents,
					remainingCents: entry.budgetedCents - Math.abs(entry.actualCents)
				});
			});
			return map;
		};

		it('should sum actualCents across 12 months using absolute values', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -10000, budgetedCents: 12000 },
				{ categoryId: 'cat-1', month: '2025-02', actualCents: -15000, budgetedCents: 12000 },
				{ categoryId: 'cat-1', month: '2025-03', actualCents: -8000, budgetedCents: 12000 }
			]);

			const trailing12M = ['2025-01', '2025-02', '2025-03'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			// Uses absolute values: 10000 + 15000 + 8000 = 33000
			expect(totals.actualCents).toBe(33000);
		});

		it('should sum budgetedCents across 12 months', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -10000, budgetedCents: 12000 },
				{ categoryId: 'cat-1', month: '2025-02', actualCents: -15000, budgetedCents: 15000 },
				{ categoryId: 'cat-1', month: '2025-03', actualCents: -8000, budgetedCents: 10000 }
			]);

			const trailing12M = ['2025-01', '2025-02', '2025-03'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			expect(totals.budgetedCents).toBe(37000);
		});

		it('should calculate difference as Budget - Actual (in cents)', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -10000, budgetedCents: 15000 }
			]);

			const trailing12M = ['2025-01'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			// Budget (15000) - Actual (10000) = 5000 remaining
			expect(totals.differenceCents).toBe(5000);
		});

		it('should calculate negative difference when over budget', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -20000, budgetedCents: 15000 }
			]);

			const trailing12M = ['2025-01'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			// Budget (15000) - Actual (20000) = -5000 over budget
			expect(totals.differenceCents).toBe(-5000);
		});

		it('should calculate percentUsed correctly', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -5000, budgetedCents: 10000 }
			]);

			const trailing12M = ['2025-01'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			// 5000 / 10000 * 100 = 50%
			expect(totals.percentUsed).toBe(50);
		});

		it('should return 0 percentUsed when budget is 0', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -5000, budgetedCents: 0 }
			]);

			const trailing12M = ['2025-01'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			expect(totals.percentUsed).toBe(0);
		});

		it('should handle missing months gracefully', () => {
			const cellsMap = new Map<string, BudgetCell>();

			const trailing12M = ['2025-01', '2025-02'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			expect(totals.actualCents).toBe(0);
			expect(totals.budgetedCents).toBe(0);
			expect(totals.differenceCents).toBe(0);
		});

		it('should use integer arithmetic to avoid floating point errors', () => {
			// Testing with amounts that could cause floating point issues
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -1999, budgetedCents: 2000 },
				{ categoryId: 'cat-1', month: '2025-02', actualCents: -1999, budgetedCents: 2000 },
				{ categoryId: 'cat-1', month: '2025-03', actualCents: -1999, budgetedCents: 2000 }
			]);

			const trailing12M = ['2025-01', '2025-02', '2025-03'];
			const totals = calculate12MTotals('cat-1', trailing12M, cellsMap);

			// All values should be exact integers
			expect(Number.isInteger(totals.actualCents)).toBe(true);
			expect(Number.isInteger(totals.budgetedCents)).toBe(true);
			expect(Number.isInteger(totals.differenceCents)).toBe(true);
		});
	});

	describe('calculateSection12MTotals', () => {
		const createMockCellsMap = (
			entries: Array<{ categoryId: string; month: string; actualCents: number; budgetedCents: number }>
		): Map<string, BudgetCell> => {
			const map = new Map<string, BudgetCell>();
			entries.forEach((entry) => {
				const key = `${entry.categoryId}:${entry.month}`;
				map.set(key, {
					categoryId: entry.categoryId,
					month: entry.month,
					actualCents: entry.actualCents,
					budgetedCents: entry.budgetedCents,
					remainingCents: entry.budgetedCents - Math.abs(entry.actualCents)
				});
			});
			return map;
		};

		it('should aggregate totals for all child categories', () => {
			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -10000, budgetedCents: 15000 },
				{ categoryId: 'cat-2', month: '2025-01', actualCents: -5000, budgetedCents: 8000 },
				{ categoryId: 'cat-3', month: '2025-01', actualCents: -3000, budgetedCents: 5000 }
			]);

			const trailing12M = ['2025-01'];
			const totals = calculateSection12MTotals(['cat-1', 'cat-2', 'cat-3'], trailing12M, cellsMap);

			expect(totals.actualCents).toBe(18000); // 10000 + 5000 + 3000
			expect(totals.budgetedCents).toBe(28000); // 15000 + 8000 + 5000
		});

		it('should handle empty category list', () => {
			const cellsMap = new Map<string, BudgetCell>();

			const trailing12M = ['2025-01'];
			const totals = calculateSection12MTotals([], trailing12M, cellsMap);

			expect(totals.actualCents).toBe(0);
			expect(totals.budgetedCents).toBe(0);
		});
	});

	describe('calculateGrand12MTotals', () => {
		it('should be equivalent to calculateSection12MTotals with all categories', () => {
			const createMockCellsMap = (
				entries: Array<{ categoryId: string; month: string; actualCents: number; budgetedCents: number }>
			): Map<string, BudgetCell> => {
				const map = new Map<string, BudgetCell>();
				entries.forEach((entry) => {
					const key = `${entry.categoryId}:${entry.month}`;
					map.set(key, {
						categoryId: entry.categoryId,
						month: entry.month,
						actualCents: entry.actualCents,
						budgetedCents: entry.budgetedCents,
						remainingCents: entry.budgetedCents - Math.abs(entry.actualCents)
					});
				});
				return map;
			};

			const cellsMap = createMockCellsMap([
				{ categoryId: 'cat-1', month: '2025-01', actualCents: -10000, budgetedCents: 15000 },
				{ categoryId: 'cat-2', month: '2025-01', actualCents: -5000, budgetedCents: 8000 }
			]);

			const trailing12M = ['2025-01'];
			const allCategoryIds = ['cat-1', 'cat-2'];

			const grandTotals = calculateGrand12MTotals(allCategoryIds, trailing12M, cellsMap);
			const sectionTotals = calculateSection12MTotals(allCategoryIds, trailing12M, cellsMap);

			expect(grandTotals.actualCents).toBe(sectionTotals.actualCents);
			expect(grandTotals.budgetedCents).toBe(sectionTotals.budgetedCents);
			expect(grandTotals.differenceCents).toBe(sectionTotals.differenceCents);
		});
	});

	describe('get12MDifferenceClass', () => {
		it('should return difference-positive when under budget (positive difference)', () => {
			expect(get12MDifferenceClass(5000)).toBe('difference-positive');
		});

		it('should return difference-negative when over budget (negative difference)', () => {
			expect(get12MDifferenceClass(-5000)).toBe('difference-negative');
		});

		it('should return difference-neutral when exactly on budget', () => {
			expect(get12MDifferenceClass(0)).toBe('difference-neutral');
		});
	});
});
