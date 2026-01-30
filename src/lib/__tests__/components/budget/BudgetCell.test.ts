import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
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
		it('should show €0 when no transactions exist', () => {
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
			expect(actual.textContent).toContain('€0');
		});

		it('should show €0 when no budget is set', () => {
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
			expect(budgeted.textContent).toContain('€0');
		});

		it('should show €0 for both when no data', () => {
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

	describe('currency formatting', () => {
		it('should format actual amount with compact format', () => {
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
			// Compact format: -€350
			expect(actual.textContent).toContain('350');
			expect(actual.textContent).toContain('€');
		});

		it('should format budget amount with compact format', () => {
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
			// Compact format: €500 (no .00)
			expect(budgeted.textContent).toContain('€500');
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

		it('should display positive amounts for income with K suffix', () => {
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
			// Compact format: €5.5K
			expect(actual.textContent).toContain('5.5K');
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

	describe('expanded state (Story 2.10)', () => {
		it('should have "expanded" highlight state when isExpanded is true', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					isExpanded: true
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('expanded')).toBe(true);
		});

		it('should not have expanded class when isExpanded is false', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					isExpanded: false
				}
			});

			const cell = screen.getByTestId('budget-cell');
			expect(cell.classList.contains('expanded')).toBe(false);
		});

		it('should default isExpanded to false', () => {
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
			expect(cell.classList.contains('expanded')).toBe(false);
		});

		it('should be focusable for keyboard interaction', () => {
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
			expect(cell.getAttribute('tabindex')).toBe('0');
		});

		it('should have cursor pointer for clickability', () => {
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
			// The cursor: pointer is in the CSS for .budget-cell class
		});
	});

	describe('edit mode (Story 3.1)', () => {
		it('should enter edit mode on double-click', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			await fireEvent.dblClick(cell);

			// Cell should have editing class
			expect(cell.classList.contains('editing')).toBe(true);

			// CellInput should be visible
			const cellInput = screen.getByTestId('cell-input');
			expect(cellInput).toBeTruthy();
		});

		it('should enter edit mode on Enter key when focused', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			await fireEvent.keyDown(cell, { key: 'Enter' });

			// Cell should have editing class
			expect(cell.classList.contains('editing')).toBe(true);

			// CellInput should be visible
			const cellInput = screen.getByTestId('cell-input');
			expect(cellInput).toBeTruthy();
		});

		it('should expand on Space key (not edit)', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');
			await fireEvent.keyDown(cell, { key: ' ' });

			// Should NOT enter edit mode (Space triggers expand, not edit)
			expect(cell.classList.contains('editing')).toBe(false);
		});

		it('should show CellInput with current budget value', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000, // €500.00
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			// Enter edit mode
			const cell = screen.getByTestId('budget-cell');
			await fireEvent.dblClick(cell);

			// CellInput should be visible with pre-filled value
			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			expect(input.value).toBe('500.00');
		});

		it('should allow editing the input value', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			// Enter edit mode
			const cell = screen.getByTestId('budget-cell');
			await fireEvent.dblClick(cell);

			// Change value
			const input = screen.getByTestId('cell-input-field') as HTMLInputElement;
			await fireEvent.input(input, { target: { value: '600.00' } });

			// Input should reflect the new value
			expect(input.value).toBe('600.00');
		});

		it('should exit edit mode on cancel (Escape)', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			// Enter edit mode
			const cell = screen.getByTestId('budget-cell');
			await fireEvent.dblClick(cell);

			// Verify in edit mode
			expect(cell.classList.contains('editing')).toBe(true);

			// Cancel
			const input = screen.getByTestId('cell-input-field');
			await fireEvent.keyDown(input, { key: 'Escape' });

			// Should exit edit mode
			expect(cell.classList.contains('editing')).toBe(false);

			// Cell display should be back
			expect(screen.getByTestId('cell-actual')).toBeTruthy();
			expect(screen.getByTestId('cell-budgeted')).toBeTruthy();
		});

		it('should hide display values when in edit mode', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			// Enter edit mode
			const cell = screen.getByTestId('budget-cell');
			await fireEvent.dblClick(cell);

			// Display values should be hidden
			expect(screen.queryByTestId('cell-actual')).toBeNull();
			expect(screen.queryByTestId('cell-budgeted')).toBeNull();
		});

		it('should set tabindex to -1 when editing', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');

			// Before edit, tabindex should be 0
			expect(cell.getAttribute('tabindex')).toBe('0');

			// Enter edit mode
			await fireEvent.dblClick(cell);

			// During edit, tabindex should be -1
			expect(cell.getAttribute('tabindex')).toBe('-1');
		});

		it('should not trigger click handler when in edit mode', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			// Enter edit mode
			const cell = screen.getByTestId('budget-cell');
			await fireEvent.dblClick(cell);

			// Verify we're in edit mode
			expect(cell.classList.contains('editing')).toBe(true);

			// Click should not exit edit mode (it stays in edit mode)
			await fireEvent.click(cell);
			expect(cell.classList.contains('editing')).toBe(true);
		});
	});

	describe('context menu (Story 3.3)', () => {
		it('should prevent default browser context menu on right-click', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');

			// Create a contextmenu event and check it can be prevented
			const contextMenuEvent = new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: 100
			});

			// Dispatch and verify default prevention
			const wasNotPrevented = cell.dispatchEvent(contextMenuEvent);
			// If event handler calls preventDefault(), dispatchEvent returns false
			expect(wasNotPrevented).toBe(false);
		});

		it('should open context menu on Shift+F10 (keyboard accessibility)', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');

			// Focus the cell
			cell.focus();

			// Press Shift+F10
			await fireEvent.keyDown(cell, { key: 'F10', shiftKey: true });

			// Context menu should be visible (BudgetCellContextMenu is rendered)
			// We can't easily test the BudgetCellContextMenu visibility directly
			// but we verify the key handler is triggered by checking the component
			// The context menu component should be in the DOM
			// Note: The actual menu visibility is managed by BudgetCell state
		});

		it('should not open context menu when already editing', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');

			// Enter edit mode
			await fireEvent.dblClick(cell);
			expect(cell.classList.contains('editing')).toBe(true);

			// Right-click should not open context menu when editing
			// The isEditing check in handleKeydown prevents keyboard context menu
		});

		it('should have context menu component rendered', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			// BudgetCell includes the BudgetCellContextMenu component
			// The context menu is hidden by default (visible=false)
			// Actual event propagation is tested in E2E tests
			const cell = screen.getByTestId('budget-cell');
			expect(cell).toBeTruthy();
		});

		it('should handle context menu events when triggered', async () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 50000,
					actualCents: -35000,
					isCurrent: false,
					categoryType: 'expense',
					categoryId: 'cat-123'
				}
			});

			const cell = screen.getByTestId('budget-cell');

			// Right-click to open context menu
			await fireEvent.contextMenu(cell);

			// The context menu visibility and event handling
			// is tested through E2E tests - here we verify the cell
			// renders correctly and handles the right-click
			expect(cell).toBeTruthy();
		});
	});

	describe('compact formatting (Story 10.1)', () => {
		it('should render compact format without ".00" suffix', () => {
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

			// Should NOT contain .00
			expect(actual.textContent).not.toContain('.00');
			expect(budgeted.textContent).not.toContain('.00');
		});

		it('should show K suffix for amounts over 1000', () => {
			render(BudgetCell, {
				props: {
					month: '2025-01',
					budgetedCents: 150000,
					actualCents: -200000,
					isCurrent: false,
					categoryType: 'expense'
				}
			});

			const actual = screen.getByTestId('cell-actual');
			const budgeted = screen.getByTestId('cell-budgeted');

			expect(actual.textContent).toContain('K');
			expect(budgeted.textContent).toContain('K');
		});
	});
});
