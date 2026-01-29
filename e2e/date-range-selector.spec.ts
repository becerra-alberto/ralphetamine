import { test, expect } from '@playwright/test';

test.describe('Date Range Selector', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/budget');
		await page.waitForSelector('[data-testid="budget-page"]');
	});

	test('should display date range selector in header', async ({ page }) => {
		const selector = page.locator('[data-testid="date-range-selector"]');
		await expect(selector).toBeVisible();
	});

	test('should show current range in trigger button', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await expect(triggerButton).toBeVisible();

		// Should display a date range (format: "Mon YYYY - Mon YYYY")
		const text = await triggerButton.textContent();
		expect(text).toMatch(/\w{3} \d{4} - \w{3} \d{4}/);
	});

	test('should open dropdown when clicked', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Dropdown should be visible
		const dropdown = page.locator('[role="listbox"]');
		await expect(dropdown).toBeVisible();
	});

	test('should show all preset options', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Check for all preset options
		await expect(page.getByText('Rolling 12 Months')).toBeVisible();
		await expect(page.getByText('This Year')).toBeVisible();
		await expect(page.getByText('Last Year')).toBeVisible();
		await expect(page.getByText('This Quarter')).toBeVisible();
		await expect(page.getByText('Custom Range...')).toBeVisible();
	});

	test('should update grid immediately when preset selected', async ({ page }) => {
		// Get initial month headers count
		const initialMonthHeaders = await page.locator('.month-header').count();

		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Select "This Quarter" (3 months)
		await page.getByText('This Quarter').click();

		// Wait for dropdown to close
		await expect(page.locator('[role="listbox"]')).not.toBeVisible();

		// Grid should now show 3 month headers
		const newMonthHeaders = await page.locator('.month-header').count();
		expect(newMonthHeaders).toBe(3);
	});

	test('should update URL with range params for bookmarking', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Select "This Year"
		await page.getByText('This Year').click();

		// Wait for URL to update
		await page.waitForTimeout(100);

		// URL should have start and end params
		const url = new URL(page.url());
		const start = url.searchParams.get('start');
		const end = url.searchParams.get('end');

		expect(start).toMatch(/^\d{4}-01$/); // January of current year
		expect(end).toMatch(/^\d{4}-12$/); // December of current year
	});

	test('should load range from URL params', async ({ page }) => {
		// Navigate with specific range params
		await page.goto('/budget?start=2024-03&end=2024-08');
		await page.waitForSelector('[data-testid="budget-page"]');

		// Trigger button should show the specified range
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		const text = await triggerButton.textContent();

		expect(text).toContain('Mar 2024');
		expect(text).toContain('Aug 2024');
	});

	test('should recalculate year headers on range change', async ({ page }) => {
		// Navigate with cross-year range
		await page.goto('/budget?start=2024-11&end=2025-02');
		await page.waitForSelector('[data-testid="budget-page"]');

		// Should show two year headers (2024 and 2025)
		const yearHeaders = page.locator('.year-header');
		const count = await yearHeaders.count();
		expect(count).toBe(2);

		// First year header should be 2024
		const firstYear = await yearHeaders.first().textContent();
		expect(firstYear).toContain('2024');

		// Second year header should be 2025
		const secondYear = await yearHeaders.nth(1).textContent();
		expect(secondYear).toContain('2025');
	});

	test('should show budget data for selected months', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Select "Rolling 12 Months"
		await page.getByText('Rolling 12 Months').click();

		// Wait for dropdown to close
		await expect(page.locator('[role="listbox"]')).not.toBeVisible();

		// Should have 12 month columns
		const monthHeaders = await page.locator('.month-header').count();
		expect(monthHeaders).toBe(12);
	});

	test('should close dropdown on Escape', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		await expect(page.locator('[role="listbox"]')).toBeVisible();

		await page.keyboard.press('Escape');

		await expect(page.locator('[role="listbox"]')).not.toBeVisible();
	});

	test('should close dropdown when clicking outside', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		await expect(page.locator('[role="listbox"]')).toBeVisible();

		// Click outside the dropdown
		await page.locator('.budget-title').click();

		await expect(page.locator('[role="listbox"]')).not.toBeVisible();
	});

	test('should show custom range picker', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Click custom range
		await page.getByText('Custom Range...').click();

		// Should show custom range UI
		await expect(page.getByText('Custom Range')).toBeVisible();
		await expect(page.getByText('Start')).toBeVisible();
		await expect(page.getByText('End')).toBeVisible();
		await expect(page.getByRole('button', { name: /apply/i })).toBeVisible();
	});

	test('should apply custom range', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Click custom range
		await page.getByText('Custom Range...').click();

		// Set specific dates using month pickers
		const monthPickers = page.locator('[data-testid="month-picker"]');
		const startPicker = monthPickers.first();
		const endPicker = monthPickers.nth(1);

		// Set start month to January 2024
		await startPicker.locator('select[aria-label="Month"]').selectOption('1');
		await startPicker.locator('select[aria-label="Year"]').selectOption('2024');

		// Set end month to June 2024
		await endPicker.locator('select[aria-label="Month"]').selectOption('6');
		await endPicker.locator('select[aria-label="Year"]').selectOption('2024');

		// Apply
		await page.getByRole('button', { name: /apply/i }).click();

		// Dropdown should close
		await expect(page.locator('[role="listbox"]')).not.toBeVisible();

		// URL should be updated
		await page.waitForTimeout(100);
		const url = new URL(page.url());
		expect(url.searchParams.get('start')).toBe('2024-01');
		expect(url.searchParams.get('end')).toBe('2024-06');
	});

	test('should show month count in custom range', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		await page.getByText('Custom Range...').click();

		// Should show month count
		await expect(page.getByText(/months/i)).toBeVisible();
	});

	test('should mark selected preset visually', async ({ page }) => {
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();

		// Find the selected option (should have aria-selected=true)
		const selectedOption = page.locator('[role="option"][aria-selected="true"]');
		await expect(selectedOption).toBeVisible();
	});

	test('should persist range selection after page reload', async ({ page }) => {
		// Select "This Year"
		const triggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		await triggerButton.click();
		await page.getByText('This Year').click();

		// Wait for URL update
		await page.waitForTimeout(100);
		const originalUrl = page.url();

		// Reload the page
		await page.reload();
		await page.waitForSelector('[data-testid="budget-page"]');

		// URL should still have the params
		expect(page.url()).toBe(originalUrl);

		// Range should still be "This Year"
		const newTriggerButton = page.locator('[data-testid="date-range-selector"] button').first();
		const text = await newTriggerButton.textContent();

		const currentYear = new Date().getFullYear();
		expect(text).toContain(`Jan ${currentYear}`);
		expect(text).toContain(`Dec ${currentYear}`);
	});
});
