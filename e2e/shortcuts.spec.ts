import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 6.7 - Global Keyboard Shortcuts
 * Tests keyboard shortcuts for navigation, actions, and modal interaction.
 */

test.describe('Global Keyboard Shortcuts', () => {
	test.describe('Navigation Shortcuts', () => {
		test('Cmd+T from Home navigates to Transactions', async ({ page }) => {
			await page.goto('/');
			await expect(page.getByTestId('home-page')).toBeVisible();

			await page.keyboard.press('Meta+t');

			await expect(page).toHaveURL('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();
		});

		test('Cmd+U from Transactions navigates to Budget', async ({ page }) => {
			await page.goto('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();

			await page.keyboard.press('Meta+u');

			await expect(page).toHaveURL('/budget');
			await expect(page.getByTestId('budget-page')).toBeVisible();
		});

		test('Cmd+W navigates to Net Worth', async ({ page }) => {
			await page.goto('/');
			await expect(page.getByTestId('home-page')).toBeVisible();

			await page.keyboard.press('Meta+w');

			await expect(page).toHaveURL('/net-worth');
			await expect(page.getByTestId('net-worth-page')).toBeVisible();
		});
	});

	test.describe('Action Shortcuts', () => {
		test('Cmd+K from any view opens command palette', async ({ page }) => {
			await page.goto('/');
			await expect(page.getByTestId('home-page')).toBeVisible();

			await page.keyboard.press('Meta+k');

			await expect(page.getByTestId('command-palette')).toBeVisible();
		});

		test('Cmd+K toggles command palette closed', async ({ page }) => {
			await page.goto('/');

			// Open
			await page.keyboard.press('Meta+k');
			await expect(page.getByTestId('command-palette')).toBeVisible();

			// Close
			await page.keyboard.press('Meta+k');
			await expect(page.getByTestId('command-palette')).not.toBeVisible();
		});
	});

	test.describe('Modal Focus Trapping', () => {
		test('Cmd+T is blocked when command palette modal is open', async ({ page }) => {
			await page.goto('/');
			await expect(page.getByTestId('home-page')).toBeVisible();

			// Open command palette
			await page.keyboard.press('Meta+k');
			await expect(page.getByTestId('command-palette')).toBeVisible();

			// Try Cmd+T while palette is open
			await page.keyboard.press('Meta+t');

			// Should still be on home page - navigation blocked
			await expect(page).toHaveURL('/');
		});

		test('Escape closes any open modal', async ({ page }) => {
			await page.goto('/');

			// Open command palette
			await page.keyboard.press('Meta+k');
			await expect(page.getByTestId('command-palette')).toBeVisible();

			// Press Escape
			await page.keyboard.press('Escape');
			await expect(page.getByTestId('command-palette')).not.toBeVisible();
		});

		test('Escape closes shortcuts help', async ({ page }) => {
			await page.goto('/');

			// Open shortcuts help
			await page.keyboard.press('Meta+/');
			await expect(page.getByTestId('shortcuts-help')).toBeVisible();

			// Press Escape
			await page.keyboard.press('Escape');
			await expect(page.getByTestId('shortcuts-help')).not.toBeVisible();
		});
	});

	test.describe('Shortcuts Help Panel', () => {
		test('Cmd+/ opens shortcuts help panel', async ({ page }) => {
			await page.goto('/');

			await page.keyboard.press('Meta+/');
			await expect(page.getByTestId('shortcuts-help')).toBeVisible();

			// Verify it has the title
			await expect(page.getByTestId('shortcuts-help-title')).toContainText('Keyboard Shortcuts');
		});

		test('shortcuts help lists all groups', async ({ page }) => {
			await page.goto('/');

			await page.keyboard.press('Meta+/');
			await expect(page.getByTestId('shortcuts-help')).toBeVisible();

			// Verify groups exist
			await expect(page.getByTestId('shortcuts-help-group-navigation')).toBeVisible();
			await expect(page.getByTestId('shortcuts-help-group-actions')).toBeVisible();
			await expect(page.getByTestId('shortcuts-help-group-general')).toBeVisible();
		});
	});
});
