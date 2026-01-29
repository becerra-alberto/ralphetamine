/**
 * Dashboard API wrapper for Tauri backend communication
 */

import { invoke } from '@tauri-apps/api/core';

export interface MonthlySummary {
	incomeCents: number;
	expensesCents: number;
	balanceCents: number;
}

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
	return invoke<MonthlySummary>('get_monthly_summary', { month });
}
