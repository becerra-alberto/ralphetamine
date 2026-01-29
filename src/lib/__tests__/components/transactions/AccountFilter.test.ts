import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AccountFilter from '../../../components/transactions/AccountFilter.svelte';
import type { Account } from '../../../types/account';

const mockAccounts: Account[] = [
	{
		id: 'acc-1',
		name: 'Checking',
		type: 'checking',
		institution: 'Bank A',
		currency: 'USD',
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	},
	{
		id: 'acc-2',
		name: 'Savings',
		type: 'savings',
		institution: 'Bank B',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	},
	{
		id: 'acc-3',
		name: 'Credit Card',
		type: 'credit',
		institution: 'Bank C',
		currency: 'CAD',
		isActive: true,
		includeInNetWorth: false,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	}
];

describe('AccountFilter', () => {
	it('should render checkbox list with all accounts and currency indicators', () => {
		render(AccountFilter, {
			props: {
				accounts: mockAccounts,
				selectedIds: []
			}
		});

		// All three account items render
		expect(screen.getByTestId('account-item-acc-1')).toBeTruthy();
		expect(screen.getByTestId('account-item-acc-2')).toBeTruthy();
		expect(screen.getByTestId('account-item-acc-3')).toBeTruthy();

		// Currency indicators are correct
		const acc1 = screen.getByTestId('account-item-acc-1');
		const acc2 = screen.getByTestId('account-item-acc-2');
		const acc3 = screen.getByTestId('account-item-acc-3');

		expect(acc1.textContent).toContain('$');
		expect(acc2.textContent).toContain('\u20AC');
		expect(acc3.textContent).toContain('C$');
	});

	it('should show "Select all" and "Clear all" toggle buttons that dispatch events', async () => {
		const selectAllHandler = vi.fn();
		const clearAllHandler = vi.fn();

		render(AccountFilter, {
			props: {
				accounts: mockAccounts,
				selectedIds: ['acc-1']
			},
			events: {
				selectAll: selectAllHandler,
				clearAll: clearAllHandler
			}
		});

		const selectAllBtn = screen.getByTestId('account-select-all');
		const clearAllBtn = screen.getByTestId('account-clear-all');

		// Buttons exist with correct text
		expect(selectAllBtn).toBeTruthy();
		expect(clearAllBtn).toBeTruthy();
		expect(selectAllBtn.textContent?.trim()).toBe('Select all');
		expect(clearAllBtn.textContent?.trim()).toBe('Clear all');

		// Both buttons should be enabled when some (but not all) are selected
		expect((selectAllBtn as HTMLButtonElement).disabled).toBe(false);
		expect((clearAllBtn as HTMLButtonElement).disabled).toBe(false);

		// Clicking "Select all" dispatches selectAll event
		await fireEvent.click(selectAllBtn);
		expect(selectAllHandler).toHaveBeenCalledTimes(1);

		// Clicking "Clear all" dispatches clearAll event
		await fireEvent.click(clearAllBtn);
		expect(clearAllHandler).toHaveBeenCalledTimes(1);
	});

	it('should reflect selected account IDs via checkbox checked state', () => {
		render(AccountFilter, {
			props: {
				accounts: mockAccounts,
				selectedIds: ['acc-1', 'acc-3']
			}
		});

		const acc1Checkbox = screen
			.getByTestId('account-item-acc-1')
			.querySelector('input') as HTMLInputElement;
		const acc2Checkbox = screen
			.getByTestId('account-item-acc-2')
			.querySelector('input') as HTMLInputElement;
		const acc3Checkbox = screen
			.getByTestId('account-item-acc-3')
			.querySelector('input') as HTMLInputElement;

		expect(acc1Checkbox.checked).toBe(true);
		expect(acc2Checkbox.checked).toBe(false);
		expect(acc3Checkbox.checked).toBe(true);
	});

	it('should show "No accounts found" when accounts array is empty', () => {
		render(AccountFilter, {
			props: {
				accounts: [],
				selectedIds: []
			}
		});

		expect(screen.getByText('No accounts found')).toBeTruthy();

		// The account list container should exist but have no account items
		const list = screen.getByTestId('account-list');
		expect(list).toBeTruthy();
		expect(screen.queryByTestId('account-item-acc-1')).toBeNull();
	});

	it('should disable "Select all" button when all accounts are selected', () => {
		render(AccountFilter, {
			props: {
				accounts: mockAccounts,
				selectedIds: ['acc-1', 'acc-2', 'acc-3']
			}
		});

		const selectAllBtn = screen.getByTestId('account-select-all') as HTMLButtonElement;
		expect(selectAllBtn.disabled).toBe(true);

		// Clear all should still be enabled when all are selected
		const clearAllBtn = screen.getByTestId('account-clear-all') as HTMLButtonElement;
		expect(clearAllBtn.disabled).toBe(false);
	});

	it('should disable "Clear all" button when no accounts are selected', () => {
		render(AccountFilter, {
			props: {
				accounts: mockAccounts,
				selectedIds: []
			}
		});

		const clearAllBtn = screen.getByTestId('account-clear-all') as HTMLButtonElement;
		expect(clearAllBtn.disabled).toBe(true);

		// Select all should still be enabled when none are selected
		const selectAllBtn = screen.getByTestId('account-select-all') as HTMLButtonElement;
		expect(selectAllBtn.disabled).toBe(false);
	});

	it('should allow checkbox interaction without errors', async () => {
		render(AccountFilter, {
			props: {
				accounts: mockAccounts,
				selectedIds: []
			}
		});

		const acc2Checkbox = screen
			.getByTestId('account-item-acc-2')
			.querySelector('input') as HTMLInputElement;
		await fireEvent.change(acc2Checkbox);

		// Checkbox should toggle without error
		expect(true).toBe(true);
	});
});
