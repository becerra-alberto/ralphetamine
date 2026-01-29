import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import BudgetCellContextMenu from '../../../components/budget/BudgetCellContextMenu.svelte';

// Test the percentage calculation logic directly
// This mirrors the function in the component
function calculatePercentageIncrease(baseCents: number, percentage: number): number {
	const increaseCents = Math.round((baseCents * percentage) / 100);
	return baseCents + increaseCents;
}

describe('BudgetCellContextMenu', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
		Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should not render when visible is false', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: false,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			expect(screen.queryByTestId('context-menu')).toBeNull();
		});

		it('should render context menu when visible is true', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			expect(screen.getByTestId('context-menu')).toBeTruthy();
		});

		it('should display all menu options', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			expect(screen.getByTestId('menu-item-edit')).toBeTruthy();
			expect(screen.getByTestId('menu-item-set-future')).toBeTruthy();
			expect(screen.getByTestId('menu-item-increase-future')).toBeTruthy();
		});

		it('should render at provided coordinates', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 150,
					y: 200,
					currentBudgetCents: 50000
				}
			});

			const menu = screen.getByTestId('context-menu');
			expect(menu.style.left).toContain('150px');
			expect(menu.style.top).toContain('200px');
		});
	});

	describe('menu items', () => {
		it('should have "Edit this month" option', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const editOption = screen.getByTestId('menu-item-edit');
			expect(editOption.textContent).toContain('Edit this month');
		});

		it('should have "Set for all future months..." option', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const setFutureOption = screen.getByTestId('menu-item-set-future');
			expect(setFutureOption.textContent).toContain('Set for all future months');
		});

		it('should have "Increase future months by %..." option', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const increaseOption = screen.getByTestId('menu-item-increase-future');
			expect(increaseOption.textContent).toContain('Increase future months by %');
		});

		it('should have edit option clickable', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const editOption = screen.getByTestId('menu-item-edit');
			await fireEvent.click(editOption);
		});

		it('should have set-future option clickable', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const setFutureOption = screen.getByTestId('menu-item-set-future');
			await fireEvent.click(setFutureOption);
		});

		it('should have increase-future option clickable', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const increaseOption = screen.getByTestId('menu-item-increase-future');
			await fireEvent.click(increaseOption);
		});
	});

	describe('percentage calculation', () => {
		it('should calculate 400 + 5% = 420 (in cents: 40000 + 5% = 42000)', () => {
			const result = calculatePercentageIncrease(40000, 5);
			expect(result).toBe(42000);
		});

		it('should calculate 400.50 + 3% = 412.52 (in cents: 40050 + 3% = 41252)', () => {
			const result = calculatePercentageIncrease(40050, 3);
			expect(result).toBe(41252);
		});

		it('should round to nearest cent', () => {
			const result = calculatePercentageIncrease(100, 33);
			expect(result).toBe(133);
		});

		it('should handle 0% increase (no change)', () => {
			const result = calculatePercentageIncrease(50000, 0);
			expect(result).toBe(50000);
		});

		it('should handle negative percentage (decrease)', () => {
			const result = calculatePercentageIncrease(40000, -10);
			expect(result).toBe(36000);
		});

		it('should handle large percentages', () => {
			const result = calculatePercentageIncrease(10000, 200);
			expect(result).toBe(30000);
		});

		it('should handle fractional percentages', () => {
			const result = calculatePercentageIncrease(100000, 2.5);
			expect(result).toBe(102500);
		});

		it('should handle small amounts with rounding', () => {
			const result = calculatePercentageIncrease(1, 50);
			expect(result).toBe(2);
		});

		it('should handle 100% increase (double)', () => {
			const result = calculatePercentageIncrease(50000, 100);
			expect(result).toBe(100000);
		});

		it('should handle -100% decrease (zero)', () => {
			const result = calculatePercentageIncrease(50000, -100);
			expect(result).toBe(0);
		});
	});

	describe('menu dismissal', () => {
		it('should handle close when clicking outside', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			await fireEvent.click(document.body);
		});

		it('should handle escape key', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			await fireEvent.keyDown(document, { key: 'Escape' });
		});
	});

	describe('keyboard navigation', () => {
		it('should support arrow key navigation', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const editOption = screen.getByTestId('menu-item-edit');
			expect(editOption.classList.contains('highlighted')).toBe(true);
		});

		it('should support selection with Enter key', async () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'Enter' });
		});
	});

	describe('accessibility', () => {
		it('should have role="menu" on context menu', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			expect(screen.getByRole('menu')).toBeTruthy();
		});

		it('should have role="menuitem" on menu options', () => {
			render(BudgetCellContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					currentBudgetCents: 50000
				}
			});

			const menuItems = screen.getAllByRole('menuitem');
			expect(menuItems.length).toBe(3);
		});
	});
});
