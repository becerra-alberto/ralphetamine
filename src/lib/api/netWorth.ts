/**
 * Net Worth API wrapper for Tauri backend communication
 */

import { invoke } from '@tauri-apps/api/core';
import type { Account } from '../types/account';

/** Account with calculated balance */
export interface AccountWithBalance {
	id: string;
	name: string;
	type: string;
	institution: string;
	currency: string;
	isActive: boolean;
	includeInNetWorth: boolean;
	balanceCents: number;
	lastBalanceUpdate: string | null;
	bankNumber?: string | null;
	country?: string | null;
}

/** Net worth summary from backend */
export interface NetWorthSummaryData {
	totalAssetsCents: number;
	totalLiabilitiesCents: number;
	netWorthCents: number;
	accounts: AccountWithBalance[];
}

/**
 * Get net worth summary with account balances
 */
export async function getNetWorthSummary(): Promise<NetWorthSummaryData> {
	return invoke('get_net_worth_summary');
}

/**
 * Get all accounts
 */
export async function getAccounts(): Promise<Account[]> {
	return invoke('get_accounts');
}

/** Month-over-month change data from backend */
export interface MomChangeData {
	hasPrevious: boolean;
	changeCents: number;
	changePercent: number;
	previousMonth: string | null;
	previousNetWorthCents: number | null;
	currentNetWorthCents: number;
}

/**
 * Save a net worth snapshot for the given month
 */
export async function saveNetWorthSnapshot(
	month: string,
	totalAssetsCents: number,
	totalLiabilitiesCents: number,
	netWorthCents: number
): Promise<void> {
	return invoke('save_net_worth_snapshot', {
		month,
		totalAssetsCents,
		totalLiabilitiesCents,
		netWorthCents
	});
}

/**
 * Get month-over-month change for current net worth
 */
export async function getMomChange(
	currentMonth: string,
	currentNetWorthCents: number
): Promise<MomChangeData> {
	return invoke('get_mom_change', { currentMonth, currentNetWorthCents });
}

/**
 * Create a new account
 */
export async function createAccount(
	name: string,
	accountType: string,
	institution: string,
	currency: string,
	startingBalanceCents: number,
	bankNumber?: string | null,
	country?: string | null
): Promise<string> {
	return invoke('create_account', {
		name,
		accountType,
		institution,
		currency,
		startingBalanceCents,
		bankNumber: bankNumber ?? null,
		country: country ?? null
	});
}

/**
 * Update an account's balance
 */
export async function updateAccountBalance(
	accountId: string,
	newBalanceCents: number
): Promise<void> {
	return invoke('update_account_balance', { accountId, newBalanceCents });
}

/**
 * Update an account's details (name, type, institution, etc.)
 */
export interface AccountUpdateInput {
	name?: string;
	accountType?: string;
	institution?: string;
	currency?: string;
	isActive?: boolean;
	includeInNetWorth?: boolean;
	bankNumber?: string;
	country?: string;
}

export async function updateAccount(
	id: string,
	update: AccountUpdateInput
): Promise<Account> {
	return invoke('update_account', { id, update });
}

/**
 * Soft-delete an account (sets is_active = false).
 * Returns the number of linked transactions.
 */
export async function deleteAccount(id: string): Promise<number> {
	return invoke('delete_account', { id });
}

/**
 * Get balance history for an account
 */
export async function getBalanceHistory(
	accountId: string
): Promise<[number, string][]> {
	return invoke('get_balance_history', { accountId });
}
