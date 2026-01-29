import { test, expect } from '@playwright/test';

test.describe('Hover Tooltips', () => {
	test.describe('tooltip appears on hover', () => {
		test('should show tooltip after 200ms delay when hovering over budget cell', async ({
			page
		}) => {
			await page.goto('/budget');

			// Find a budget cell
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();

			// Verify cell exists
			await expect(budgetCell).toBeVisible();

			// Hover over the cell
			await budgetCell.hover();

			// Wait for tooltip to appear (200ms delay + some buffer)
			await page.waitForTimeout(300);

			// Tooltip should now be visible
			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toBeVisible();
		});

		test('should not show tooltip immediately on hover', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Hover but check immediately
			await budgetCell.hover();

			// Tooltip should not be visible yet (before 200ms)
			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).not.toBeVisible();
		});
	});

	test.describe('tooltip disappears on mouse leave', () => {
		test('should hide tooltip with fade animation after mouse leaves', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toBeVisible();

			// Move mouse away (to body)
			await page.mouse.move(0, 0);

			// Wait for grace period + fade (200ms + buffer)
			await page.waitForTimeout(400);

			// Tooltip should be hidden
			await expect(tooltip).not.toBeVisible();
		});

		test('should maintain tooltip during 200ms grace period', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toBeVisible();

			// Move mouse away
			await page.mouse.move(0, 0);

			// Check immediately - should still be visible during grace period
			await expect(tooltip).toBeVisible();
		});
	});

	test.describe('view transactions link', () => {
		test('should navigate to /transactions with category and month params', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			// Find and click the view transactions link
			const viewTransactionsLink = page.locator('[data-testid="view-transactions-link"]');
			await expect(viewTransactionsLink).toBeVisible();

			// Get the href before clicking
			const href = await viewTransactionsLink.getAttribute('href');

			// Verify URL format
			expect(href).toMatch(/^\/transactions\?category=.+&month=\d{4}-\d{2}$/);

			// Click the link
			await viewTransactionsLink.click();

			// Should navigate to transactions page
			await expect(page).toHaveURL(/\/transactions\?/);
		});

		test('should include correct category in URL', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const viewTransactionsLink = page.locator('[data-testid="view-transactions-link"]');
			const href = await viewTransactionsLink.getAttribute('href');

			// Should have category param
			expect(href).toContain('category=');
		});

		test('should include correct month in URL', async ({ page }) => {
			await page.goto('/budget');

			// Get the first budget cell and its month attribute
			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			const month = await budgetCell.getAttribute('data-month');

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const viewTransactionsLink = page.locator('[data-testid="view-transactions-link"]');
			const href = await viewTransactionsLink.getAttribute('href');

			// Should have month param matching the cell's month
			if (month) {
				expect(href).toContain(`month=${month}`);
			}
		});
	});

	test.describe('tooltip does not obscure cell', () => {
		test('should position tooltip above or below cell without covering it', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Get cell bounds
			const cellBox = await budgetCell.boundingBox();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toBeVisible();

			// Get tooltip bounds
			const tooltipBox = await tooltip.boundingBox();

			if (cellBox && tooltipBox) {
				// Tooltip should be either fully above or fully below the cell
				const isAbove = tooltipBox.y + tooltipBox.height <= cellBox.y;
				const isBelow = tooltipBox.y >= cellBox.y + cellBox.height;

				// At least one should be true (not overlapping vertically)
				expect(isAbove || isBelow).toBe(true);
			}
		});
	});

	test.describe('tooltip content', () => {
		test('should display actual amount', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toContainText('Actual:');
			await expect(tooltip).toContainText('€');
		});

		test('should display budget amount', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toContainText('Budget:');
		});

		test('should display difference', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toContainText('Difference:');
		});

		test('should display usage percentage', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toContainText('Usage:');
		});

		test('should display view transactions link', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[data-testid="tooltip"]');
			await expect(tooltip).toContainText('View transactions');
		});
	});

	test.describe('keyboard accessibility', () => {
		test('tooltip should have proper ARIA role', async ({ page }) => {
			await page.goto('/budget');

			const budgetCell = page.locator('[data-testid="budget-cell"]').first();
			await expect(budgetCell).toBeVisible();

			// Show tooltip
			await budgetCell.hover();
			await page.waitForTimeout(300);

			const tooltip = page.locator('[role="tooltip"]');
			await expect(tooltip).toBeVisible();
		});
	});
});
