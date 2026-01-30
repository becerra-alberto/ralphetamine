import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as netWorthApi from '../../api/netWorth';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('Net Worth API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createAccount', () => {
		it('should pass bankNumber and country to create_account', async () => {
			mockInvoke.mockResolvedValue('acct-new');

			const result = await netWorthApi.createAccount(
				'Test Account',
				'checking',
				'ING',
				'EUR',
				100000,
				'NL82BUNQ2071504690',
				'NL'
			);

			expect(mockInvoke).toHaveBeenCalledWith('create_account', {
				name: 'Test Account',
				accountType: 'checking',
				institution: 'ING',
				currency: 'EUR',
				startingBalanceCents: 100000,
				bankNumber: 'NL82BUNQ2071504690',
				country: 'NL'
			});
			expect(result).toBe('acct-new');
		});

		it('should pass null for bankNumber and country when not provided', async () => {
			mockInvoke.mockResolvedValue('acct-new');

			await netWorthApi.createAccount('Test', 'checking', 'ING', 'EUR', 100000);

			expect(mockInvoke).toHaveBeenCalledWith('create_account', {
				name: 'Test',
				accountType: 'checking',
				institution: 'ING',
				currency: 'EUR',
				startingBalanceCents: 100000,
				bankNumber: null,
				country: null
			});
		});
	});

	describe('updateAccount', () => {
		it('should save and retrieve bankNumber via update_account', async () => {
			const mockAccount = {
				id: 'acct-1',
				name: 'Main Checking',
				type: 'checking',
				institution: 'ING',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				bankNumber: 'NL82BUNQ2071504690',
				country: 'NL'
			};
			mockInvoke.mockResolvedValue(mockAccount);

			const result = await netWorthApi.updateAccount('acct-1', {
				bankNumber: 'NL82BUNQ2071504690'
			});

			expect(mockInvoke).toHaveBeenCalledWith('update_account', {
				id: 'acct-1',
				update: { bankNumber: 'NL82BUNQ2071504690' }
			});
			expect(result.bankNumber).toBe('NL82BUNQ2071504690');
		});

		it('should save and retrieve country via update_account', async () => {
			const mockAccount = {
				id: 'acct-1',
				name: 'Main Checking',
				type: 'checking',
				institution: 'ING',
				currency: 'EUR',
				isActive: true,
				includeInNetWorth: true,
				bankNumber: null,
				country: 'NL'
			};
			mockInvoke.mockResolvedValue(mockAccount);

			const result = await netWorthApi.updateAccount('acct-1', {
				country: 'NL'
			});

			expect(mockInvoke).toHaveBeenCalledWith('update_account', {
				id: 'acct-1',
				update: { country: 'NL' }
			});
			expect(result.country).toBe('NL');
		});
	});

	describe('getNetWorthSummary', () => {
		it('should return accounts with bankNumber and country', async () => {
			const mockData: netWorthApi.NetWorthSummaryData = {
				totalAssetsCents: 200000,
				totalLiabilitiesCents: 50000,
				netWorthCents: 150000,
				accounts: [
					{
						id: 'acct-1',
						name: 'Checking',
						type: 'checking',
						institution: 'ING',
						currency: 'EUR',
						isActive: true,
						includeInNetWorth: true,
						balanceCents: 200000,
						lastBalanceUpdate: '2025-06-01',
						bankNumber: 'NL82BUNQ2071504690',
						country: 'NL'
					}
				]
			};
			mockInvoke.mockResolvedValue(mockData);

			const result = await netWorthApi.getNetWorthSummary();

			expect(result.accounts[0].bankNumber).toBe('NL82BUNQ2071504690');
			expect(result.accounts[0].country).toBe('NL');
		});
	});
});
