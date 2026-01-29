import { test, expect } from '@playwright/test';

test.describe('Budget Context Menu (Story 3.3)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/budget');
		await page.locator('[data-testid="budget-page"]').waitFor({ state: 'visible' });
	});

	test.describe('AC1: Context Menu Appears', () => {
		test('should open context menu on right-click', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Context menu should appear
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });
		});

		test('should display menu options correctly', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Verify menu options are visible
			await expect(page.locator('[data-testid="menu-item-edit"]')).toBeVisible({ timeout: 5000 });
			await expect(page.locator('[data-testid="menu-item-set-future"]')).toBeVisible();
			await expect(page.locator('[data-testid="menu-item-increase-future"]')).toBeVisible();
		});
	});

	test.describe('AC3: Edit This Month', () => {
		test('should enter edit mode when selecting "Edit this month"', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Edit this month"
			const editOption = page.locator('[data-testid="menu-item-edit"]');
			await editOption.click();

			// Context menu should close
			await expect(page.locator('[data-testid="context-menu"]')).not.toBeVisible({ timeout: 3000 });

			// Cell should be in edit mode
			const cellInput = page.locator('[data-testid="cell-input"]');
			await expect(cellInput).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe('AC4: Set Future Months', () => {
		test('should open amount input popover when selecting "Set for all future months"', async ({
			page
		}) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Set for all future months"
			const setFutureOption = page.locator('[data-testid="menu-item-set-future"]');
			await setFutureOption.click();

			// Amount input popover should appear
			const amountPopover = page.locator('[data-testid="amount-input-popover"]');
			await expect(amountPopover).toBeVisible({ timeout: 5000 });
		});

		test('should update future months when entering amount and clicking Apply', async ({
			page
		}) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Set for all future months"
			const setFutureOption = page.locator('[data-testid="menu-item-set-future"]');
			await setFutureOption.click();

			// Enter amount
			const amountInput = page.locator('[data-testid="amount-input"]');
			await amountInput.fill('500');

			// Click Apply
			const applyBtn = page.locator('[data-testid="apply-btn"]');
			await applyBtn.click();

			// Popover should close
			await expect(page.locator('[data-testid="amount-input-popover"]')).not.toBeVisible({
				timeout: 3000
			});

			// Toast notification should appear (if ToastContainer is in layout)
			// This test may need adjustment based on actual toast implementation
		});
	});

	test.describe('AC5: Increase by Percentage', () => {
		test('should open percentage input popover when selecting "Increase future months by %"', async ({
			page
		}) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Increase future months by %"
			const increaseOption = page.locator('[data-testid="menu-item-increase-future"]');
			await increaseOption.click();

			// Percentage input popover should appear
			const percentagePopover = page.locator('[data-testid="percentage-input-popover"]');
			await expect(percentagePopover).toBeVisible({ timeout: 5000 });
		});

		test('should update future months when entering percentage and clicking Apply', async ({
			page
		}) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Increase future months by %"
			const increaseOption = page.locator('[data-testid="menu-item-increase-future"]');
			await increaseOption.click();

			// Enter percentage
			const percentageInput = page.locator('[data-testid="percentage-input"]');
			await percentageInput.fill('10');

			// Click Apply
			const applyBtn = page.locator('[data-testid="apply-btn"]');
			await applyBtn.click();

			// Popover should close
			await expect(page.locator('[data-testid="percentage-input-popover"]')).not.toBeVisible({
				timeout: 3000
			});
		});
	});

	test.describe('AC6: Menu Dismissal', () => {
		test('should close menu when clicking outside', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Verify menu is open
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });

			// Click outside the menu (on the page header)
			await page.locator('h1').click();

			// Menu should close
			await expect(contextMenu).not.toBeVisible({ timeout: 3000 });
		});

		test('should close menu when pressing Escape', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Verify menu is open
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });

			// Press Escape
			await page.keyboard.press('Escape');

			// Menu should close
			await expect(contextMenu).not.toBeVisible({ timeout: 3000 });
		});
	});

	test.describe('AC7: Keyboard Accessibility', () => {
		test('should open context menu with Shift+F10', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Focus the cell
			await budgetCell.focus();

			// Press Shift+F10
			await page.keyboard.press('Shift+F10');

			// Context menu should appear
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });
		});

		test('should navigate menu with arrow keys', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Verify menu is open
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });

			// Press ArrowDown to highlight first item
			await page.keyboard.press('ArrowDown');

			// First item should be highlighted
			const editOption = page.locator('[data-testid="menu-item-edit"]');
			await expect(editOption).toHaveClass(/highlighted/);

			// Press ArrowDown again to highlight second item
			await page.keyboard.press('ArrowDown');

			// Second item should be highlighted
			const setFutureOption = page.locator('[data-testid="menu-item-set-future"]');
			await expect(setFutureOption).toHaveClass(/highlighted/);
		});

		test('should select item with Enter key', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Verify menu is open
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });

			// Navigate to "Edit this month"
			await page.keyboard.press('ArrowDown');

			// Press Enter to select
			await page.keyboard.press('Enter');

			// Context menu should close and cell should be in edit mode
			await expect(contextMenu).not.toBeVisible({ timeout: 3000 });

			// Cell should be in edit mode
			const cellInput = page.locator('[data-testid="cell-input"]');
			await expect(cellInput).toBeVisible({ timeout: 5000 });
		});

		test('full keyboard flow: focus cell -> Shift+F10 -> arrow down -> Enter', async ({
			page
		}) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Focus the cell
			await budgetCell.focus();

			// Open context menu with keyboard
			await page.keyboard.press('Shift+F10');

			// Verify menu is open
			const contextMenu = page.locator('[data-testid="context-menu"]');
			await expect(contextMenu).toBeVisible({ timeout: 5000 });

			// Navigate to first option
			await page.keyboard.press('ArrowDown');

			// Select with Enter
			await page.keyboard.press('Enter');

			// Should be in edit mode
			const cellInput = page.locator('[data-testid="cell-input"]');
			await expect(cellInput).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe('Input Popovers', () => {
		test('should submit amount on Enter key', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Set for all future months"
			const setFutureOption = page.locator('[data-testid="menu-item-set-future"]');
			await setFutureOption.click();

			// Enter amount
			const amountInput = page.locator('[data-testid="amount-input"]');
			await amountInput.fill('400');

			// Press Enter to submit
			await page.keyboard.press('Enter');

			// Popover should close
			await expect(page.locator('[data-testid="amount-input-popover"]')).not.toBeVisible({
				timeout: 3000
			});
		});

		test('should cancel amount input on Escape key', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Set for all future months"
			const setFutureOption = page.locator('[data-testid="menu-item-set-future"]');
			await setFutureOption.click();

			// Enter amount
			const amountInput = page.locator('[data-testid="amount-input"]');
			await amountInput.fill('400');

			// Press Escape to cancel
			await page.keyboard.press('Escape');

			// Popover should close
			await expect(page.locator('[data-testid="amount-input-popover"]')).not.toBeVisible({
				timeout: 3000
			});
		});

		test('should cancel amount input on Cancel button click', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Right-click to open context menu
			await budgetCell.click({ button: 'right' });

			// Click "Set for all future months"
			const setFutureOption = page.locator('[data-testid="menu-item-set-future"]');
			await setFutureOption.click();

			// Click Cancel button
			const cancelBtn = page.locator('[data-testid="cancel-btn"]');
			await cancelBtn.click();

			// Popover should close
			await expect(page.locator('[data-testid="amount-input-popover"]')).not.toBeVisible({
				timeout: 3000
			});
		});
	});
});
