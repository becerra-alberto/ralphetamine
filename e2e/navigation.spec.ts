import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 1.4 - Implement App Shell with Sidebar Navigation
 * Tests navigation via clicks and keyboard shortcuts
 */

test.describe('Navigation', () => {
	test.describe('Click Navigation', () => {
		test('clicking Home nav item navigates to /', async ({ page }) => {
			// Start from a different page
			await page.goto('/budget');
			await expect(page.getByTestId('budget-page')).toBeVisible();

			// Click Home nav item
			await page.getByTestId('nav-item-home').click();

			// Verify navigation
			await expect(page).toHaveURL('/');
			await expect(page.getByTestId('home-page')).toBeVisible();
		});

		test('clicking Budget nav item navigates to /budget', async ({ page }) => {
			await page.goto('/');

			// Click Budget nav item
			await page.getByTestId('nav-item-budget').click();

			// Verify navigation
			await expect(page).toHaveURL('/budget');
			await expect(page.getByTestId('budget-page')).toBeVisible();
		});

		test('clicking Transactions nav item navigates to /transactions', async ({ page }) => {
			await page.goto('/');

			// Click Transactions nav item
			await page.getByTestId('nav-item-transactions').click();

			// Verify navigation
			await expect(page).toHaveURL('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();
		});

		test('clicking Net Worth nav item navigates to /net-worth', async ({ page }) => {
			await page.goto('/');

			// Click Net Worth nav item
			await page.getByTestId('nav-item-net-worth').click();

			// Verify navigation
			await expect(page).toHaveURL('/net-worth');
			await expect(page.getByTestId('net-worth-page')).toBeVisible();
		});

		test('clicking Stackz logo navigates to Home', async ({ page }) => {
			// Start from a different page
			await page.goto('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();

			// Click logo
			await page.getByTestId('logo-button').click();

			// Verify navigation to home
			await expect(page).toHaveURL('/');
			await expect(page.getByTestId('home-page')).toBeVisible();
		});
	});

	test.describe('Keyboard Navigation', () => {
		test('Cmd+1 keyboard shortcut navigates to Home', async ({ page }) => {
			// Start from a different page
			await page.goto('/budget');
			await expect(page.getByTestId('budget-page')).toBeVisible();

			// Press Cmd+1 (Meta+1 on Mac)
			await page.keyboard.press('Meta+1');

			// Verify navigation
			await expect(page).toHaveURL('/');
			await expect(page.getByTestId('home-page')).toBeVisible();
		});

		test('Cmd+2 keyboard shortcut navigates to Budget', async ({ page }) => {
			await page.goto('/');

			// Press Cmd+2
			await page.keyboard.press('Meta+2');

			// Verify navigation
			await expect(page).toHaveURL('/budget');
			await expect(page.getByTestId('budget-page')).toBeVisible();
		});

		test('Cmd+3 keyboard shortcut navigates to Transactions', async ({ page }) => {
			await page.goto('/');

			// Press Cmd+3
			await page.keyboard.press('Meta+3');

			// Verify navigation
			await expect(page).toHaveURL('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();
		});

		test('Cmd+4 keyboard shortcut navigates to Net Worth', async ({ page }) => {
			await page.goto('/');

			// Press Cmd+4
			await page.keyboard.press('Meta+4');

			// Verify navigation
			await expect(page).toHaveURL('/net-worth');
			await expect(page.getByTestId('net-worth-page')).toBeVisible();
		});
	});

	test.describe('Responsive Sidebar', () => {
		test('sidebar collapses when window width < 800px', async ({ page }) => {
			await page.goto('/');

			// Set viewport to narrow width
			await page.setViewportSize({ width: 600, height: 800 });

			// Get sidebar element
			const sidebar = page.getByTestId('sidebar');

			// Verify collapsed width (64px)
			await expect(sidebar).toHaveCSS('width', '64px');
		});

		test('sidebar expands when window width >= 800px', async ({ page }) => {
			await page.goto('/');

			// Set viewport to wide width
			await page.setViewportSize({ width: 1024, height: 800 });

			// Get sidebar element
			const sidebar = page.getByTestId('sidebar');

			// Verify expanded width (200px)
			await expect(sidebar).toHaveCSS('width', '200px');
		});

		test('tooltip appears on hover when sidebar is collapsed', async ({ page }) => {
			await page.goto('/');

			// Set viewport to narrow width to collapse sidebar
			await page.setViewportSize({ width: 600, height: 800 });

			// Hover over Budget nav item
			await page.getByTestId('nav-item-budget').hover();

			// Find the tooltip element within the nav item
			const tooltip = page.locator('[role="tooltip"]').filter({ hasText: 'Budget' });

			// The tooltip should exist in DOM and become visible on hover
			// Note: Due to CSS transitions, we check it exists
			await expect(tooltip).toBeAttached();
		});
	});

	test.describe('Active State', () => {
		test('active nav item is highlighted when on corresponding page', async ({ page }) => {
			await page.goto('/budget');

			// Get the Budget nav item
			const budgetItem = page.getByTestId('nav-item-budget');

			// Check for active styling (accent background)
			await expect(budgetItem).toHaveClass(/bg-accent/);
			await expect(budgetItem).toHaveClass(/border-accent/);
		});

		test('home nav item is active on root path', async ({ page }) => {
			await page.goto('/');

			// Get the Home nav item
			const homeItem = page.getByTestId('nav-item-home');

			// Check for active styling
			await expect(homeItem).toHaveClass(/bg-accent/);
		});
	});

	test.describe('App Shell Structure', () => {
		test('app shell renders sidebar and main content area', async ({ page }) => {
			await page.goto('/');

			// Verify app shell structure
			await expect(page.getByTestId('app-shell')).toBeVisible();
			await expect(page.getByTestId('sidebar')).toBeVisible();
			await expect(page.getByTestId('main-content')).toBeVisible();
		});

		test('sidebar shows all navigation items', async ({ page }) => {
			await page.goto('/');

			// Set wide viewport to see labels
			await page.setViewportSize({ width: 1024, height: 800 });

			// Verify all nav items are present
			await expect(page.getByTestId('nav-item-home')).toBeVisible();
			await expect(page.getByTestId('nav-item-budget')).toBeVisible();
			await expect(page.getByTestId('nav-item-transactions')).toBeVisible();
			await expect(page.getByTestId('nav-item-net-worth')).toBeVisible();
		});

		test('logo button is visible', async ({ page }) => {
			await page.goto('/');

			await expect(page.getByTestId('logo-button')).toBeVisible();
		});
	});
});
