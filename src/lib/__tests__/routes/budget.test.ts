import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { afterNavigate } from '$app/navigation';
import BudgetPage from '../../../routes/budget/+page.svelte';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue([])
}));

// Mock budget API
vi.mock('$lib/api/budgets', () => ({
	getBudgetsForMonth: vi.fn().mockResolvedValue([])
}));

vi.mock('$lib/api/transactions', () => ({
	getCategoryTotals: vi.fn().mockResolvedValue([]),
	getUncategorizedTotal: vi.fn().mockResolvedValue(0)
}));

describe('Budget Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders "Budget" heading', () => {
		const { getByRole } = render(BudgetPage);

		expect(getByRole('heading', { name: 'Budget' })).toBeTruthy();
	});

	it('renders with correct data-testid', () => {
		const { getByTestId } = render(BudgetPage);

		expect(getByTestId('budget-page')).toBeTruthy();
	});

	it('renders budget grid component', () => {
		const { getByRole } = render(BudgetPage);

		expect(getByRole('region', { name: 'Budget Grid' })).toBeTruthy();
	});
});

describe('Budget Page Navigation Refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('registers an afterNavigate callback on mount', async () => {
		render(BudgetPage);

		// afterNavigate should have been called to register its callback
		expect(afterNavigate).toHaveBeenCalled();
	});

	it('re-fetches data on afterNavigate', async () => {
		const { getBudgetsForMonth } = await import('$lib/api/budgets');
		const { getCategoryTotals } = await import('$lib/api/transactions');

		render(BudgetPage);

		// Wait for initial mount load
		await vi.waitFor(() => {
			expect(getBudgetsForMonth).toHaveBeenCalled();
		});

		const initialCallCount = vi.mocked(getBudgetsForMonth).mock.calls.length;

		// Simulate afterNavigate by calling the registered callback
		const afterNavMock = vi.mocked(afterNavigate);
		const callback = afterNavMock.mock.calls[0]?.[0];
		expect(callback).toBeDefined();

		if (typeof callback === 'function') {
			callback({} as any);
		}

		// Wait for the re-fetch triggered by afterNavigate
		await vi.waitFor(() => {
			expect(vi.mocked(getBudgetsForMonth).mock.calls.length).toBeGreaterThan(initialCallCount);
		});
	});

	it('re-fetches data on visibilitychange to visible', async () => {
		const { getBudgetsForMonth } = await import('$lib/api/budgets');

		render(BudgetPage);

		// Wait for initial mount load
		await vi.waitFor(() => {
			expect(getBudgetsForMonth).toHaveBeenCalled();
		});

		const initialCallCount = vi.mocked(getBudgetsForMonth).mock.calls.length;

		// Simulate tab becoming visible
		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			writable: true,
			configurable: true
		});
		document.dispatchEvent(new Event('visibilitychange'));

		// Wait for the re-fetch triggered by visibilitychange
		await vi.waitFor(() => {
			expect(vi.mocked(getBudgetsForMonth).mock.calls.length).toBeGreaterThan(initialCallCount);
		});
	});
});
