import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NetWorthSummary from '../../../components/net-worth/NetWorthSummary.svelte';

describe('NetWorthSummary', () => {
	describe('three-card layout (AC1)', () => {
		it('should render summary section with three cards', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			expect(screen.getByTestId('net-worth-summary')).toBeTruthy();
			expect(screen.getByTestId('net-worth-summary-cards')).toBeTruthy();
			expect(screen.getByTestId('net-worth-summary-assets')).toBeTruthy();
			expect(screen.getByTestId('net-worth-summary-liabilities')).toBeTruthy();
			expect(screen.getByTestId('net-worth-summary-net-worth')).toBeTruthy();
		});

		it('should display correct labels on cards', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			expect(screen.getByTestId('net-worth-summary-assets-label').textContent).toBe(
				'Total Assets'
			);
			expect(screen.getByTestId('net-worth-summary-liabilities-label').textContent).toBe(
				'Total Liabilities'
			);
			expect(screen.getByTestId('net-worth-summary-net-worth-label').textContent).toBe(
				'Net Worth'
			);
		});
	});

	describe('total assets (AC2)', () => {
		it('should display total assets amount', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 0,
					netWorthCents: 550000,
					hasAccounts: true
				}
			});

			const amount = screen.getByTestId('net-worth-summary-assets-amount').textContent;
			expect(amount).toContain('5,500.00');
		});

		it('should have green theme on assets card', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 0,
					netWorthCents: 550000,
					hasAccounts: true
				}
			});

			const card = screen.getByTestId('net-worth-summary-assets');
			expect(card.classList.contains('theme-green')).toBe(true);
		});

		it('should show progress bar on assets card', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			expect(screen.getByTestId('net-worth-summary-assets-progress')).toBeTruthy();
		});
	});

	describe('total liabilities (AC3)', () => {
		it('should display total liabilities amount', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			const amount = screen.getByTestId('net-worth-summary-liabilities-amount').textContent;
			expect(amount).toContain('750.00');
		});

		it('should have red theme on liabilities card', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			const card = screen.getByTestId('net-worth-summary-liabilities');
			expect(card.classList.contains('theme-red')).toBe(true);
		});
	});

	describe('net worth calculation (AC4)', () => {
		it('should display net worth amount', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			const amount = screen.getByTestId('net-worth-summary-net-worth-amount').textContent;
			expect(amount).toContain('4,750.00');
		});

		it('should show green for positive net worth', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			const card = screen.getByTestId('net-worth-summary-net-worth');
			expect(card.classList.contains('theme-green')).toBe(true);
		});

		it('should show red for negative net worth', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 50000,
					totalLiabilitiesCents: 200000,
					netWorthCents: -150000,
					hasAccounts: true
				}
			});

			const card = screen.getByTestId('net-worth-summary-net-worth');
			expect(card.classList.contains('theme-red')).toBe(true);
		});

		it('should mark net worth card as prominent', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true
				}
			});

			const card = screen.getByTestId('net-worth-summary-net-worth');
			expect(card.classList.contains('prominent')).toBe(true);
		});
	});

	describe('empty state (AC7)', () => {
		it('should show empty state when no accounts exist', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 0,
					totalLiabilitiesCents: 0,
					netWorthCents: 0,
					hasAccounts: false
				}
			});

			expect(screen.getByTestId('net-worth-summary-empty')).toBeTruthy();
			expect(screen.getByTestId('net-worth-summary-prompt')).toBeTruthy();
		});

		it('should show zero amounts in empty state', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 0,
					totalLiabilitiesCents: 0,
					netWorthCents: 0,
					hasAccounts: false
				}
			});

			const assetsAmount = screen.getByTestId('net-worth-summary-assets-amount').textContent;
			expect(assetsAmount).toContain('0.00');
		});

		it('should show prompt to add first account', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 0,
					totalLiabilitiesCents: 0,
					netWorthCents: 0,
					hasAccounts: false
				}
			});

			const prompt = screen.getByTestId('net-worth-summary-prompt');
			expect(prompt.textContent).toContain('Add your first account');
		});
	});

	describe('MoM change integration', () => {
		it('should render MoM change row when accounts exist', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true,
					momChange: null
				}
			});

			expect(screen.getByTestId('net-worth-summary-mom-row')).toBeTruthy();
		});

		it('should pass momChange data to MoMChange component', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 550000,
					totalLiabilitiesCents: 75000,
					netWorthCents: 475000,
					hasAccounts: true,
					momChange: {
						hasPrevious: true,
						changeCents: 150000,
						changePercent: 5.2,
						previousMonth: '2025-12',
						previousNetWorthCents: 325000,
						currentNetWorthCents: 475000
					}
				}
			});

			expect(screen.getByTestId('net-worth-summary-mom')).toBeTruthy();
			expect(screen.getByTestId('net-worth-summary-mom-indicator')).toBeTruthy();
		});

		it('should not render MoM row in empty state', () => {
			render(NetWorthSummary, {
				props: {
					totalAssetsCents: 0,
					totalLiabilitiesCents: 0,
					netWorthCents: 0,
					hasAccounts: false,
					momChange: null
				}
			});

			expect(screen.queryByTestId('net-worth-summary-mom-row')).toBeNull();
		});
	});
});
