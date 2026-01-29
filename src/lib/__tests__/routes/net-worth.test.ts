import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NetWorthPage from '../../../routes/net-worth/+page.svelte';

// Mock the Tauri API to prevent actual invoke calls
vi.mock('$lib/api/netWorth', () => ({
	getNetWorthSummary: vi.fn().mockResolvedValue({
		totalAssetsCents: 550000,
		totalLiabilitiesCents: 75000,
		netWorthCents: 475000,
		accounts: [
			{
				id: 'acc-1',
				name: 'Checking',
				type: 'checking',
				institution: 'Bank',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				balanceCents: 350000,
				lastBalanceUpdate: null
			}
		]
	}),
	getAccounts: vi.fn().mockResolvedValue([])
}));

describe('Net Worth Page', () => {
	it('renders "Net Worth" heading', () => {
		render(NetWorthPage);
		expect(screen.getByText('Net Worth')).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		render(NetWorthPage);
		expect(screen.getByTestId('net-worth-page')).toBeTruthy();
	});

	it('shows loading state initially', () => {
		render(NetWorthPage);
		expect(screen.getByTestId('net-worth-loading')).toBeTruthy();
	});
});
