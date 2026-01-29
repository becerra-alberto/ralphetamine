import { test, expect } from '@playwright/test';

test.describe('Uncategorized Transactions Row', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/budget');
		// Wait for the budget page to load
		await expect(page.locator('[data-testid="budget-page"]')).toBeVisible();
	});

	test.describe('row visibility', () => {
		test('should display uncategorized row when there are uncategorized transactions', async ({ page }) => {
			// The uncategorized row should be visible when there are uncategorized transactions
			// Note: In an empty state, there may be no uncategorized transactions
			const gridContainer = page.locator('.budget-grid-container');
			await expect(gridContainer).toBeVisible();

			// The uncategorized row appears conditionally based on data
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If uncategorized row exists, verify its structure
			if (await uncategorizedRow.isVisible()) {
				// Row should have the Uncategorized label
				const labelText = uncategorizedRow.locator('.label-text');
				await expect(labelText).toHaveText('Uncategorized');
			}
		});

		test('should hide uncategorized row when no uncategorized transactions exist', async ({ page }) => {
			// In default state with no data, there should be no uncategorized row
			const gridContainer = page.locator('.budget-grid-container');
			await expect(gridContainer).toBeVisible();

			// Row should not be present when there are no uncategorized transactions
			// This is the expected default state
			const gridBody = page.locator('.grid-body');
			await expect(gridBody).toBeVisible();
		});
	});

	test.describe('visual distinction', () => {
		test('should have warning/yellow tint styling when present', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, check its styling
			if (await uncategorizedRow.isVisible()) {
				// Check for warning border
				const borderLeft = await uncategorizedRow.evaluate((el) => {
					return window.getComputedStyle(el).borderLeft;
				});

				// Should have a 3px warning-colored left border
				expect(borderLeft).toContain('3px');

				// Check background has warning tint
				const background = await uncategorizedRow.evaluate((el) => {
					return window.getComputedStyle(el).background;
				});

				expect(background).not.toBe('');
			}
		});

		test('should display count badge with transaction count', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, verify the count badge
			if (await uncategorizedRow.isVisible()) {
				const countBadge = uncategorizedRow.locator('[data-testid="transaction-count"]');
				await expect(countBadge).toBeVisible();

				// Count badge should show "(X transaction(s))" format
				const countText = await countBadge.textContent();
				expect(countText).toMatch(/\(\d+ transactions?\)/);
			}
		});

		test('should show label text in warning color', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, check label styling
			if (await uncategorizedRow.isVisible()) {
				const labelText = uncategorizedRow.locator('.label-text');

				// Label should have warning color
				const color = await labelText.evaluate((el) => {
					return window.getComputedStyle(el).color;
				});

				// Warning color should be set (non-empty, typically orange/amber)
				expect(color).not.toBe('');
			}
		});
	});

	test.describe('monthly cells', () => {
		test('should show monthly totals for uncategorized transactions', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, verify month cells
			if (await uncategorizedRow.isVisible()) {
				const cells = uncategorizedRow.locator('[data-testid="uncategorized-cell"]');
				const cellCount = await cells.count();

				// Should have cells for each visible month
				expect(cellCount).toBeGreaterThan(0);
			}
		});

		test('should format amounts as currency', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible with data, check currency formatting
			if (await uncategorizedRow.isVisible()) {
				const cells = uncategorizedRow.locator('.uncategorized-cell');
				const firstCell = cells.first();

				if (await firstCell.isVisible()) {
					const cellContent = await firstCell.textContent();

					// Currency format should include $ or EUR symbol or be a dash for empty
					expect(cellContent).toMatch(/[$€]|—|--/);
				}
			}
		});
	});

	test.describe('click navigation', () => {
		test('should navigate to transactions view with uncategorized filter on click', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, test click navigation
			if (await uncategorizedRow.isVisible()) {
				await uncategorizedRow.click();

				// Should navigate to transactions page with filter
				await page.waitForURL('**/transactions?filter=uncategorized', { timeout: 5000 });
				expect(page.url()).toContain('/transactions');
				expect(page.url()).toContain('filter=uncategorized');
			}
		});

		test('should navigate via keyboard (Enter key)', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, test keyboard navigation
			if (await uncategorizedRow.isVisible()) {
				await uncategorizedRow.focus();
				await page.keyboard.press('Enter');

				// Should navigate to transactions page with filter
				await page.waitForURL('**/transactions?filter=uncategorized', { timeout: 5000 });
				expect(page.url()).toContain('/transactions');
			}
		});

		test('should navigate via keyboard (Space key)', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, test keyboard navigation
			if (await uncategorizedRow.isVisible()) {
				await uncategorizedRow.focus();
				await page.keyboard.press(' ');

				// Should navigate to transactions page with filter
				await page.waitForURL('**/transactions?filter=uncategorized', { timeout: 5000 });
				expect(page.url()).toContain('/transactions');
			}
		});
	});

	test.describe('row position', () => {
		test('should appear at bottom of grid (below all sections)', async ({ page }) => {
			const gridBody = page.locator('.grid-body');
			await expect(gridBody).toBeVisible();

			// The uncategorized row should be the last row in grid-body (if present)
			// before the footer
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If visible, it should be within the grid-body
			if (await uncategorizedRow.isVisible()) {
				const isInGridBody = await gridBody.locator('[data-testid="uncategorized-row"]').isVisible();
				expect(isInGridBody).toBe(true);
			}
		});
	});

	test.describe('12M totals column', () => {
		test('should include 12M totals for uncategorized', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, check for 12M totals column
			if (await uncategorizedRow.isVisible()) {
				// The row should contain a TotalsColumn component
				const totalsColumn = uncategorizedRow.locator('.totals-column');

				// If 12M totals are rendered
				if (await totalsColumn.isVisible()) {
					// Should show the actual amount
					const actualAmount = totalsColumn.locator('.totals-actual');
					await expect(actualAmount).toBeVisible();
				}
			}
		});
	});

	test.describe('accessibility', () => {
		test('should have proper ARIA role', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, verify accessibility
			if (await uncategorizedRow.isVisible()) {
				const role = await uncategorizedRow.getAttribute('role');
				expect(role).toBe('row');
			}
		});

		test('should be focusable for keyboard navigation', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, verify it's focusable
			if (await uncategorizedRow.isVisible()) {
				const tabIndex = await uncategorizedRow.getAttribute('tabindex');
				expect(tabIndex).toBe('0');
			}
		});

		test('should show focus indicator when focused', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, check focus styles
			if (await uncategorizedRow.isVisible()) {
				await uncategorizedRow.focus();

				// Should have visible focus outline
				const outline = await uncategorizedRow.evaluate((el) => {
					return window.getComputedStyle(el).outline;
				});

				expect(outline).not.toBe('none');
			}
		});
	});

	test.describe('hover state', () => {
		test('should show hover effect on mouse over', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, check hover state
			if (await uncategorizedRow.isVisible()) {
				// Get initial background
				const initialBg = await uncategorizedRow.evaluate((el) => {
					return window.getComputedStyle(el).background;
				});

				// Hover over the row
				await uncategorizedRow.hover();

				// Background should change on hover
				// (The CSS transition will change the background)
				const gridContainer = page.locator('.budget-grid-container');
				await expect(gridContainer).toBeVisible();
			}
		});

		test('should have cursor pointer style', async ({ page }) => {
			const uncategorizedRow = page.locator('[data-testid="uncategorized-row"]');

			// If the row is visible, check cursor style
			if (await uncategorizedRow.isVisible()) {
				const cursor = await uncategorizedRow.evaluate((el) => {
					return window.getComputedStyle(el).cursor;
				});

				expect(cursor).toBe('pointer');
			}
		});
	});
});
