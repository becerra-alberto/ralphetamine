import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import Dashboard from '../../components/dashboard/Dashboard.svelte';
import { dashboardStore } from '../../stores/dashboard';

// Mock the transaction API
const mockGetTransactionsForMonth = vi.fn();

vi.mock('$lib/api/transactions', () => ({
	getTransactionsForMonth: (...args: unknown[]) => mockGetTransactionsForMonth(...args)
}));

beforeEach(() => {
	vi.clearAllMocks();
	dashboardStore.reset();
});

describe('Dashboard', () => {
	it('should render dashboard component', () => {
		mockGetTransactionsForMonth.mockResolvedValue([]);

		render(Dashboard);

		expect(screen.getByTestId('dashboard')).toBeTruthy();
	});

	it('should render when onboarding_completed is true (dashboard displays)', async () => {
		mockGetTransactionsForMonth.mockResolvedValue([]);

		render(Dashboard);

		// Dashboard renders immediately, data loads asynchronously
		expect(screen.getByTestId('dashboard')).toBeTruthy();
		expect(screen.getByTestId('dashboard-cmd-prompt')).toBeTruthy();
	});

	it('should show "Press ⌘K to get started" prompt', () => {
		mockGetTransactionsForMonth.mockResolvedValue([]);

		render(Dashboard);

		const cmdText = screen.getByTestId('dashboard-cmd-text');
		expect(cmdText).toBeTruthy();
		expect(cmdText.textContent).toContain('Press');
		expect(cmdText.textContent).toContain('⌘K');
		expect(cmdText.textContent).toContain('to get started');
	});

	it('should render shortcuts section', () => {
		mockGetTransactionsForMonth.mockResolvedValue([]);

		render(Dashboard);

		expect(screen.getByTestId('dashboard-shortcuts-section')).toBeTruthy();
	});

	it('should render summary section', () => {
		mockGetTransactionsForMonth.mockResolvedValue([]);

		render(Dashboard);

		expect(screen.getByTestId('dashboard-summary-section')).toBeTruthy();
	});

	it('should load and display summary cards after fetching transactions', async () => {
		mockGetTransactionsForMonth.mockResolvedValue([
			{ amountCents: 500000 },
			{ amountCents: -200000 },
			{ amountCents: -50000 }
		]);

		render(Dashboard);

		await waitFor(() => {
			expect(screen.getByTestId('dashboard-cards')).toBeTruthy();
		});
	});

	it('should show error message when API fails', async () => {
		mockGetTransactionsForMonth.mockRejectedValue(new Error('API error'));

		render(Dashboard);

		await waitFor(() => {
			expect(screen.getByTestId('dashboard-error')).toBeTruthy();
			expect(screen.getByTestId('dashboard-error').textContent).toContain('Failed to load dashboard data');
		});
	});

	it('should accept custom testId', () => {
		mockGetTransactionsForMonth.mockResolvedValue([]);

		render(Dashboard, { props: { testId: 'custom-dashboard' } });

		expect(screen.getByTestId('custom-dashboard')).toBeTruthy();
	});
});
