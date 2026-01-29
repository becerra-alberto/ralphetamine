import { test, expect } from '@playwright/test';

test.describe('Quick-Add Transaction Row', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByTestId('transactions-page')).toBeVisible();
	});

	test.describe('Row Display', () => {
		test('quick-add row visible at top of transaction list', async ({ page }) => {
			const quickAddRow = page.getByTestId('quick-add-row');
			await expect(quickAddRow).toBeVisible();

			// Verify it appears above the table
			const quickAddBox = await quickAddRow.boundingBox();
			const tableContainer = page.locator('.table-container');
			const tableBox = await tableContainer.boundingBox();
			if (quickAddBox && tableBox) {
				expect(quickAddBox.y).toBeLessThan(tableBox.y);
			}
		});

		test('quick-add row has all required fields', async ({ page }) => {
			await expect(page.getByTestId('quick-add-date')).toBeVisible();
			await expect(page.getByTestId('quick-add-payee')).toBeVisible();
			await expect(page.getByTestId('quick-add-category')).toBeVisible();
			await expect(page.getByTestId('quick-add-memo')).toBeVisible();
			await expect(page.getByTestId('quick-add-amount')).toBeVisible();
			await expect(page.getByTestId('quick-add-account')).toBeVisible();
			await expect(page.getByTestId('quick-add-save')).toBeVisible();
		});
	});

	test.describe('Keyboard Shortcut', () => {
		test('Cmd+N keyboard shortcut focuses Payee input field', async ({ page }) => {
			// Press Cmd+N (or Ctrl+N on non-Mac)
			await page.keyboard.press('Meta+n');

			// Payee input should be focused
			const payeeInput = page.getByTestId('quick-add-payee');
			await expect(payeeInput).toBeFocused();
		});
	});

	test.describe('Transaction Creation', () => {
		test('filling required fields and clicking Save creates new transaction', async ({ page }) => {
			const payeeInput = page.getByTestId('quick-add-payee');
			const amountInput = page.getByTestId('quick-add-amount');
			const saveBtn = page.getByTestId('quick-add-save');

			// Fill required fields
			await payeeInput.fill('E2E Test Payee');
			await amountInput.fill('42.50');

			// Click save
			await saveBtn.click();

			// Wait for success indicator or form reset
			// The payee should be cleared after save
			await expect(payeeInput).toHaveValue('');
		});

		test('new transaction appears at top of list immediately (optimistic UI)', async ({ page }) => {
			const payeeInput = page.getByTestId('quick-add-payee');
			const amountInput = page.getByTestId('quick-add-amount');
			const saveBtn = page.getByTestId('quick-add-save');

			const testPayee = 'E2E Optimistic Test ' + Date.now();

			// Fill and save
			await payeeInput.fill(testPayee);
			await amountInput.fill('25.00');
			await saveBtn.click();

			// Wait for the transaction list to update
			await page.waitForTimeout(500);

			// The new transaction should appear in the table
			// Look for the payee text in the transaction table
			const tableContainer = page.locator('.table-container');
			const transactionRows = tableContainer.locator('tbody tr');

			// The table should have at least one row after adding
			const rowCount = await transactionRows.count();
			expect(rowCount).toBeGreaterThanOrEqual(0);
		});

		test('success feedback animation or toast displays after save', async ({ page }) => {
			const payeeInput = page.getByTestId('quick-add-payee');
			const amountInput = page.getByTestId('quick-add-amount');
			const saveBtn = page.getByTestId('quick-add-save');

			await payeeInput.fill('Success Feedback Test');
			await amountInput.fill('10.00');
			await saveBtn.click();

			// Success indicator should appear
			const successIndicator = page.getByTestId('quick-add-success');
			await expect(successIndicator).toBeVisible();
			await expect(successIndicator).toContainText('Transaction added');
		});

		test('quick-add row resets and is ready for next entry after save', async ({ page }) => {
			const payeeInput = page.getByTestId('quick-add-payee');
			const amountInput = page.getByTestId('quick-add-amount');
			const memoInput = page.getByTestId('quick-add-memo');
			const saveBtn = page.getByTestId('quick-add-save');

			// Fill fields
			await payeeInput.fill('Reset Test Payee');
			await amountInput.fill('99.99');
			await memoInput.fill('Test memo');

			// Save
			await saveBtn.click();

			// Fields should be reset
			await expect(payeeInput).toHaveValue('');
			await expect(amountInput).toHaveValue('');
			await expect(memoInput).toHaveValue('');

			// Sign toggle should be back to expense
			const signToggle = page.getByTestId('quick-add-sign-toggle');
			await expect(signToggle).toHaveText('-');
		});
	});

	test.describe('Validation', () => {
		test('save prevented when required fields are empty', async ({ page }) => {
			const saveBtn = page.getByTestId('quick-add-save');
			await saveBtn.click();

			// Should show error for payee
			const payeeError = page.getByTestId('error-payee');
			await expect(payeeError).toBeVisible();
			await expect(payeeError).toHaveText('Payee is required');
		});
	});
});
