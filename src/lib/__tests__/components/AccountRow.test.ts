import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AccountRow from '../../components/net-worth/AccountRow.svelte';
import type { AccountWithBalance } from '../../api/netWorth';

const baseAccount: AccountWithBalance = {
	id: 'acct-1',
	name: 'Main Checking',
	type: 'checking',
	institution: 'ING',
	currency: 'EUR',
	isActive: true,
	includeInNetWorth: true,
	balanceCents: 150000,
	lastBalanceUpdate: '2025-06-01',
	bankNumber: null,
	country: null
};

describe('AccountRow', () => {
	it('should render account name and balance', () => {
		render(AccountRow, {
			props: { account: baseAccount, testId: 'acct-row' }
		});
		expect(screen.getByTestId('acct-row-name').textContent).toBe('Main Checking');
		expect(screen.getByTestId('acct-row-balance')).toBeTruthy();
	});

	it('should show masked bank_number in non-edit mode', () => {
		const account: AccountWithBalance = {
			...baseAccount,
			bankNumber: 'NL82BUNQ2071504690'
		};
		render(AccountRow, {
			props: { account, testId: 'acct-row' }
		});
		const bankEl = screen.getByTestId('acct-row-bank-number');
		expect(bankEl.textContent).toBe('NL82...4690');
	});

	it('should not show bank_number element when null', () => {
		render(AccountRow, {
			props: { account: baseAccount, testId: 'acct-row' }
		});
		expect(screen.queryByTestId('acct-row-bank-number')).toBeNull();
	});

	it('should show country badge when country is set', () => {
		const account: AccountWithBalance = {
			...baseAccount,
			country: 'NL'
		};
		render(AccountRow, {
			props: { account, testId: 'acct-row' }
		});
		const countryEl = screen.getByTestId('acct-row-country');
		expect(countryEl.textContent).toBe('NL');
	});

	it('should not show country badge when country is null', () => {
		render(AccountRow, {
			props: { account: baseAccount, testId: 'acct-row' }
		});
		expect(screen.queryByTestId('acct-row-country')).toBeNull();
	});

	it('should render edit form with bank_number and country fields when editing', async () => {
		const account: AccountWithBalance = {
			...baseAccount,
			bankNumber: 'NL82BUNQ2071504690',
			country: 'NL'
		};
		render(AccountRow, {
			props: { account, editable: true, testId: 'acct-row' }
		});

		// Click the menu to start editing
		const menuBtn = screen.getByTestId('acct-row-menu-btn');
		await menuBtn.click();

		const editBtn = screen.getByTestId('acct-row-menu-edit');
		await editBtn.click();

		// Verify bank_number and country fields are present in the edit form
		expect(screen.getByTestId('acct-row-edit-bank-number')).toBeTruthy();
		expect(screen.getByTestId('acct-row-edit-country')).toBeTruthy();

		// Verify they are pre-populated
		const bankInput = screen.getByTestId('acct-row-edit-bank-number') as HTMLInputElement;
		expect(bankInput.value).toBe('NL82BUNQ2071504690');

		const countrySelect = screen.getByTestId('acct-row-edit-country') as HTMLSelectElement;
		expect(countrySelect.value).toBe('NL');
	});
});
