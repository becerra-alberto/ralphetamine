import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 1.5 - Setup SvelteKit Routing
 * Tests routing, page titles, 404 handling, and navigation
 */

test.describe('Routing', () => {
	test.describe('Home Route', () => {
		test('navigating to / renders Home component with correct content', async ({ page }) => {
			await page.goto('/');

			await expect(page.getByTestId('home-page')).toBeVisible();
			await expect(page.getByText('Home Dashboard')).toBeVisible();
		});

		test('page title updates to "Stackz - Home" on Home route', async ({ page }) => {
			await page.goto('/');

			await expect(page).toHaveTitle('Stackz - Home');
		});
	});

	test.describe('Budget Route', () => {
		test('navigating to /budget renders Budget component with correct content', async ({
			page
		}) => {
			await page.goto('/budget');

			await expect(page.getByTestId('budget-page')).toBeVisible();
			await expect(page.getByText('Budget View')).toBeVisible();
		});

		test('page title updates to "Stackz - Budget" on Budget route', async ({ page }) => {
			await page.goto('/budget');

			await expect(page).toHaveTitle('Stackz - Budget');
		});
	});

	test.describe('Transactions Route', () => {
		test('navigating to /transactions renders Transactions component with correct content', async ({
			page
		}) => {
			await page.goto('/transactions');

			await expect(page.getByTestId('transactions-page')).toBeVisible();
			await expect(page.getByText('Transactions View')).toBeVisible();
		});

		test('page title updates to "Stackz - Transactions" on Transactions route', async ({
			page
		}) => {
			await page.goto('/transactions');

			await expect(page).toHaveTitle('Stackz - Transactions');
		});
	});

	test.describe('Net Worth Route', () => {
		test('navigating to /net-worth renders Net Worth component with correct content', async ({
			page
		}) => {
			await page.goto('/net-worth');

			await expect(page.getByTestId('net-worth-page')).toBeVisible();
			await expect(page.getByText('Net Worth View')).toBeVisible();
		});

		test('page title updates to "Stackz - Net Worth" on Net Worth route', async ({ page }) => {
			await page.goto('/net-worth');

			await expect(page).toHaveTitle('Stackz - Net Worth');
		});
	});

	test.describe('Browser Navigation', () => {
		test('browser back button navigates to previous view', async ({ page }) => {
			// Navigate to home, then to budget
			await page.goto('/');
			await expect(page.getByTestId('home-page')).toBeVisible();

			await page.goto('/budget');
			await expect(page.getByTestId('budget-page')).toBeVisible();

			// Go back
			await page.goBack();
			await expect(page.getByTestId('home-page')).toBeVisible();
		});

		test('browser forward button navigates to next view in history', async ({ page }) => {
			// Navigate home -> budget
			await page.goto('/');
			await page.goto('/budget');

			// Go back, then forward
			await page.goBack();
			await expect(page.getByTestId('home-page')).toBeVisible();

			await page.goForward();
			await expect(page.getByTestId('budget-page')).toBeVisible();
		});

		test('sidebar active state updates when route changes via direct URL', async ({ page }) => {
			// Go directly to budget
			await page.goto('/budget');

			// Check sidebar shows budget as active
			const budgetItem = page.getByTestId('nav-item-budget');
			await expect(budgetItem).toHaveClass(/bg-accent/);
		});
	});

	test.describe('404 Error Handling', () => {
		test('navigating to /unknown shows 404 page', async ({ page }) => {
			await page.goto('/unknown');

			await expect(page.getByTestId('error-page')).toBeVisible();
			await expect(page.getByText('Page not found')).toBeVisible();
		});

		test('404 page "Home" link navigates back to /', async ({ page }) => {
			await page.goto('/unknown');

			await expect(page.getByTestId('error-home-link')).toBeVisible();

			// Click the home link
			await page.getByTestId('error-home-link').click();

			// Verify we're on home
			await expect(page).toHaveURL('/');
			await expect(page.getByTestId('home-page')).toBeVisible();
		});
	});

	test.describe('SPA Navigation', () => {
		test('SPA navigation does not trigger full page refresh', async ({ page }) => {
			await page.goto('/');

			// Track if a full navigation (not SPA) occurs
			let fullNavigation = false;
			page.on('load', () => {
				fullNavigation = true;
			});

			// Reset flag after initial load
			fullNavigation = false;

			// Navigate using sidebar (SPA navigation)
			await page.getByTestId('nav-item-budget').click();
			await expect(page.getByTestId('budget-page')).toBeVisible();

			// Small delay to ensure any load event would fire
			await page.waitForTimeout(100);

			expect(fullNavigation).toBe(false);
		});
	});
});
