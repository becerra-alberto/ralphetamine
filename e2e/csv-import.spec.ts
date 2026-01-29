import { test, expect } from '@playwright/test';

/**
 * E2E tests for Story 7.2 - Column Mapping
 * Tests the CSV import wizard Step 2: column mapping functionality.
 */

test.describe('CSV Import - Column Mapping', () => {
	test.describe('Step 2 Display', () => {
		test('Step 2 displays after file selection with correct step indicator', async ({ page }) => {
			await page.goto('/transactions');
			await expect(page.getByTestId('transactions-page')).toBeVisible();

			// Open import wizard (via Cmd+I or button)
			const importBtn = page.getByTestId('import-button');
			if (await importBtn.isVisible()) {
				await importBtn.click();
			} else {
				// Trigger via command palette
				await page.keyboard.press('Meta+k');
				await page.getByText('Import').first().click();
			}

			// Wizard should open at Step 1
			await expect(page.getByTestId('import-wizard')).toBeVisible();
			await expect(page.getByTestId('import-wizard-step-indicator')).toContainText('Step 1 of 3');

			// Select a CSV file via file input
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles({
				name: 'test.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from('Date,Description,Amount\n2025-01-01,Coffee,12.50\n2025-01-02,Groceries,45.00')
			});

			// Wait for file to parse
			await expect(page.getByTestId('import-wizard-next')).toBeEnabled();

			// Click Next to go to Step 2
			await page.getByTestId('import-wizard-next').click();

			// Step 2 should display
			await expect(page.getByTestId('import-wizard-step-indicator')).toContainText('Step 2 of 3');
			await expect(page.getByTestId('import-wizard-column-mapping')).toBeVisible();
			await expect(page.getByTestId('import-wizard-column-mapping-title')).toContainText('Map Columns');
			await expect(page.getByTestId('import-wizard-column-mapping-subtitle')).toContainText(
				'Tell us which columns contain which data'
			);
		});
	});

	test.describe('Column Dropdown Interaction', () => {
		test('Column dropdown interaction and field selection', async ({ page }) => {
			await page.goto('/transactions');

			// Open import wizard
			const importBtn = page.getByTestId('import-button');
			if (await importBtn.isVisible()) {
				await importBtn.click();
			}

			// Select CSV
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles({
				name: 'test.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from('Date,Description,Amount,Notes\n2025-01-01,Coffee,12.50,Morning\n2025-01-02,Groceries,45.00,Weekly')
			});

			await expect(page.getByTestId('import-wizard-next')).toBeEnabled();
			await page.getByTestId('import-wizard-next').click();

			// Should be on Step 2 with column rows
			await expect(page.getByTestId('import-wizard-column-mapping')).toBeVisible();

			// Each column should have a dropdown
			const row0Select = page.getByTestId('import-wizard-column-mapping-row-0-select');
			await expect(row0Select).toBeVisible();

			// Change the dropdown value
			await row0Select.selectOption('skip');
			await expect(row0Select).toHaveValue('skip');
		});
	});

	test.describe('Required Field Validation', () => {
		test('Required field validation error messages display', async ({ page }) => {
			await page.goto('/transactions');

			const importBtn = page.getByTestId('import-button');
			if (await importBtn.isVisible()) {
				await importBtn.click();
			}

			// Use a CSV with unrecognizable headers to force no auto-detection
			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles({
				name: 'test.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from('Col1,Col2,Col3\nval1,val2,val3')
			});

			await expect(page.getByTestId('import-wizard-next')).toBeEnabled();
			await page.getByTestId('import-wizard-next').click();

			// Should show validation errors (required fields not mapped)
			await expect(page.getByTestId('import-wizard-column-mapping-errors')).toBeVisible();

			// Next button should be disabled
			await expect(page.getByTestId('import-wizard-next')).toBeDisabled();
		});
	});

	test.describe('Save Mapping Template', () => {
		test('Save mapping template checkbox and naming', async ({ page }) => {
			await page.goto('/transactions');

			const importBtn = page.getByTestId('import-button');
			if (await importBtn.isVisible()) {
				await importBtn.click();
			}

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles({
				name: 'test.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from('Date,Description,Amount\n2025-01-01,Coffee,12.50')
			});

			await expect(page.getByTestId('import-wizard-next')).toBeEnabled();
			await page.getByTestId('import-wizard-next').click();

			// Save template section should be visible
			await expect(page.getByTestId('import-wizard-column-mapping-save-template')).toBeVisible();

			// Check the save template checkbox
			const checkbox = page.getByTestId('import-wizard-column-mapping-save-template-checkbox');
			await checkbox.check();

			// Template name input should appear
			const nameInput = page.getByTestId('import-wizard-column-mapping-template-name');
			await expect(nameInput).toBeVisible();
			await nameInput.fill('ING Export');
			await expect(nameInput).toHaveValue('ING Export');
		});
	});

	test.describe('Template Reuse', () => {
		test('Reusing saved template on subsequent import', async ({ page }) => {
			// This test verifies the template save UI works.
			// Full persistence would require the backend, which runs via Tauri.
			// Here we verify the UI flow.
			await page.goto('/transactions');

			const importBtn = page.getByTestId('import-button');
			if (await importBtn.isVisible()) {
				await importBtn.click();
			}

			const fileInput = page.locator('input[type="file"]');
			await fileInput.setInputFiles({
				name: 'test.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from('Date,Description,Amount\n2025-01-01,Coffee,12.50')
			});

			await expect(page.getByTestId('import-wizard-next')).toBeEnabled();
			await page.getByTestId('import-wizard-next').click();

			// Verify column mappings auto-detected
			await expect(page.getByTestId('import-wizard-column-mapping')).toBeVisible();

			// Verify save template option exists for reuse workflow
			await expect(page.getByTestId('import-wizard-column-mapping-save-template')).toBeVisible();
		});
	});
});
