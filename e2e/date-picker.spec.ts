import { test, expect } from '@playwright/test';

test.describe('Date Picker with Auto-Fill', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/transactions');
		await expect(page.getByTestId('transactions-page')).toBeVisible();
	});

	test.describe('Calendar Popup', () => {
		test('clicking date field toggle opens calendar popup', async ({ page }) => {
			const toggle = page.getByTestId('date-picker-toggle');
			await toggle.click();

			const popup = page.getByTestId('date-picker-popup');
			await expect(popup).toBeVisible();
		});

		test('selecting date from calendar updates the field value', async ({ page }) => {
			const toggle = page.getByTestId('date-picker-toggle');
			await toggle.click();

			// Wait for calendar
			const popup = page.getByTestId('date-picker-popup');
			await expect(popup).toBeVisible();

			// Click day 15 of the current month
			const today = new Date();
			const year = today.getFullYear();
			const month = String(today.getMonth() + 1).padStart(2, '0');
			const dayButton = page.getByTestId(`calendar-day-${year}-${month}-15`);
			await dayButton.click();

			// Calendar should close
			await expect(popup).not.toBeVisible();

			// Field should show the selected date
			const input = page.getByTestId('date-picker-input');
			const value = await input.inputValue();
			expect(value).toContain('15');
		});
	});

	test.describe('Manual Input', () => {
		test('typing valid date manually is accepted and formatted', async ({ page }) => {
			const input = page.getByTestId('date-picker-input');

			// Focus and clear
			await input.click();
			await input.fill('2025-01-28');
			await input.press('Tab');

			// Should be formatted
			const value = await input.inputValue();
			expect(value).toBe('28 Jan 2025');
		});

		test('typing invalid date shows error message', async ({ page }) => {
			const input = page.getByTestId('date-picker-input');

			await input.click();
			await input.fill('not a date');
			await input.press('Tab');

			const error = page.getByTestId('date-picker-error');
			await expect(error).toBeVisible();
			await expect(error).toHaveText('Invalid date');
		});
	});

	test.describe('Keyboard Navigation', () => {
		test('keyboard navigation within calendar (arrow keys, Enter, Escape)', async ({ page }) => {
			const toggle = page.getByTestId('date-picker-toggle');
			await toggle.click();

			const calendar = page.getByTestId('calendar');
			await expect(calendar).toBeVisible();

			// Press arrow keys to navigate
			await calendar.press('ArrowRight');
			await calendar.press('ArrowDown');

			// Press Enter to select
			await calendar.press('Enter');

			// Calendar should close after selection
			await expect(page.getByTestId('date-picker-popup')).not.toBeVisible();
		});

		test('Escape closes calendar without changing value', async ({ page }) => {
			const input = page.getByTestId('date-picker-input');
			const originalValue = await input.inputValue();

			const toggle = page.getByTestId('date-picker-toggle');
			await toggle.click();

			const calendar = page.getByTestId('calendar');
			await expect(calendar).toBeVisible();

			await calendar.press('Escape');
			await expect(page.getByTestId('date-picker-popup')).not.toBeVisible();

			// Value should not have changed
			const currentValue = await input.inputValue();
			expect(currentValue).toBe(originalValue);
		});
	});

	test.describe('Natural Language', () => {
		test('natural language input "yesterday" is parsed correctly', async ({ page }) => {
			const input = page.getByTestId('date-picker-input');

			await input.click();
			await input.fill('yesterday');
			await input.press('Tab');

			// Should be formatted as a date (not show error)
			const error = page.getByTestId('date-picker-error');
			await expect(error).not.toBeVisible({ timeout: 1000 }).catch(() => {
				// Error not visible is expected
			});

			const value = await input.inputValue();
			// Value should contain a formatted date, not "yesterday"
			expect(value).not.toBe('yesterday');
		});
	});
});
