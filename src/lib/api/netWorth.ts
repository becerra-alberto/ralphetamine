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
