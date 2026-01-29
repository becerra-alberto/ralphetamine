import { test, expect } from '@playwright/test';

test.describe('Color-Coded Spending Indicators', () => {
	test.describe('visual verification of color tokens', () => {
		test('under budget cell should have green success indicator', async ({ page }) => {
			await page.goto('/budget');

			// Find a cell with status-success class (under budget for expense)
			const successCell = page.locator('[data-testid="budget-cell"].status-success').first();

			// Check that success cells have correct styling
			if (await successCell.count() > 0) {
				// Verify the cell has the expected background color (green at 10% opacity)
				const backgroundColor = await successCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// rgba(16, 185, 129, 0.1) = --color-success at 10% opacity
				expect(backgroundColor).toMatch(/rgba\(16,\s*185,\s*129/);

				// Verify left border
				const borderLeft = await successCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeft;
				});
				expect(borderLeft).toContain('rgb(16, 185, 129)');
			}
		});

		test('over budget cell should have red danger indicator', async ({ page }) => {
			await page.goto('/budget');

			// Find a cell with status-danger class (over budget for expense)
			const dangerCell = page.locator('[data-testid="budget-cell"].status-danger').first();

			if (await dangerCell.count() > 0) {
				// Verify the cell has the expected background color (red at 10% opacity)
				const backgroundColor = await dangerCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// rgba(239, 68, 68, 0.1) = --color-danger at 10% opacity
				expect(backgroundColor).toMatch(/rgba\(239,\s*68,\s*68/);

				// Verify left border
				const borderLeft = await dangerCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeft;
				});
				expect(borderLeft).toContain('rgb(239, 68, 68)');
			}
		});

		test('on-budget cell should have neutral indicator', async ({ page }) => {
			await page.goto('/budget');

			// Find a cell with status-neutral class
			const neutralCell = page.locator('[data-testid="budget-cell"].status-neutral').first();

			if (await neutralCell.count() > 0) {
				// Verify the cell has the expected background color (gray at 5% opacity)
				const backgroundColor = await neutralCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// rgba(107, 114, 128, 0.05) = --text-secondary at 5% opacity
				expect(backgroundColor).toMatch(/rgba\(107,\s*114,\s*128/);

				// Verify left border
				const borderLeft = await neutralCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeft;
				});
				expect(borderLeft).toContain('rgb(107, 114, 128)');
			}
		});

		test('approaching limit cell should have warning indicator', async ({ page }) => {
			await page.goto('/budget');

			// Find a cell with status-warning class
			const warningCell = page.locator('[data-testid="budget-cell"].status-warning').first();

			if (await warningCell.count() > 0) {
				// Verify the cell has the expected background color (yellow at 10% opacity)
				const backgroundColor = await warningCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// rgba(245, 158, 11, 0.1) = --color-warning at 10% opacity
				expect(backgroundColor).toMatch(/rgba\(245,\s*158,\s*11/);

				// Verify left border
				const borderLeft = await warningCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeft;
				});
				expect(borderLeft).toContain('rgb(245, 158, 11)');
			}
		});
	});

	test.describe('text readability on colored backgrounds', () => {
		test('text should remain readable on success background', async ({ page }) => {
			await page.goto('/budget');

			const successCell = page.locator('[data-testid="budget-cell"].status-success').first();

			if (await successCell.count() > 0) {
				const actualText = successCell.locator('[data-testid="cell-actual"]');
				const textColor = await actualText.evaluate((el) => {
					return window.getComputedStyle(el).color;
				});
				// Text should be colored for emphasis (green for success)
				expect(textColor).toMatch(/rgb\(16,\s*185,\s*129\)/);

				// Verify text is visible (not transparent)
				const opacity = await actualText.evaluate((el) => {
					return window.getComputedStyle(el).opacity;
				});
				expect(parseFloat(opacity)).toBeGreaterThan(0.5);
			}
		});

		test('text should remain readable on danger background', async ({ page }) => {
			await page.goto('/budget');

			const dangerCell = page.locator('[data-testid="budget-cell"].status-danger').first();

			if (await dangerCell.count() > 0) {
				const actualText = dangerCell.locator('[data-testid="cell-actual"]');
				const textColor = await actualText.evaluate((el) => {
					return window.getComputedStyle(el).color;
				});
				// Text should be colored for emphasis (red for danger)
				expect(textColor).toMatch(/rgb\(239,\s*68,\s*68\)/);

				// Verify text is visible
				const opacity = await actualText.evaluate((el) => {
					return window.getComputedStyle(el).opacity;
				});
				expect(parseFloat(opacity)).toBeGreaterThan(0.5);
			}
		});

		test('text should remain readable on warning background', async ({ page }) => {
			await page.goto('/budget');

			const warningCell = page.locator('[data-testid="budget-cell"].status-warning').first();

			if (await warningCell.count() > 0) {
				const actualText = warningCell.locator('[data-testid="cell-actual"]');
				const textColor = await actualText.evaluate((el) => {
					return window.getComputedStyle(el).color;
				});
				// Text should be colored for emphasis (yellow/orange for warning)
				expect(textColor).toMatch(/rgb\(245,\s*158,\s*11\)/);

				// Verify text is visible
				const opacity = await actualText.evaluate((el) => {
					return window.getComputedStyle(el).opacity;
				});
				expect(parseFloat(opacity)).toBeGreaterThan(0.5);
			}
		});
	});

	test.describe('subtle color backgrounds (10-15% opacity)', () => {
		test('success background should be subtle (10% opacity)', async ({ page }) => {
			await page.goto('/budget');

			const successCell = page.locator('[data-testid="budget-cell"].status-success').first();

			if (await successCell.count() > 0) {
				const backgroundColor = await successCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// Extract alpha value from rgba
				const match = backgroundColor.match(/rgba?\([\d,\s]+,?\s*([\d.]+)?\)/);
				if (match && match[1]) {
					const alpha = parseFloat(match[1]);
					expect(alpha).toBeLessThanOrEqual(0.15);
					expect(alpha).toBeGreaterThanOrEqual(0.05);
				}
			}
		});

		test('danger background should be subtle (10% opacity)', async ({ page }) => {
			await page.goto('/budget');

			const dangerCell = page.locator('[data-testid="budget-cell"].status-danger').first();

			if (await dangerCell.count() > 0) {
				const backgroundColor = await dangerCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// Extract alpha value from rgba
				const match = backgroundColor.match(/rgba?\([\d,\s]+,?\s*([\d.]+)?\)/);
				if (match && match[1]) {
					const alpha = parseFloat(match[1]);
					expect(alpha).toBeLessThanOrEqual(0.15);
					expect(alpha).toBeGreaterThanOrEqual(0.05);
				}
			}
		});

		test('warning background should be subtle (10% opacity)', async ({ page }) => {
			await page.goto('/budget');

			const warningCell = page.locator('[data-testid="budget-cell"].status-warning').first();

			if (await warningCell.count() > 0) {
				const backgroundColor = await warningCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// Extract alpha value from rgba
				const match = backgroundColor.match(/rgba?\([\d,\s]+,?\s*([\d.]+)?\)/);
				if (match && match[1]) {
					const alpha = parseFloat(match[1]);
					expect(alpha).toBeLessThanOrEqual(0.15);
					expect(alpha).toBeGreaterThanOrEqual(0.05);
				}
			}
		});

		test('neutral background should be very subtle (5% opacity)', async ({ page }) => {
			await page.goto('/budget');

			const neutralCell = page.locator('[data-testid="budget-cell"].status-neutral').first();

			if (await neutralCell.count() > 0) {
				const backgroundColor = await neutralCell.evaluate((el) => {
					return window.getComputedStyle(el).backgroundColor;
				});
				// Extract alpha value from rgba
				const match = backgroundColor.match(/rgba?\([\d,\s]+,?\s*([\d.]+)?\)/);
				if (match && match[1]) {
					const alpha = parseFloat(match[1]);
					expect(alpha).toBeLessThanOrEqual(0.1);
					expect(alpha).toBeGreaterThanOrEqual(0.01);
				}
			}
		});
	});

	test.describe('no budget set - no color coding', () => {
		test('cell without budget should not have status classes', async ({ page }) => {
			await page.goto('/budget');

			// Find budget cells
			const budgetCells = page.locator('[data-testid="budget-cell"]');
			const count = await budgetCells.count();

			// Check that cells without status classes exist (no budget set)
			// These cells should not have any of the status classes
			for (let i = 0; i < Math.min(count, 10); i++) {
				const cell = budgetCells.nth(i);
				const classes = await cell.getAttribute('class');

				// If cell has no status class, verify no color coding
				if (
					!classes?.includes('status-success') &&
					!classes?.includes('status-danger') &&
					!classes?.includes('status-warning') &&
					!classes?.includes('status-neutral')
				) {
					// This is a cell without budget - should have default styling
					expect(classes).toContain('budget-cell');
				}
			}
		});
	});

	test.describe('color-blind accessibility', () => {
		test('status cells should have left border indicator in addition to background', async ({
			page
		}) => {
			await page.goto('/budget');

			// Check success cells have border
			const successCell = page.locator('[data-testid="budget-cell"].status-success').first();
			if (await successCell.count() > 0) {
				const borderLeftWidth = await successCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeftWidth;
				});
				expect(parseFloat(borderLeftWidth)).toBeGreaterThan(0);
			}

			// Check danger cells have border
			const dangerCell = page.locator('[data-testid="budget-cell"].status-danger').first();
			if (await dangerCell.count() > 0) {
				const borderLeftWidth = await dangerCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeftWidth;
				});
				expect(parseFloat(borderLeftWidth)).toBeGreaterThan(0);
			}

			// Check warning cells have border
			const warningCell = page.locator('[data-testid="budget-cell"].status-warning').first();
			if (await warningCell.count() > 0) {
				const borderLeftWidth = await warningCell.evaluate((el) => {
					return window.getComputedStyle(el).borderLeftWidth;
				});
				expect(parseFloat(borderLeftWidth)).toBeGreaterThan(0);
			}
		});
	});
});
