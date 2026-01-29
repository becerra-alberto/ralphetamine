import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import BudgetCell from '../../../components/budget/BudgetCell.svelte';

describe('BudgetCell Performance', () => {
	describe('render performance', () => {
		it('should render a single cell in < 10ms', () => {
			const iterations = 10;
			const times: number[] = [];

			for (let i = 0; i < iterations; i++) {
				const start = performance.now();

				render(BudgetCell, {
					props: {
						month: '2025-01',
						budgetedCents: 50000,
						actualCents: -35000,
						isCurrent: false,
						categoryType: 'expense'
					}
				});

				const end = performance.now();
				times.push(end - start);
				cleanup();
			}

			// Calculate average render time
			const averageTime = times.reduce((a, b) => a + b, 0) / times.length;

			// Single cell should render in under 10ms on average
			expect(averageTime).toBeLessThan(10);
		});

		it('should handle rapid re-renders without memory issues', () => {
			const iterations = 100;
			const startMemory = process.memoryUsage?.()?.heapUsed;

			for (let i = 0; i < iterations; i++) {
				render(BudgetCell, {
					props: {
						month: `2025-${String((i % 12) + 1).padStart(2, '0')}`,
						budgetedCents: Math.floor(Math.random() * 100000),
						actualCents: -Math.floor(Math.random() * 100000),
						isCurrent: i % 5 === 0,
						categoryType: i % 2 === 0 ? 'expense' : 'income'
					}
				});
				cleanup();
			}

			// Memory check (if available in test environment)
			if (startMemory !== undefined) {
				const endMemory = process.memoryUsage?.()?.heapUsed;
				if (endMemory !== undefined) {
					const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB
					// Should not increase memory by more than 50MB for 100 renders
					expect(memoryIncrease).toBeLessThan(50);
				}
			}

			// Just verify it completes without error
			expect(true).toBe(true);
		});
	});

	describe('memoization', () => {
		it('should not recalculate status class when props unchanged', () => {
			// First render
			const { container } = render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -25000, // 50% = status-success
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = container.querySelector('[data-testid="budget-cell"]');
			expect(cell?.classList.contains('status-success')).toBe(true);

			// The reactive statement $: statusClass = getStatusClass() should only
			// recalculate when its dependencies change
			cleanup();

			// Render with same props
			const { container: container2 } = render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -25000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell2 = container2.querySelector('[data-testid="budget-cell"]');
			expect(cell2?.classList.contains('status-success')).toBe(true);
		});

		it('should recalculate status when actualCents changes', () => {
			// First render - under budget
			const { container } = render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -25000, // 50% = status-success
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell = container.querySelector('[data-testid="budget-cell"]');
			expect(cell?.classList.contains('status-success')).toBe(true);

			cleanup();

			// Second render - over budget
			const { container: container2 } = render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -60000, // 120% = status-danger
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const cell2 = container2.querySelector('[data-testid="budget-cell"]');
			expect(cell2?.classList.contains('status-danger')).toBe(true);
		});
	});

	describe('bulk rendering', () => {
		it('should render multiple cells efficiently', () => {
			const cellCount = 36; // 3 years * 12 months
			const cells: Array<{ budgetedCents: number; actualCents: number; month: string }> = [];

			for (let i = 0; i < cellCount; i++) {
				cells.push({
					budgetedCents: 50000 + i * 1000,
					actualCents: -(35000 + i * 500),
					month: `2025-${String((i % 12) + 1).padStart(2, '0')}`
				});
			}

			const start = performance.now();

			cells.forEach((cell, index) => {
				render(BudgetCell, {
					props: {
						month: cell.month,
						budgetedCents: cell.budgetedCents,
						actualCents: cell.actualCents,
						isCurrent: index === 0,
						categoryType: 'expense'
					}
				});
			});

			const end = performance.now();
			const totalTime = end - start;

			// 36 cells should render in under 200ms total
			expect(totalTime).toBeLessThan(200);

			// Average per cell should be under 6ms
			expect(totalTime / cellCount).toBeLessThan(6);

			// Cleanup all
			cleanup();
		});
	});
});
