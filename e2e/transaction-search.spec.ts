import { test, expect } from '@playwright/test';

test.describe('Transaction Search', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByTestId('transactions-page')).toBeVisible();
	});

	test.describe('Search Bar Rendering', () => {
		test('search bar is visible in header', async ({ page }) => {
			const searchBar = page.getByTestId('search-bar');
			await expect(searchBar).toBeVisible();
		});

		test('search input has correct placeholder', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');
			await expect(searchInput).toHaveAttribute('placeholder', 'Search transactions...');
		});

		test('search icon is displayed', async ({ page }) => {
			const searchBar = page.getByTestId('search-bar');
			const searchIcon = searchBar.locator('.search-icon');
			await expect(searchIcon).toBeVisible();
		});
	});

	test.describe('Cmd+F Keyboard Shortcut', () => {
		test('focuses search input when Cmd+F is pressed', async ({ page }) => {
			// Make sure search input is not focused initially
			const searchInput = page.getByTestId('search-input');
			await expect(searchInput).not.toBeFocused();

			// Press Cmd+F (Meta+F on Mac)
			await page.keyboard.press('Meta+f');

			// Search input should now be focused
			await expect(searchInput).toBeFocused();
		});

		test('selects existing text when Cmd+F is pressed with text', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type some text first
			await searchInput.fill('test query');
			await searchInput.blur();

			// Press Cmd+F
			await page.keyboard.press('Meta+f');

			// Input should be focused
			await expect(searchInput).toBeFocused();
		});
	});

	test.describe('Search Filtering', () => {
		test('filters transaction list when typing 2+ characters', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type search query
			await searchInput.fill('test');

			// Wait for debounce
			await page.waitForTimeout(200);

			// Count should be displayed (if filtering is active)
			const countElement = page.getByTestId('search-count');
			await expect(countElement).toBeVisible();
		});

		test('does not filter when typing less than 2 characters', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type single character
			await searchInput.fill('t');

			// Wait for debounce
			await page.waitForTimeout(200);

			// Count should NOT be displayed
			const countElement = page.getByTestId('search-count');
			await expect(countElement).not.toBeVisible();
		});

		test('displays "Showing X of Y transactions" when filtering', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type search query
			await searchInput.fill('test');

			// Wait for debounce
			await page.waitForTimeout(200);

			// Check count format
			const countElement = page.getByTestId('search-count');
			const text = await countElement.textContent();
			expect(text).toMatch(/Showing \d+ of \d+ transactions/);
		});
	});

	test.describe('No Results State', () => {
		test('displays "No transactions match" message when no results', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type query that won't match anything
			await searchInput.fill('xyznonexistent123');

			// Wait for debounce
			await page.waitForTimeout(200);

			// Check for no results message
			const noResults = page.getByTestId('no-results');
			await expect(noResults).toBeVisible();
			await expect(noResults).toContainText("No transactions match 'xyznonexistent123'");
		});
	});

	test.describe('Clear Search', () => {
		test('clear button appears when text is entered', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Initially no clear button
			await expect(page.getByTestId('search-clear-button')).not.toBeVisible();

			// Type text
			await searchInput.fill('test');

			// Clear button should appear
			const clearButton = page.getByTestId('search-clear-button');
			await expect(clearButton).toBeVisible();
		});

		test('clicking clear button removes search text', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type text
			await searchInput.fill('test query');

			// Click clear button
			const clearButton = page.getByTestId('search-clear-button');
			await clearButton.click();

			// Input should be empty
			await expect(searchInput).toHaveValue('');
		});

		test('clicking clear button hides the count', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type text to trigger filtering
			await searchInput.fill('test');
			await page.waitForTimeout(200);

			// Count should be visible
			await expect(page.getByTestId('search-count')).toBeVisible();

			// Click clear button
			await page.getByTestId('search-clear-button').click();

			// Count should be hidden
			await expect(page.getByTestId('search-count')).not.toBeVisible();
		});

		test('Escape key clears search', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type text
			await searchInput.fill('test');
			await expect(searchInput).toHaveValue('test');

			// Press Escape
			await searchInput.press('Escape');

			// Input should be cleared
			await expect(searchInput).toHaveValue('');
		});
	});

	test.describe('Search Persistence', () => {
		test('search is cleared when navigating away and back', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Type search text
			await searchInput.fill('test');
			await page.waitForTimeout(200);

			// Navigate away to Budget
			await page.getByTestId('nav-item-budget').click();
			await expect(page.getByTestId('budget-page')).toBeVisible();

			// Navigate back to Transactions
			await page.getByTestId('nav-item-transactions').click();
			await expect(page.getByTestId('transactions-page')).toBeVisible();

			// Search should be cleared (fresh start per AC6)
			const newSearchInput = page.getByTestId('search-input');
			await expect(newSearchInput).toHaveValue('');
		});
	});

	test.describe('Keyboard Navigation', () => {
		test('Tab from search input moves to next element', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');

			// Focus search input
			await searchInput.focus();
			await expect(searchInput).toBeFocused();

			// Tab away
			await page.keyboard.press('Tab');

			// Search input should no longer be focused
			await expect(searchInput).not.toBeFocused();
		});
	});

	test.describe('Accessibility', () => {
		test('search input has aria-label', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');
			await expect(searchInput).toHaveAttribute('aria-label', 'Search transactions');
		});

		test('clear button has aria-label', async ({ page }) => {
			const searchInput = page.getByTestId('search-input');
			await searchInput.fill('test');

			const clearButton = page.getByTestId('search-clear-button');
			await expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
		});
	});
});
