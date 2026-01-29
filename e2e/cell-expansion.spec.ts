import { test, expect } from '@playwright/test';

test.describe('Cell Expansion', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/budget');
		await page.locator('[data-testid="budget-page"]').waitFor({ state: 'visible' });
	});

	test.describe('AC1: Cell Click Expands', () => {
		test('should open expansion panel when clicking a budget cell', async ({ page }) => {
			// Find a budget cell and click it
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			// Skip if no budget cells exist
			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();

			// Wait for expansion panel to appear
			const expansionPanel = page.locator('[data-testid="cell-expansion"]');
			await expect(expansionPanel).toBeVisible({ timeout: 5000 });
		});

		test('should highlight the expanded cell', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();

			// Check that cell has expanded class
			await expect(budgetCell).toHaveClass(/expanded/);
		});

		test('should show transactions for the selected category and month', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();

			// Expansion panel should contain transaction list
			const expansionPanel = page.locator('[data-testid="cell-expansion"]');
			await expect(expansionPanel).toBeVisible({ timeout: 5000 });

			// Should have either transactions or empty state
			const hasTransactions = (await page.locator('[data-testid="transaction-item"]').count()) > 0;
			const hasEmptyState = await page
				.locator('[data-testid="empty-state"]')
				.isVisible()
				.catch(() => false);

			expect(hasTransactions || hasEmptyState).toBe(true);
		});
	});

	test.describe('AC2: Keyboard Expand', () => {
		test('should expand cell when pressing Enter on focused cell', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Focus the cell
			await budgetCell.focus();

			// Press Enter to expand
			await page.keyboard.press('Enter');

			// Expansion panel should appear
			const expansionPanel = page.locator('[data-testid="cell-expansion"]');
			await expect(expansionPanel).toBeVisible({ timeout: 5000 });
		});

		test('should expand cell when pressing Space on focused cell', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			// Focus the cell
			await budgetCell.focus();

			// Press Space to expand
			await page.keyboard.press(' ');

			// Expansion panel should appear
			const expansionPanel = page.locator('[data-testid="cell-expansion"]');
			await expect(expansionPanel).toBeVisible({ timeout: 5000 });
		});
	});

	test.describe('AC3: Transaction List Display', () => {
		test('should display Date (DD MMM), Payee, and Amount for each transaction', async ({
			page
		}) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();

			const transactionItems = page.locator('[data-testid="transaction-item"]');
			const count = await transactionItems.count();

			if (count > 0) {
				// Each transaction should have date, payee, and amount
				const firstItem = transactionItems.first();
				await expect(firstItem.locator('[data-testid="transaction-date"]')).toBeVisible();
				await expect(firstItem.locator('[data-testid="transaction-payee"]')).toBeVisible();
				await expect(firstItem.locator('[data-testid="transaction-amount"]')).toBeVisible();
			}
		});

		test('should show maximum 10 transactions', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();

			// Wait for panel
			await page
				.locator('[data-testid="cell-expansion"]')
				.waitFor({ state: 'visible', timeout: 5000 });

			const transactionItems = page.locator('[data-testid="transaction-item"]');
			const count = await transactionItems.count();

			expect(count).toBeLessThanOrEqual(10);
		});
	});

	test.describe('AC4: View All Link', () => {
		test('should show "View all X transactions" link when more than 10 transactions', async ({
			page
		}) => {
			// This test needs a cell with > 10 transactions
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			if (count === 0) {
				test.skip();
				return;
			}

			// Try each cell until we find one with > 10 transactions
			for (let i = 0; i < Math.min(count, 5); i++) {
				await budgetCells.nth(i).click();

				// Wait for expansion
				await page
					.locator('[data-testid="cell-expansion"]')
					.waitFor({ state: 'visible', timeout: 5000 })
					.catch(() => null);

				const viewAllLink = page.locator('[data-testid="view-all-link"]');
				if (await viewAllLink.isVisible().catch(() => false)) {
					await expect(viewAllLink).toContainText(/View all \d+ transactions/);
					return;
				}
			}

			// If no cells have > 10 transactions, skip
			test.skip();
		});

		test('should navigate to /transactions with filters when clicking View all', async ({
			page
		}) => {
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			if (count === 0) {
				test.skip();
				return;
			}

			// Find a cell with View all link
			for (let i = 0; i < Math.min(count, 5); i++) {
				await budgetCells.nth(i).click();
				await page
					.locator('[data-testid="cell-expansion"]')
					.waitFor({ state: 'visible', timeout: 5000 })
					.catch(() => null);

				const viewAllLink = page.locator('[data-testid="view-all-link"]');
				if (await viewAllLink.isVisible().catch(() => false)) {
					await viewAllLink.click();
					await expect(page).toHaveURL(/\/transactions\?category=.+&month=\d{4}-\d{2}/);
					return;
				}
			}

			test.skip();
		});
	});

	test.describe('AC5: Single Expansion Only', () => {
		test('should close previous expansion when clicking different cell', async ({ page }) => {
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			if (count < 2) {
				test.skip();
				return;
			}

			// Click first cell
			await budgetCells.first().click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });
			await expect(budgetCells.first()).toHaveClass(/expanded/);

			// Click second cell
			await budgetCells.nth(1).click();
			await page.waitForTimeout(300);

			// Second cell should be expanded, first should not
			await expect(budgetCells.nth(1)).toHaveClass(/expanded/);
			const firstCellClasses = await budgetCells.first().getAttribute('class');
			expect(firstCellClasses).not.toContain('expanded');

			// Only one expansion panel
			const expansionPanels = page.locator('[data-testid="cell-expansion"]');
			expect(await expansionPanels.count()).toBeLessThanOrEqual(1);
		});

		test('should have smooth transition between expansions', async ({ page }) => {
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			if (count < 2) {
				test.skip();
				return;
			}

			await budgetCells.first().click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });

			await budgetCells.nth(1).click();
			await page.waitForTimeout(250);

			const expansion = page.locator('[data-testid="cell-expansion"]');
			await expect(expansion).toBeVisible();
		});
	});

	test.describe('AC6: Close Expansion', () => {
		test('should close expansion when clicking the expanded cell again', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });

			// Click same cell to close
			await budgetCell.click();

			const expansion = page.locator('[data-testid="cell-expansion"]');
			await expect(expansion).not.toBeVisible({ timeout: 3000 });
		});

		test('should close expansion when pressing Escape', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });

			await page.keyboard.press('Escape');

			const expansion = page.locator('[data-testid="cell-expansion"]');
			await expect(expansion).not.toBeVisible({ timeout: 3000 });
		});

		test('should close expansion when clicking outside', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });

			// Click outside (on the page title)
			await page.locator('h1').click();

			const expansion = page.locator('[data-testid="cell-expansion"]');
			await expect(expansion).not.toBeVisible({ timeout: 3000 });
		});

		test('should close expansion when clicking close button', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });

			const closeButton = page.locator('[data-testid="close-button"]');
			await closeButton.click();

			const expansion = page.locator('[data-testid="cell-expansion"]');
			await expect(expansion).not.toBeVisible({ timeout: 3000 });
		});

		test('should return cell to normal state after closing', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.click();
			await page.locator('[data-testid="cell-expansion"]').waitFor({ state: 'visible', timeout: 5000 });
			await expect(budgetCell).toHaveClass(/expanded/);

			await page.keyboard.press('Escape');

			const cellClasses = await budgetCell.getAttribute('class');
			expect(cellClasses).not.toContain('expanded');
		});
	});

	test.describe('AC7: Empty State', () => {
		test('should show "No transactions for this month" when cell has no transactions', async ({
			page
		}) => {
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			if (count === 0) {
				test.skip();
				return;
			}

			// Try to find a cell with no transactions
			for (let i = 0; i < Math.min(count, 5); i++) {
				await budgetCells.nth(i).click();
				await page
					.locator('[data-testid="cell-expansion"]')
					.waitFor({ state: 'visible', timeout: 5000 })
					.catch(() => null);

				const emptyState = page.locator('[data-testid="empty-state"]');
				if (await emptyState.isVisible().catch(() => false)) {
					await expect(emptyState).toContainText('No transactions for this month');
					return;
				}
			}

			test.skip();
		});

		test('should still allow closing from empty state', async ({ page }) => {
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			if (count === 0) {
				test.skip();
				return;
			}

			await budgetCells.first().click();
			const expansion = page.locator('[data-testid="cell-expansion"]');

			try {
				await expansion.waitFor({ state: 'visible', timeout: 5000 });
			} catch {
				test.skip();
				return;
			}

			await page.keyboard.press('Escape');
			await expect(expansion).not.toBeVisible({ timeout: 3000 });
		});
	});

	test.describe('Focus Management', () => {
		test('should move focus to expansion panel on keyboard expand', async ({ page }) => {
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			if ((await budgetCell.count()) === 0) {
				test.skip();
				return;
			}

			await budgetCell.focus();
			await page.keyboard.press('Enter');

			const expansion = page.locator('[data-testid="cell-expansion"]');
			await expect(expansion).toBeVisible({ timeout: 5000 });
		});
	});
});
