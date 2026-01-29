import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 4.1 - Transaction List View
 * Tests the transaction table display, pagination, sorting, and interactions
 */

test.describe('Transaction List View', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
	});

	test.describe('Page Structure', () => {
		test('renders the transactions page with correct structure', async ({ page }) => {
			await expect(page.getByTestId('transactions-page')).toBeVisible();
			await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
		});

		test('renders the transaction table', async ({ page }) => {
			await expect(page.getByTestId('transaction-table')).toBeVisible();
		});

		test('renders all column headers', async ({ page }) => {
			await expect(page.getByTestId('header-date')).toBeVisible();
			await expect(page.getByTestId('header-payee')).toBeVisible();
			await expect(page.getByTestId('header-category')).toBeVisible();
			await expect(page.getByTestId('header-memo')).toBeVisible();
			await expect(page.getByTestId('header-outflow')).toBeVisible();
			await expect(page.getByTestId('header-inflow')).toBeVisible();
			await expect(page.getByTestId('header-account')).toBeVisible();
			await expect(page.getByTestId('header-tags')).toBeVisible();
		});
	});

	test.describe('Empty State', () => {
		test('shows empty state when no transactions exist', async ({ page }) => {
			const emptyState = page.getByTestId('empty-state');
			const table = page.locator('table.transaction-table');

			// Either empty state is visible or table exists (depending on data)
			const hasEmptyState = await emptyState.isVisible().catch(() => false);
			const hasTable = await table.isVisible().catch(() => false);

			expect(hasEmptyState || hasTable).toBe(true);
		});

		test('empty state displays appropriate message', async ({ page }) => {
			const emptyState = page.getByTestId('empty-state');

			if (await emptyState.isVisible().catch(() => false)) {
				await expect(emptyState).toContainText('No transactions');
			}
		});
	});

	test.describe('Table Headers', () => {
		test('sortable columns have sort indicators', async ({ page }) => {
			const sortableHeaders = ['date', 'payee', 'category', 'outflow', 'inflow', 'account'];

			for (const header of sortableHeaders) {
				const headerElement = page.getByTestId(`header-${header}`);
				await expect(headerElement).toHaveClass(/sortable/);
			}
		});

		test('non-sortable columns do not have sort indicators', async ({ page }) => {
			const memoHeader = page.getByTestId('header-memo');
			const tagsHeader = page.getByTestId('header-tags');

			await expect(memoHeader).not.toHaveClass(/sortable/);
			await expect(tagsHeader).not.toHaveClass(/sortable/);
		});

		test('clicking sortable header triggers sort', async ({ page }) => {
			const dateHeader = page.getByTestId('header-date');
			await dateHeader.click();
			await expect(dateHeader).toHaveClass(/sorted/);
		});
	});

	test.describe('Sorting Interaction', () => {
		test('clicking Date header sorts by date', async ({ page }) => {
			const dateHeader = page.getByTestId('header-date');
			await dateHeader.click();
			await expect(dateHeader).toHaveClass(/sorted/);
			await expect(dateHeader).toHaveAttribute('aria-sort', /(ascending|descending)/);
		});

		test('clicking sorted header toggles sort direction', async ({ page }) => {
			const dateHeader = page.getByTestId('header-date');

			await dateHeader.click();
			const firstSort = await dateHeader.getAttribute('aria-sort');

			await dateHeader.click();
			const secondSort = await dateHeader.getAttribute('aria-sort');

			expect(firstSort).not.toBe(secondSort);
		});

		test('clicking different column changes sort column', async ({ page }) => {
			const dateHeader = page.getByTestId('header-date');
			const payeeHeader = page.getByTestId('header-payee');

			await dateHeader.click();
			await expect(dateHeader).toHaveClass(/sorted/);

			await payeeHeader.click();
			await expect(payeeHeader).toHaveClass(/sorted/);
			await expect(dateHeader).not.toHaveClass(/sorted/);
		});

		test('keyboard navigation on sortable headers works', async ({ page }) => {
			const dateHeader = page.getByTestId('header-date');
			await dateHeader.focus();
			await page.keyboard.press('Enter');
			await expect(dateHeader).toHaveClass(/sorted/);
		});

		test('space key triggers sort on focused header', async ({ page }) => {
			const payeeHeader = page.getByTestId('header-payee');
			await payeeHeader.focus();
			await page.keyboard.press('Space');
			await expect(payeeHeader).toHaveClass(/sorted/);
		});
	});

	test.describe('Pagination', () => {
		test('pagination component is rendered', async ({ page }) => {
			await expect(page.getByTestId('pagination')).toBeVisible();
		});

		test('pagination shows item count info', async ({ page }) => {
			const paginationInfo = page.getByTestId('pagination-info');
			await expect(paginationInfo).toBeVisible();
		});

		test('pagination shows page indicator', async ({ page }) => {
			const pageIndicator = page.getByTestId('page-indicator');
			await expect(pageIndicator).toBeVisible();
			await expect(pageIndicator).toContainText(/Page \d+ of \d+/);
		});

		test('previous button is disabled on first page', async ({ page }) => {
			const prevButton = page.getByTestId('pagination-prev');
			await expect(prevButton).toBeDisabled();
		});

		test('next button state depends on total pages', async ({ page }) => {
			const nextButton = page.getByTestId('pagination-next');
			const pageIndicator = page.getByTestId('page-indicator');

			const pageText = await pageIndicator.textContent();
			const match = pageText?.match(/Page (\d+) of (\d+)/);

			if (match) {
				const [, current, total] = match;
				if (current === total) {
					await expect(nextButton).toBeDisabled();
				} else {
					await expect(nextButton).not.toBeDisabled();
				}
			}
		});
	});

	test.describe('URL State Management', () => {
		test('sort parameter updates URL', async ({ page }) => {
			const payeeHeader = page.getByTestId('header-payee');
			await payeeHeader.click();
			await expect(page).toHaveURL(/sort=payee/);
		});

		test('initial state loads from URL parameters', async ({ page }) => {
			await page.goto('/transactions?sort=payee&order=asc');

			const payeeHeader = page.getByTestId('header-payee');
			await expect(payeeHeader).toHaveClass(/sorted/);
			await expect(payeeHeader).toHaveAttribute('aria-sort', 'ascending');
		});
	});

	test.describe('Accessibility', () => {
		test('table has proper ARIA attributes', async ({ page }) => {
			const table = page.locator('table.transaction-table');

			if (await table.isVisible()) {
				await expect(table).toHaveAttribute('role', 'grid');
				await expect(table).toHaveAttribute('aria-label', 'Transaction list');
			}
		});

		test('sortable headers are keyboard focusable', async ({ page }) => {
			const dateHeader = page.getByTestId('header-date');
			await expect(dateHeader).toHaveAttribute('tabindex', '0');
		});

		test('non-sortable headers are not keyboard focusable', async ({ page }) => {
			const memoHeader = page.getByTestId('header-memo');
			await expect(memoHeader).toHaveAttribute('tabindex', '-1');
		});

		test('pagination buttons have aria-labels', async ({ page }) => {
			const prevButton = page.getByTestId('pagination-prev');
			const nextButton = page.getByTestId('pagination-next');

			await expect(prevButton).toHaveAttribute('aria-label', 'Previous page');
			await expect(nextButton).toHaveAttribute('aria-label', 'Next page');
		});
	});

	test.describe('Navigation Integration', () => {
		test('can navigate to transactions via sidebar', async ({ page }) => {
			await page.goto('/');
			await page.getByTestId('nav-item-transactions').click();

			await expect(page).toHaveURL('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();
		});

		test('transactions nav item shows active state', async ({ page }) => {
			const transactionsNavItem = page.getByTestId('nav-item-transactions');
			await expect(transactionsNavItem).toHaveClass(/bg-accent/);
		});

		test('Cmd+3 keyboard shortcut navigates to transactions', async ({ page }) => {
			await page.goto('/');
			await page.keyboard.press('Meta+3');

			await expect(page).toHaveURL('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();
		});
	});
});
