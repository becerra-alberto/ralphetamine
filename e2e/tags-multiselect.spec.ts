import { test, expect } from '@playwright/test';

test.describe('Tags Multi-Select', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByTestId('transactions-page')).toBeVisible();
	});

	test('clicking tags field opens multi-select dropdown', async ({ page }) => {
		const trigger = page.getByTestId('quick-add-tag-select-trigger');
		await trigger.click();

		const panel = page.getByTestId('quick-add-tag-select-panel');
		await expect(panel).toBeVisible();

		// Should show predefined tags
		await expect(page.getByTestId('quick-add-tag-select-option-personal')).toBeVisible();
		await expect(page.getByTestId('quick-add-tag-select-option-business')).toBeVisible();
		await expect(page.getByTestId('quick-add-tag-select-option-recurring')).toBeVisible();
		await expect(page.getByTestId('quick-add-tag-select-option-tax-deductible')).toBeVisible();
	});

	test('selecting multiple tags displays them as chips', async ({ page }) => {
		const trigger = page.getByTestId('quick-add-tag-select-trigger');
		await trigger.click();

		// Select Personal
		await page.getByTestId('quick-add-tag-select-option-personal').click();

		// Select Business
		await page.getByTestId('quick-add-tag-select-option-business').click();

		// Should have chips for both
		await expect(page.getByTestId('quick-add-tag-select-chip-personal')).toBeVisible();
		await expect(page.getByTestId('quick-add-tag-select-chip-business')).toBeVisible();

		// Dropdown should still be open (multi-select)
		await expect(page.getByTestId('quick-add-tag-select-panel')).toBeVisible();
	});

	test('removing tag via chip X button deselects it', async ({ page }) => {
		const trigger = page.getByTestId('quick-add-tag-select-trigger');
		await trigger.click();

		// Select a tag
		await page.getByTestId('quick-add-tag-select-option-personal').click();

		// Chip should be visible
		await expect(page.getByTestId('quick-add-tag-select-chip-personal')).toBeVisible();

		// Click remove button on chip
		const removeBtn = page.getByTestId('quick-add-tag-select-chip-personal-remove');
		await removeBtn.click();

		// Chip should be gone
		await expect(page.getByTestId('quick-add-tag-select-chip-personal')).not.toBeVisible();
	});

	test('creating new custom tag and selecting it', async ({ page }) => {
		const trigger = page.getByTestId('quick-add-tag-select-trigger');
		await trigger.click();

		const input = page.getByTestId('quick-add-tag-select-input');
		await input.fill('MyCustomTag');

		// Press Enter to create
		await input.press('Enter');

		// Custom tag should appear as chip
		await expect(page.getByTestId('quick-add-tag-select-chip-mycustomtag')).toBeVisible();
	});

	test('saved transaction preserves tag selections', async ({ page }) => {
		// Fill in required fields
		const payeeInput = page.getByTestId('autocomplete-input');
		await payeeInput.fill('Tag Test Payee');

		const amountInput = page.getByTestId('quick-add-amount');
		await amountInput.fill('50.00');

		// Select some tags
		const tagTrigger = page.getByTestId('quick-add-tag-select-trigger');
		await tagTrigger.click();

		await page.getByTestId('quick-add-tag-select-option-personal').click();
		await page.getByTestId('quick-add-tag-select-option-recurring').click();

		// Close the dropdown by pressing Escape
		const tagInput = page.getByTestId('quick-add-tag-select-input');
		await tagInput.press('Escape');

		// Save the transaction
		const saveBtn = page.getByTestId('quick-add-save');
		await saveBtn.click();

		// Success indicator should appear
		await expect(page.getByTestId('quick-add-success')).toBeVisible();
	});

	test('keyboard-only multi-selection workflow', async ({ page }) => {
		const trigger = page.getByTestId('quick-add-tag-select-trigger');

		// Open with keyboard
		await trigger.focus();
		await trigger.press('Enter');

		await expect(page.getByTestId('quick-add-tag-select-panel')).toBeVisible();

		const input = page.getByTestId('quick-add-tag-select-input');

		// Navigate down to first tag
		await input.press('ArrowDown');

		// Select with Space
		await input.press(' ');

		// Navigate down to second tag
		await input.press('ArrowDown');

		// Select with Space
		await input.press(' ');

		// Close with Escape
		await input.press('Escape');

		await expect(page.getByTestId('quick-add-tag-select-panel')).not.toBeVisible();
	});
});
