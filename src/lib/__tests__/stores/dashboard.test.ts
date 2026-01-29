import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	dashboardStore,
	balanceCents,
	getCurrentMonth,
	calculateMonthSummary
} from '../../stores/dashboard';

beforeEach(() => {
	dashboardStore.reset();
});

describe('dashboardStore', () => {
	it('should have correct initial state', () => {
		const state = get(dashboardStore);
		expect(state.incomeCents).toBe(0);
		expect(state.expensesCents).toBe(0);
		expect(state.isLoading).toBe(false);
		expect(state.error).toBe(null);
	});

	it('should set summary values', () => {
		dashboardStore.setSummary(500000, 300000);

		const state = get(dashboardStore);
		expect(state.incomeCents).toBe(500000);
		expect(state.expensesCents).toBe(300000);
		expect(state.error).toBe(null);
	});

	it('should set loading state', () => {
		dashboardStore.setLoading(true);
		expect(get(dashboardStore).isLoading).toBe(true);

		dashboardStore.setLoading(false);
		expect(get(dashboardStore).isLoading).toBe(false);
	});

	it('should set error and clear loading', () => {
		dashboardStore.setLoading(true);
		dashboardStore.setError('Something went wrong');

		const state = get(dashboardStore);
		expect(state.error).toBe('Something went wrong');
		expect(state.isLoading).toBe(false);
	});

	it('should reset to initial state', () => {
		dashboardStore.setSummary(100000, 50000);
		dashboardStore.setLoading(true);
		dashboardStore.reset();

		const state = get(dashboardStore);
		expect(state.incomeCents).toBe(0);
		expect(state.expensesCents).toBe(0);
		expect(state.isLoading).toBe(false);
		expect(state.error).toBe(null);
	});
});

describe('balanceCents derived store', () => {
	it('should calculate balance as income minus expenses', () => {
		dashboardStore.setSummary(500000, 300000);
		expect(get(balanceCents)).toBe(200000);
	});

	it('should return negative balance when expenses exceed income', () => {
		dashboardStore.setSummary(100000, 300000);
		expect(get(balanceCents)).toBe(-200000);
	});

	it('should return zero when income equals expenses', () => {
		dashboardStore.setSummary(250000, 250000);
		expect(get(balanceCents)).toBe(0);
	});

	it('should return zero when both are zero', () => {
		expect(get(balanceCents)).toBe(0);
	});
});

describe('getCurrentMonth', () => {
	it('should return current month in YYYY-MM format', () => {
		const result = getCurrentMonth();
		expect(result).toMatch(/^\d{4}-\d{2}$/);
	});

	it('should match current date', () => {
		const now = new Date();
		const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		expect(getCurrentMonth()).toBe(expected);
	});
});

describe('calculateMonthSummary', () => {
	it('should sum positive amounts as income', () => {
		const result = calculateMonthSummary([
			{ amountCents: 300000 },
			{ amountCents: 200000 }
		]);
		expect(result.incomeCents).toBe(500000);
		expect(result.expensesCents).toBe(0);
	});

	it('should sum absolute value of negative amounts as expenses', () => {
		const result = calculateMonthSummary([
			{ amountCents: -150000 },
			{ amountCents: -50000 }
		]);
		expect(result.incomeCents).toBe(0);
		expect(result.expensesCents).toBe(200000);
	});

	it('should handle mixed income and expenses', () => {
		const result = calculateMonthSummary([
			{ amountCents: 500000 },
			{ amountCents: -200000 },
			{ amountCents: -100000 },
			{ amountCents: 50000 }
		]);
		expect(result.incomeCents).toBe(550000);
		expect(result.expensesCents).toBe(300000);
	});

	it('should return zeros for empty array', () => {
		const result = calculateMonthSummary([]);
		expect(result.incomeCents).toBe(0);
		expect(result.expensesCents).toBe(0);
	});

	it('should ignore zero amounts', () => {
		const result = calculateMonthSummary([
			{ amountCents: 0 },
			{ amountCents: 100000 },
			{ amountCents: 0 }
		]);
		expect(result.incomeCents).toBe(100000);
		expect(result.expensesCents).toBe(0);
	});
});
