import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import AccountRow from '../../../components/net-worth/AccountRow.svelte';
import type { AccountWithBalance } from '../../../api/netWorth';

const eurAccount: AccountWithBalance = {
	id: 'acc-1',
	name: 'Main Checking',
	type: 'checking',
	institution: 'ING',
	currency: 'EUR',
	isActive: true,
	includeInNetWorth: true,
	balanceCents: 350000,
	lastBalanceUpdate: null
};

const usdAccount: AccountWithBalance = {
	id: 'acc-2',
	name: 'US Brokerage',
	type: 'investment',
	institution: 'Interactive Brokers',
	currency: 'USD',
	isActive: true,
	includeInNetWorth: true,
	balanceCents: 1000000,
	lastBalanceUpdate: null
};

const noInstitution: AccountWithBalance = {
	id: 'acc-3',
	name: 'Cash Wallet',
	type: 'cash',
	institution: '',
	currency: 'EUR',
	isActive: true,
	includeInNetWorth: true,
	balanceCents: 5000,
	lastBalanceUpdate: null
};

describe('AccountRow', () => {
	it('should display account name', () => {
		render(AccountRow, { props: { account: eurAccount } });

		const name = screen.getByTestId('account-row-name');
		expect(name.textContent).toBe('Main Checking');
	});

	it('should display institution', () => {
		render(AccountRow, { props: { account: eurAccount } });

		const institution = screen.getByTestId('account-row-institution');
		expect(institution.textContent).toBe('ING');
	});

	it('should display formatted balance', () => {
		render(AccountRow, { props: { account: eurAccount } });

		const balance = screen.getByTestId('account-row-balance');
		expect(balance.textContent).toContain('3,500.00');
	});

	it('should not show currency badge for EUR accounts', () => {
		render(AccountRow, { props: { account: eurAccount } });

		expect(screen.queryByTestId('account-row-currency')).toBeNull();
	});

	it('should show currency badge for non-EUR accounts', () => {
		render(AccountRow, { props: { account: usdAccount } });

		const badge = screen.getByTestId('account-row-currency');
		expect(badge.textContent).toBe('USD');
	});

	it('should format USD amounts correctly', () => {
		render(AccountRow, { props: { account: usdAccount } });

		const balance = screen.getByTestId('account-row-balance');
		expect(balance.textContent).toContain('10,000.00');
	});

	it('should hide institution when empty', () => {
		render(AccountRow, { props: { account: noInstitution } });

		expect(screen.queryByTestId('account-row-institution')).toBeNull();
	});

	it('should accept custom testId', () => {
		render(AccountRow, { props: { account: eurAccount, testId: 'custom-row' } });

		expect(screen.getByTestId('custom-row')).toBeTruthy();
		expect(screen.getByTestId('custom-row-name')).toBeTruthy();
	});

	it('should not show updated date when lastBalanceUpdate is null', () => {
		render(AccountRow, { props: { account: eurAccount } });

		expect(screen.queryByTestId('account-row-updated')).toBeNull();
	});

	it('should display "Updated: 28 Jan 2025" date format when lastBalanceUpdate is set', () => {
		const accountWithUpdate: AccountWithBalance = {
			...eurAccount,
			lastBalanceUpdate: '2025-01-28T10:30:00'
		};

		render(AccountRow, { props: { account: accountWithUpdate } });

		const updated = screen.getByTestId('account-row-updated');
		expect(updated.textContent).toBe('Updated: 28 Jan 2025');
	});

	it('should display absolute balance when showAbsoluteBalance is true', () => {
		const liability: AccountWithBalance = {
			...eurAccount,
			balanceCents: -75000
		};

		render(AccountRow, { props: { account: liability, showAbsoluteBalance: true } });

		const balance = screen.getByTestId('account-row-balance');
		expect(balance.textContent).toContain('750.00');
		// Should not contain negative sign
		expect(balance.textContent).not.toContain('-');
	});

	describe('delete confirmation', () => {
		it('should open ConfirmDialog when clicking Delete in kebab menu (not dispatch immediately)', async () => {
			let deleteCalled = false;

			render(AccountRow, {
				props: { account: eurAccount, editable: true },
				events: { delete: () => { deleteCalled = true; } }
			} as any);

			const menuBtn = screen.getByTestId('account-row-menu-btn');
			await fireEvent.click(menuBtn);
			const deleteBtn = screen.getByTestId('account-row-menu-delete');
			await fireEvent.click(deleteBtn);

			// Dialog should be open
			const dialogMessage = screen.getByTestId('account-row-delete-confirm-message');
			expect(dialogMessage).toBeTruthy();

			// Delete should NOT have been dispatched yet
			expect(deleteCalled).toBe(false);
		});

		it('should show account name in confirmation message', async () => {
			render(AccountRow, { props: { account: eurAccount, editable: true } });

			const menuBtn = screen.getByTestId('account-row-menu-btn');
			await fireEvent.click(menuBtn);
			const deleteBtn = screen.getByTestId('account-row-menu-delete');
			await fireEvent.click(deleteBtn);

			const dialogMessage = screen.getByTestId('account-row-delete-confirm-message');
			expect(dialogMessage.textContent).toContain('Main Checking');
		});

		it('should dispatch delete event when confirming dialog', async () => {
			let deleteEvent: any = null;

			render(AccountRow, {
				props: { account: eurAccount, editable: true },
				events: { delete: (e: any) => { deleteEvent = e.detail; } }
			} as any);

			const menuBtn = screen.getByTestId('account-row-menu-btn');
			await fireEvent.click(menuBtn);
			await fireEvent.click(screen.getByTestId('account-row-menu-delete'));

			const confirmBtn = screen.getByTestId('account-row-delete-confirm-confirm');
			await fireEvent.click(confirmBtn);

			expect(deleteEvent).toEqual({ accountId: 'acc-1' });
			// Dialog should be closed
			await waitFor(() => {
				expect(screen.queryByTestId('account-row-delete-confirm-message')).toBeNull();
			});
		});

		it('should close dialog without dispatching delete when canceling', async () => {
			let deleteCalled = false;

			render(AccountRow, {
				props: { account: eurAccount, editable: true },
				events: { delete: () => { deleteCalled = true; } }
			} as any);

			const menuBtn = screen.getByTestId('account-row-menu-btn');
			await fireEvent.click(menuBtn);
			await fireEvent.click(screen.getByTestId('account-row-menu-delete'));

			const cancelBtn = screen.getByTestId('account-row-delete-confirm-cancel');
			await fireEvent.click(cancelBtn);

			// Dialog should be closed
			await waitFor(() => {
				expect(screen.queryByTestId('account-row-delete-confirm-message')).toBeNull();
			});
			// Delete should NOT have been dispatched
			expect(deleteCalled).toBe(false);
		});
	});

	describe('edit mode', () => {
		async function enterEditMode() {
			render(AccountRow, { props: { account: eurAccount, editable: true } });
			const menuBtn = screen.getByTestId('account-row-menu-btn');
			await fireEvent.click(menuBtn);
			const editBtn = screen.getByTestId('account-row-menu-edit');
			await fireEvent.click(editBtn);
		}

		it('should render label elements above each input', async () => {
			await enterEditMode();

			const labels = screen.getByTestId('account-row-editing').querySelectorAll('label.edit-label');
			const labelTexts = Array.from(labels).map((l) => l.textContent);
			expect(labelTexts).toContain('Name');
			expect(labelTexts).toContain('Institution');
			expect(labelTexts).toContain('Bank Number');
			expect(labelTexts).toContain('Country');
		});

		it('should show full country name + code in country select options', async () => {
			await enterEditMode();

			const select = screen.getByTestId('account-row-edit-country') as HTMLSelectElement;
			const options = Array.from(select.options);
			// First option is the placeholder "--"
			const nlOption = options.find((o) => o.value === 'NL');
			expect(nlOption).toBeDefined();
			expect(nlOption!.textContent).toBe('Netherlands (NL)');
			const deOption = options.find((o) => o.value === 'DE');
			expect(deOption).toBeDefined();
			expect(deOption!.textContent).toBe('Germany (DE)');
		});

		it('should have labels matching AddAccountModal pattern', async () => {
			await enterEditMode();

			const labels = screen.getByTestId('account-row-editing').querySelectorAll('label.edit-label');
			const labelTexts = Array.from(labels).map((l) => l.textContent);
			// These labels mirror the AddAccountModal labels
			expect(labelTexts).toEqual(['Name', 'Institution', 'Bank Number', 'Country']);
		});
	});
});
