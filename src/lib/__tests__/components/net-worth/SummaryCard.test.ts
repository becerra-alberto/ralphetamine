import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SummaryCard from '../../../components/net-worth/SummaryCard.svelte';

describe('SummaryCard', () => {
	describe('display', () => {
		it('should render card with label and amount', () => {
			render(SummaryCard, {
				props: { label: 'Total Assets', amountCents: 550000 }
			});

			expect(screen.getByTestId('summary-card')).toBeTruthy();
			expect(screen.getByTestId('summary-card-label').textContent).toBe('Total Assets');
			expect(screen.getByTestId('summary-card-amount')).toBeTruthy();
		});

		it('should format amount as currency with EUR symbol', () => {
			render(SummaryCard, {
				props: { label: 'Total Assets', amountCents: 550000, currency: 'EUR' }
			});

			const amount = screen.getByTestId('summary-card-amount').textContent;
			// Should contain currency formatting (€5,500.00)
			expect(amount).toContain('5,500.00');
		});

		it('should display zero amount as currency', () => {
			render(SummaryCard, {
				props: { label: 'Total Assets', amountCents: 0 }
			});

			const amount = screen.getByTestId('summary-card-amount').textContent;
			expect(amount).toContain('0.00');
		});

		it('should use custom testId', () => {
			render(SummaryCard, {
				props: {
					label: 'Net Worth',
					amountCents: 475000,
					testId: 'nw-card'
				}
			});

			expect(screen.getByTestId('nw-card')).toBeTruthy();
			expect(screen.getByTestId('nw-card-label')).toBeTruthy();
			expect(screen.getByTestId('nw-card-amount')).toBeTruthy();
		});
	});

	describe('progress bar', () => {
		it('should render progress bar when progressPercent is provided', () => {
			render(SummaryCard, {
				props: {
					label: 'Total Assets',
					amountCents: 550000,
					progressPercent: 75
				}
			});

			expect(screen.getByTestId('summary-card-progress')).toBeTruthy();
			expect(screen.getByTestId('summary-card-progress-fill')).toBeTruthy();
		});

		it('should not render progress bar when progressPercent is null', () => {
			render(SummaryCard, {
				props: {
					label: 'Total Assets',
					amountCents: 550000,
					progressPercent: null
				}
			});

			expect(screen.queryByTestId('summary-card-progress')).toBeNull();
		});

		it('should clamp progress between 0 and 100', () => {
			render(SummaryCard, {
				props: {
					label: 'Total Assets',
					amountCents: 550000,
					progressPercent: 150
				}
			});

			const fill = screen.getByTestId('summary-card-progress-fill');
			expect(fill.style.width).toBe('100%');
		});
	});

	describe('color themes', () => {
		it('should apply green theme class', () => {
			render(SummaryCard, {
				props: {
					label: 'Total Assets',
					amountCents: 550000,
					colorTheme: 'green'
				}
			});

			const card = screen.getByTestId('summary-card');
			expect(card.classList.contains('theme-green')).toBe(true);
		});

		it('should apply red theme class', () => {
			render(SummaryCard, {
				props: {
					label: 'Total Liabilities',
					amountCents: 75000,
					colorTheme: 'red'
				}
			});

			const card = screen.getByTestId('summary-card');
			expect(card.classList.contains('theme-red')).toBe(true);
		});

		it('should auto-detect green for positive amounts', () => {
			render(SummaryCard, {
				props: {
					label: 'Net Worth',
					amountCents: 475000,
					colorTheme: 'auto'
				}
			});

			const card = screen.getByTestId('summary-card');
			expect(card.classList.contains('theme-green')).toBe(true);
		});

		it('should auto-detect red for negative amounts', () => {
			render(SummaryCard, {
				props: {
					label: 'Net Worth',
					amountCents: -50000,
					colorTheme: 'auto'
				}
			});

			const card = screen.getByTestId('summary-card');
			expect(card.classList.contains('theme-red')).toBe(true);
		});
	});

	describe('prominent variant', () => {
		it('should apply prominent class when isProminent is true', () => {
			render(SummaryCard, {
				props: {
					label: 'Net Worth',
					amountCents: 475000,
					isProminent: true
				}
			});

			const card = screen.getByTestId('summary-card');
			expect(card.classList.contains('prominent')).toBe(true);
		});

		it('should not apply prominent class by default', () => {
			render(SummaryCard, {
				props: {
					label: 'Total Assets',
					amountCents: 550000
				}
			});

			const card = screen.getByTestId('summary-card');
			expect(card.classList.contains('prominent')).toBe(false);
		});
	});
});
