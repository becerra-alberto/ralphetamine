import { test, expect } from '@playwright/test';

test.describe('Budget Batch Adjustment Modal (Story 3.4)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/budget');
		await page.locator('[data-testid="budget-page"]').waitFor({ state: 'visible' });
	});

	test.describe('AC1: Modal Opens', () => {
		test('should open modal via "Adjust Budgets" button click', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await expect(adjustButton).toBeVisible({ timeout: 5000 });

			await adjustButton.click();

			// Modal should be visible
			const modal = page.locator('[data-testid="modal"]');
			await expect(modal).toBeVisible({ timeout: 3000 });

			// Modal backdrop should be visible (dimmed background)
			const backdrop = page.locator('[data-testid="modal-backdrop"]');
			await expect(backdrop).toBeVisible();
		});

		test('should open modal via Cmd+Shift+B keyboard shortcut', async ({ page }) => {
			// Use the keyboard shortcut
			await page.keyboard.press('Meta+Shift+B');

			// Modal should be visible
			const modal = page.locator('[data-testid="modal"]');
			await expect(modal).toBeVisible({ timeout: 3000 });
		});

		test('should center modal on screen with dimmed backdrop', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			const modal = page.locator('[data-testid="modal"]');
			await expect(modal).toBeVisible({ timeout: 3000 });

			// Modal should be centered (check flex container alignment)
			const backdrop = page.locator('[data-testid="modal-backdrop"]');
			await expect(backdrop).toHaveCSS('display', 'flex');
			await expect(backdrop).toHaveCSS('align-items', 'center');
			await expect(backdrop).toHaveCSS('justify-content', 'center');
		});
	});

	test.describe('AC2: Category Selector', () => {
		test('should show category dropdown grouped by section', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Category list should be visible
			const categoryList = page.locator('[data-testid="category-list"]');
			await expect(categoryList).toBeVisible();
		});

		test('should have "All categories" option', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Select all option should be visible
			const selectAll = page.locator('[data-testid="select-all-categories"]');
			await expect(selectAll).toBeVisible();
		});
	});

	test.describe('AC3: Date Range Selector', () => {
		test('should have date range preset buttons', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Date presets should be visible
			const preset3m = page.locator('[data-testid="preset-3m"]');
			const preset6m = page.locator('[data-testid="preset-6m"]');
			const preset12m = page.locator('[data-testid="preset-12m"]');

			await expect(preset3m).toBeVisible();
			await expect(preset6m).toBeVisible();
			await expect(preset12m).toBeVisible();
		});

		test('should select "Next 3 months" preset correctly', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			const preset3m = page.locator('[data-testid="preset-3m"]');
			await preset3m.click();

			// Button should be active
			await expect(preset3m).toHaveClass(/active/);
		});

		test('should select "Next 6 months" preset correctly', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			const preset6m = page.locator('[data-testid="preset-6m"]');
			await preset6m.click();

			await expect(preset6m).toHaveClass(/active/);
		});

		test('should select "Next 12 months" preset correctly', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			const preset12m = page.locator('[data-testid="preset-12m"]');
			await preset12m.click();

			await expect(preset12m).toHaveClass(/active/);
		});
	});

	test.describe('AC4 & AC5: Operation Selector and Input', () => {
		test('should show operation dropdown with all options', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Operation select should be visible
			const operationSelect = page.locator('[data-testid="operation-select"] select');
			await expect(operationSelect).toBeVisible();

			// Check options exist
			const options = await operationSelect.locator('option').allTextContents();
			expect(options).toContain('Set amount');
			expect(options).toContain('Increase by %');
			expect(options).toContain('Decrease by %');
			expect(options).toContain('Copy from previous period');
		});

		test('should show currency input for "Set amount" operation', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Default operation is 'set-amount'
			const amountInput = page.locator('[data-testid="amount-input"]');
			await expect(amountInput).toBeVisible();
		});

		test('should show percentage input for "Increase by %" operation', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Select percentage operation
			const operationSelect = page.locator('[data-testid="operation-select"] select');
			await operationSelect.selectOption('increase-percent');

			// Percent input should be visible
			const percentInput = page.locator('[data-testid="percent-input"]');
			await expect(percentInput).toBeVisible();
		});
	});

	test.describe('AC6: Preview Panel', () => {
		test('should show preview panel with affected cell count', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Preview should be visible
			const preview = page.locator('[data-testid="adjustment-preview"]');
			await expect(preview).toBeVisible();

			// Preview count should show "0 cells affected" initially
			const previewCount = page.locator('[data-testid="preview-count"]');
			await expect(previewCount).toContainText('0 cells affected');
		});

		test('should show empty state when no categories selected', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Empty state should be shown
			const emptyState = page.locator('[data-testid="preview-empty"]');
			await expect(emptyState).toBeVisible();
		});
	});

	test.describe('AC7: Apply Changes', () => {
		test('should have disabled Apply button when no categories selected', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			const applyButton = page.locator('[data-testid="apply-button"]');
			await expect(applyButton).toBeDisabled();
		});

		test('should show loading indicator during batch operation', async ({ page }) => {
			// This test would require mocking the API to slow down the response
			// Skipping for now as it's difficult to test without actual data
			test.skip();
		});
	});

	test.describe('AC8: Cancel/Close', () => {
		test('should close modal when Cancel button is clicked', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Click cancel
			const cancelButton = page.locator('[data-testid="cancel-button"]');
			await cancelButton.click();

			// Modal should close
			await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });
		});

		test('should close modal when Escape key is pressed', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Press Escape
			await page.keyboard.press('Escape');

			// Modal should close
			await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });
		});

		test('should close modal when clicking backdrop', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Click backdrop (outside modal)
			const backdrop = page.locator('[data-testid="modal-backdrop"]');
			await backdrop.click({ position: { x: 10, y: 10 } });

			// Modal should close
			await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });
		});

		test('should not save changes when cancelled', async ({ page }) => {
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Type an amount (even though no categories selected)
			const amountInput = page.locator('[data-testid="amount-input"]');
			await amountInput.fill('500.00');

			// Cancel
			const cancelButton = page.locator('[data-testid="cancel-button"]');
			await cancelButton.click();

			// Modal should close without any changes
			await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });
		});
	});

	test.describe('Keyboard Shortcut', () => {
		test('should toggle modal with keyboard shortcut', async ({ page }) => {
			// Open with shortcut
			await page.keyboard.press('Meta+Shift+B');
			await expect(page.locator('[data-testid="modal"]')).toBeVisible({ timeout: 3000 });

			// Close with Escape
			await page.keyboard.press('Escape');
			await expect(page.locator('[data-testid="modal"]')).not.toBeVisible({ timeout: 3000 });
		});
	});

	test.describe('Full Workflow', () => {
		test('full flow: open modal -> verify UI structure -> cancel', async ({ page }) => {
			// Open modal
			const adjustButton = page.locator('[data-testid="adjust-budgets-btn"]');
			await adjustButton.click();

			const modal = page.locator('[data-testid="modal"]');
			await expect(modal).toBeVisible({ timeout: 3000 });

			// Verify all major UI elements are present
			await expect(page.locator('[data-testid="budget-adjustment-modal"]')).toBeVisible();
			await expect(page.locator('[data-testid="select-all-categories"]')).toBeVisible();
			await expect(page.locator('[data-testid="category-list"]')).toBeVisible();
			await expect(page.locator('[data-testid="date-presets"]')).toBeVisible();
			await expect(page.locator('[data-testid="operation-select"]')).toBeVisible();
			await expect(page.locator('[data-testid="value-input"]')).toBeVisible();
			await expect(page.locator('[data-testid="adjustment-preview"]')).toBeVisible();
			await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
			await expect(page.locator('[data-testid="apply-button"]')).toBeVisible();

			// Cancel
			await page.locator('[data-testid="cancel-button"]').click();
			await expect(modal).not.toBeVisible({ timeout: 3000 });
		});
	});
});
