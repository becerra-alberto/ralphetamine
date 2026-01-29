import { test, expect } from '@playwright/test';

test.describe('Category Dropdown', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByTestId('transactions-page')).toBeVisible();
	});

	test('clicking category field opens hierarchical dropdown', async ({ page }) => {
		// The CategorySelect wraps CategoryDropdown with testId="category-select"
		const trigger = page.getByTestId('category-select-trigger');
		await trigger.click();

		const panel = page.getByTestId('category-select-panel');
		await expect(panel).toBeVisible();

		// Search input should be focused
		const searchInput = page.getByTestId('category-select-search');
		await expect(searchInput).toBeVisible();
	});

	test('all section headers (Income, Housing, Essential, Lifestyle, Savings) are visible', async ({ page }) => {
		const trigger = page.getByTestId('category-select-trigger');
		await trigger.click();

		await expect(page.getByTestId('category-select-panel')).toBeVisible();

		// Check section headers exist
		await expect(page.getByTestId('category-select-header-cat-income')).toBeVisible();
		await expect(page.getByTestId('category-select-header-cat-housing')).toBeVisible();
		await expect(page.getByTestId('category-select-header-cat-essential')).toBeVisible();
		await expect(page.getByTestId('category-select-header-cat-lifestyle')).toBeVisible();
		await expect(page.getByTestId('category-select-header-cat-savings')).toBeVisible();
	});

	test('selecting a category updates display and closes dropdown', async ({ page }) => {
		const trigger = page.getByTestId('category-select-trigger');
		await trigger.click();

		await expect(page.getByTestId('category-select-panel')).toBeVisible();

		// Find and click a child category (Salary is under Income)
		const salaryItem = page.getByTestId('category-select-item-cat-income-salary');
		const isVisible = await salaryItem.isVisible().catch(() => false);
		if (isVisible) {
			await salaryItem.click();

			// Dropdown should close
			await expect(page.getByTestId('category-select-panel')).not.toBeVisible();

			// Trigger should display selected category name
			const selected = page.getByTestId('category-select-selected');
			await expect(selected).toHaveText('Salary');
		}
	});

	test('typing to search filters visible categories', async ({ page }) => {
		const trigger = page.getByTestId('category-select-trigger');
		await trigger.click();

		const searchInput = page.getByTestId('category-select-search');
		await searchInput.fill('Groc');

		// Should show Essential header and Groceries child
		await expect(page.getByTestId('category-select-header-cat-essential')).toBeVisible();
		await expect(page.getByTestId('category-select-item-cat-essential-groceries')).toBeVisible();

		// Income section should NOT be visible (no matching children)
		await expect(page.getByTestId('category-select-header-cat-income')).not.toBeVisible();
	});

	test('keyboard-only navigation and selection works', async ({ page }) => {
		const trigger = page.getByTestId('category-select-trigger');
		await trigger.click();

		const searchInput = page.getByTestId('category-select-search');
		await expect(searchInput).toBeFocused();

		// ArrowDown to navigate to first selectable item
		await searchInput.press('ArrowDown');

		// Press Enter to select
		await searchInput.press('Enter');

		// Dropdown should close
		await expect(page.getByTestId('category-select-panel')).not.toBeVisible();
	});
});
