import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
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
});
