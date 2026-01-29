import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';

// Mock the onboarding API before importing the page
const mockCheckOnboardingStatus = vi.fn();
const mockSaveUserGoals = vi.fn();
const mockCompleteOnboarding = vi.fn();

vi.mock('$lib/api/onboarding', () => ({
	checkOnboardingStatus: (...args: unknown[]) => mockCheckOnboardingStatus(...args),
	saveUserGoals: (...args: unknown[]) => mockSaveUserGoals(...args),
	completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args)
}));

// Mock the transactions API (used by Dashboard component)
const mockGetTransactionsForMonth = vi.fn();

vi.mock('$lib/api/transactions', () => ({
	getTransactionsForMonth: (...args: unknown[]) => mockGetTransactionsForMonth(...args)
}));

import HomePage from '../../../routes/+page.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	mockGetTransactionsForMonth.mockResolvedValue([]);
});

describe('Home Page', () => {
	it('shows loading state initially', () => {
		// Don't resolve the promise so we stay in loading
		mockCheckOnboardingStatus.mockReturnValue(new Promise(() => {}));

		render(HomePage);
		expect(screen.getByTestId('home-loading')).toBeTruthy();
	});

	it('shows dashboard when onboarding is completed', async () => {
		mockCheckOnboardingStatus.mockResolvedValue({ isCompleted: true, goals: [] });

		render(HomePage);

		await waitFor(() => {
			expect(screen.getByTestId('home-page')).toBeTruthy();
		});

		expect(screen.getByTestId('dashboard')).toBeTruthy();
	});

	it('shows onboarding wizard when not completed', async () => {
		mockCheckOnboardingStatus.mockResolvedValue({ isCompleted: false, goals: [] });

		render(HomePage);

		await waitFor(() => {
			expect(screen.getByTestId('onboarding-wizard')).toBeTruthy();
		});
	});

	it('shows dashboard when API fails', async () => {
		mockCheckOnboardingStatus.mockRejectedValue(new Error('API failed'));

		render(HomePage);

		await waitFor(() => {
			expect(screen.getByTestId('home-page')).toBeTruthy();
		});
	});

	it('shows command palette prompt when dashboard is displayed', async () => {
		mockCheckOnboardingStatus.mockResolvedValue({ isCompleted: true, goals: [] });

		render(HomePage);

		await waitFor(() => {
			expect(screen.getByTestId('home-page')).toBeTruthy();
		});

		const cmdText = screen.getByTestId('dashboard-cmd-text');
		expect(cmdText.textContent).toContain('⌘K');
		expect(cmdText.textContent).toContain('to get started');
	});

	it('shows quick shortcuts when dashboard is displayed', async () => {
		mockCheckOnboardingStatus.mockResolvedValue({ isCompleted: true, goals: [] });

		render(HomePage);

		await waitFor(() => {
			expect(screen.getByTestId('home-page')).toBeTruthy();
		});

		expect(screen.getByTestId('dashboard-shortcuts')).toBeTruthy();
	});
});
