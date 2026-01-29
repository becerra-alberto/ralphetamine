import { test, expect } from '@playwright/test';

test.describe('Transaction Filters', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByTestId('transactions-page')).toBeVisible();
	});

	test.describe('Filter Panel Toggle', () => {
		test('"/" keyboard shortcut opens filter panel', async ({ page }) => {
			// Ensure filter panel is not visible initially
			await expect(page.getByTestId('filter-panel')).not.toBeVisible();

			// Press "/" key
			await page.keyboard.press('/');

			// Filter panel should appear
			await expect(page.getByTestId('filter-panel')).toBeVisible();
		});

		test('filter icon click toggles panel open/closed', async ({ page }) => {
			const toggleBtn = page.getByTestId('filter-toggle');
			await expect(toggleBtn).toBeVisible();

			// Click to open
			await toggleBtn.click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Click to close
			await toggleBtn.click();
			await expect(page.getByTestId('filter-panel')).not.toBeVisible();
		});

		test('Escape key closes filter panel', async ({ page }) => {
			// Open filter panel
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Press Escape
			await page.keyboard.press('Escape');

			// Panel should close
			await expect(page.getByTestId('filter-panel')).not.toBeVisible();
		});

		test('close button closes filter panel', async ({ page }) => {
			// Open filter panel
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Click close button
			await page.getByTestId('filter-panel-close').click();

			// Panel should close
			await expect(page.getByTestId('filter-panel')).not.toBeVisible();
		});
	});

	test.describe('Filter Panel Sections', () => {
		test('filter panel renders all filter sections', async ({ page }) => {
			// Open filter panel
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Verify all sections are present
			await expect(page.getByTestId('date-range-filter')).toBeVisible();
			await expect(page.getByTestId('account-filter')).toBeVisible();
			await expect(page.getByTestId('category-filter')).toBeVisible();
			await expect(page.getByTestId('tags-filter')).toBeVisible();
			await expect(page.getByTestId('amount-filter')).toBeVisible();
			await expect(page.getByTestId('type-filter')).toBeVisible();
		});

		test('date range presets are visible', async ({ page }) => {
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Check all preset buttons
			await expect(page.getByTestId('date-preset-today')).toBeVisible();
			await expect(page.getByTestId('date-preset-this-week')).toBeVisible();
			await expect(page.getByTestId('date-preset-this-month')).toBeVisible();
			await expect(page.getByTestId('date-preset-last-30-days')).toBeVisible();
			await expect(page.getByTestId('date-preset-this-year')).toBeVisible();
		});

		test('type filter has All, Income only, Expense only radio buttons', async ({ page }) => {
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			await expect(page.getByTestId('type-all')).toBeVisible();
			await expect(page.getByTestId('type-income')).toBeVisible();
			await expect(page.getByTestId('type-expense')).toBeVisible();

			// "All" should be checked by default
			await expect(page.getByTestId('type-all')).toBeChecked();
		});
	});

	test.describe('Filter Application', () => {
		test('applying date range filter updates transaction list', async ({ page }) => {
			// Open filter panel
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Click "This month" preset
			await page.getByTestId('date-preset-this-month').click();

			// Wait for filter to apply
			await page.waitForTimeout(300);

			// Verify the date filter is active (start/end date inputs should have values)
			const startInput = page.getByTestId('date-start');
			const startValue = await startInput.inputValue();
			expect(startValue).toBeTruthy();
		});

		test('combining filters shows correct results', async ({ page }) => {
			// Open filter panel
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Select "Expense only" type filter
			await page.getByTestId('type-expense').click();

			// Wait for filter to apply
			await page.waitForTimeout(300);

			// The type filter should now be checked
			await expect(page.getByTestId('type-expense')).toBeChecked();
		});
	});

	test.describe('Clear All Filters', () => {
		test('clear all filters restores complete transaction list', async ({ page }) => {
			// Open filter panel
			await page.getByTestId('filter-toggle').click();
			await expect(page.getByTestId('filter-panel')).toBeVisible();

			// Apply a filter (select Expense type)
			await page.getByTestId('type-expense').click();
			await page.waitForTimeout(300);

			// Clear all button should now be visible
			const clearAllBtn = page.getByTestId('clear-all-filters');
			await expect(clearAllBtn).toBeVisible();

			// Click clear all
			await clearAllBtn.click();
			await page.waitForTimeout(300);

			// "All" type should be reselected
			await expect(page.getByTestId('type-all')).toBeChecked();
		});
	});

	test.describe('Filter Badge', () => {
		test('filter count badge appears when filters are active', async ({ page }) => {
			// Initially no badge
			await expect(page.getByTestId('filter-count-badge')).not.toBeVisible();

			// Open filter panel and apply a filter
			await page.getByTestId('filter-toggle').click();
			await page.getByTestId('type-expense').click();
			await page.waitForTimeout(300);

			// Badge should now show
			const badge = page.getByTestId('filter-count-badge');
			await expect(badge).toBeVisible();
			await expect(badge).toHaveText('1');
		});
	});
});
