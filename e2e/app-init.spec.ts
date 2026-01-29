import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 1.1 - Initialize Tauri + SvelteKit Project
 * Tests that app window opens, displays content, and design tokens are applied
 */

test.describe('App Initialization', () => {
	test('app window opens and displays content', async ({ page }) => {
		await page.goto('/');

		// Verify main content is visible
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText('Stackz');

		// Verify tagline is present
		const tagline = page.locator('p');
		await expect(tagline).toContainText('local-first personal finance');
	});

	test('Tailwind classes render correctly', async ({ page }) => {
		await page.goto('/');

		// Verify Tailwind utility classes are applied
		const accentButton = page.locator('span:has-text("Accent")');
		await expect(accentButton).toBeVisible();

		// Verify bg-accent class styles the element
		const bgColor = await accentButton.evaluate((el) => {
			return window.getComputedStyle(el).backgroundColor;
		});
		// Should have some background color applied (not transparent)
		expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
	});

	test('design tokens are applied via CSS variables', async ({ page }) => {
		await page.goto('/');

		// Get computed styles from the document root
		const rootStyles = await page.evaluate(() => {
			const root = document.documentElement;
			const styles = getComputedStyle(root);
			return {
				bgPrimary: styles.getPropertyValue('--bg-primary').trim(),
				textPrimary: styles.getPropertyValue('--text-primary').trim(),
				accent: styles.getPropertyValue('--accent').trim(),
				success: styles.getPropertyValue('--success').trim(),
				danger: styles.getPropertyValue('--danger').trim(),
				warning: styles.getPropertyValue('--warning').trim(),
			};
		});

		// Verify design tokens are defined (light mode values)
		expect(rootStyles.bgPrimary).toBe('#FFFFFF');
		expect(rootStyles.textPrimary).toBe('#1A1A1A');
		expect(rootStyles.accent).toBe('#4F46E5');
		expect(rootStyles.success).toBe('#10B981');
		expect(rootStyles.danger).toBe('#EF4444');
		expect(rootStyles.warning).toBe('#F59E0B');
	});

	test('page has correct title', async ({ page }) => {
		await page.goto('/');

		// Verify page title
		await expect(page).toHaveTitle('Stackz');
	});

	test('color-coded design token elements are visible', async ({ page }) => {
		await page.goto('/');

		// Verify all design token demonstration elements
		await expect(page.locator('span:has-text("Accent")')).toBeVisible();
		await expect(page.locator('span:has-text("Success")')).toBeVisible();
		await expect(page.locator('span:has-text("Danger")')).toBeVisible();
		await expect(page.locator('span:has-text("Warning")')).toBeVisible();
	});
});
