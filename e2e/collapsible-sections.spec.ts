import { test, expect } from '@playwright/test';

test.describe('Collapsible Category Sections', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/budget');
		await page.waitForSelector('[data-testid="budget-page"]');
	});

	test('should display budget page with grid', async ({ page }) => {
		const budgetPage = page.locator('[data-testid="budget-page"]');
		await expect(budgetPage).toBeVisible();
	});

	test('should have section headers when categories exist', async ({ page }) => {
		// Look for section headers - they may not exist if no categories
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		// Just verify the page is functional
		await expect(page.locator('.budget-grid-container')).toBeVisible();

		// If sections exist, verify their structure
		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			await expect(firstHeader).toBeVisible();

			// Section should have a button for collapsing
			const button = firstHeader.locator('button');
			await expect(button).toBeVisible();
		}
	});

	test('should toggle section on click', async ({ page }) => {
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			const button = firstHeader.locator('button');

			// Get initial aria-expanded state
			const initialExpanded = await button.getAttribute('aria-expanded');

			// Click to toggle
			await button.click();

			// Wait for animation (200ms) plus buffer
			await page.waitForTimeout(250);

			// Check that state changed
			const newExpanded = await button.getAttribute('aria-expanded');
			expect(newExpanded).not.toBe(initialExpanded);
		}
	});

	test('should toggle section on Enter key', async ({ page }) => {
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			const button = firstHeader.locator('button');

			// Focus the button
			await button.focus();

			// Get initial aria-expanded state
			const initialExpanded = await button.getAttribute('aria-expanded');

			// Press Enter to toggle
			await page.keyboard.press('Enter');

			// Wait for animation
			await page.waitForTimeout(250);

			// Check that state changed
			const newExpanded = await button.getAttribute('aria-expanded');
			expect(newExpanded).not.toBe(initialExpanded);
		}
	});

	test('should toggle section on Space key', async ({ page }) => {
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			const button = firstHeader.locator('button');

			// Focus the button
			await button.focus();

			// Get initial aria-expanded state
			const initialExpanded = await button.getAttribute('aria-expanded');

			// Press Space to toggle
			await page.keyboard.press('Space');

			// Wait for animation
			await page.waitForTimeout(250);

			// Check that state changed
			const newExpanded = await button.getAttribute('aria-expanded');
			expect(newExpanded).not.toBe(initialExpanded);
		}
	});

	test('should persist collapse state in localStorage', async ({ page }) => {
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			const button = firstHeader.locator('button');

			// Collapse the section
			if ((await button.getAttribute('aria-expanded')) === 'true') {
				await button.click();
				await page.waitForTimeout(250);
			}

			// Check localStorage
			const storageState = await page.evaluate(() => {
				return localStorage.getItem('stackz-budget-ui-state');
			});

			// Should have stored state (if sections exist)
			expect(storageState).not.toBeNull();
			if (storageState) {
				const parsed = JSON.parse(storageState);
				expect(parsed).toHaveProperty('collapsedSections');
			}
		}
	});

	test('should persist state after navigation', async ({ page }) => {
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			const button = firstHeader.locator('button');

			// Get section ID
			const sectionId = await firstHeader.getAttribute('data-section-id');

			// Collapse the section
			if ((await button.getAttribute('aria-expanded')) === 'true') {
				await button.click();
				await page.waitForTimeout(250);
			}

			// Navigate away
			await page.goto('/transactions');
			await page.waitForSelector('[data-testid="transactions-page"]');

			// Navigate back
			await page.goto('/budget');
			await page.waitForSelector('[data-testid="budget-page"]');

			// Check if section is still collapsed
			const headerAfterNav = page.locator(`[data-testid="section-header"][data-section-id="${sectionId}"]`);
			if (await headerAfterNav.count() > 0) {
				const buttonAfterNav = headerAfterNav.locator('button');
				const expandedAfterNav = await buttonAfterNav.getAttribute('aria-expanded');
				expect(expandedAfterNav).toBe('false');
			}
		}
	});

	test('should display collapse indicator correctly', async ({ page }) => {
		const sectionHeaders = page.locator('[data-testid="section-header"]');
		const count = await sectionHeaders.count();

		if (count > 0) {
			const firstHeader = sectionHeaders.first();
			const button = firstHeader.locator('button');

			// When expanded, should show ▼
			if ((await button.getAttribute('aria-expanded')) === 'true') {
				const indicator = firstHeader.locator('.collapse-indicator');
				await expect(indicator).toContainText('▼');
			}

			// Toggle to collapsed
			await button.click();
			await page.waitForTimeout(250);

			// When collapsed, should show ▶
			const indicatorAfter = firstHeader.locator('.collapse-indicator');
			await expect(indicatorAfter).toContainText('▶');
		}
	});
});
