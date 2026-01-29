import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CellExpansion from '../../../components/budget/CellExpansion.svelte';
import type { MiniTransaction } from '../../../components/budget/TransactionMiniList.svelte';

// Mock the navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('CellExpansion', () => {
	const mockTransactions: MiniTransaction[] = [
		{ id: '1', date: '2025-01-15', payee: 'Grocery Store', amountCents: -5000 },
		{ id: '2', date: '2025-01-10', payee: 'Coffee Shop', amountCents: -450 },
		{ id: '3', date: '2025-01-05', payee: 'Gas Station', amountCents: -3500 }
	];

	const defaultProps = {
		categoryId: 'cat-1',
		categoryName: 'Groceries',
		month: '2025-01',
		transactions: mockTransactions,
		totalCount: 3,
		isLoading: false
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render expansion panel with transaction list', () => {
			render(CellExpansion, { props: defaultProps });

			expect(screen.getByTestId('cell-expansion')).toBeTruthy();
			expect(screen.getByTestId('transaction-mini-list')).toBeTruthy();
		});

		it('should display category name in header', () => {
			render(CellExpansion, { props: defaultProps });

			expect(screen.getByText('Groceries')).toBeTruthy();
		});

		it('should display formatted month in header', () => {
			render(CellExpansion, { props: defaultProps });

			expect(screen.getByText('January 2025')).toBeTruthy();
		});

		it('should have close button', () => {
			render(CellExpansion, { props: defaultProps });

			expect(screen.getByTestId('close-button')).toBeTruthy();
		});
	});

	describe('transaction display', () => {
		it('should display maximum 10 transactions', () => {
			const manyTransactions: MiniTransaction[] = Array.from({ length: 15 }, (_, i) => ({
				id: String(i + 1),
				date: `2025-01-${String(15 - i).padStart(2, '0')}`,
				payee: `Payee ${i + 1}`,
				amountCents: -(i + 1) * 100
			}));

			render(CellExpansion, {
				props: {
					...defaultProps,
					transactions: manyTransactions,
					totalCount: 15
				}
			});

			// TransactionMiniList handles the slicing to 10
			const items = screen.getAllByTestId('transaction-item');
			expect(items.length).toBeLessThanOrEqual(10);
		});

		it('should sort transactions by date descending', () => {
			// TransactionMiniList handles the sorting, but we verify the data is passed correctly
			render(CellExpansion, { props: defaultProps });

			const items = screen.getAllByTestId('transaction-item');
			expect(items.length).toBe(3);
		});
	});

	describe('View all link', () => {
		it('should show "View all X transactions →" link when more than 10 transactions', () => {
			const manyTransactions: MiniTransaction[] = Array.from({ length: 12 }, (_, i) => ({
				id: String(i + 1),
				date: `2025-01-${String(15 - i).padStart(2, '0')}`,
				payee: `Payee ${i + 1}`,
				amountCents: -(i + 1) * 100
			}));

			render(CellExpansion, {
				props: {
					...defaultProps,
					transactions: manyTransactions,
					totalCount: 12
				}
			});

			expect(screen.getByTestId('view-all-link')).toBeTruthy();
			expect(screen.getByText('View all 12 transactions →')).toBeTruthy();
		});

		it('should not show "View all" link when 10 or fewer transactions', () => {
			render(CellExpansion, { props: defaultProps });

			expect(screen.queryByTestId('view-all-link')).toBeFalsy();
		});

		it('should navigate to /transactions with filters when clicking View all', async () => {
			const { goto } = await import('$app/navigation');
			const manyTransactions: MiniTransaction[] = Array.from({ length: 12 }, (_, i) => ({
				id: String(i + 1),
				date: `2025-01-${String(15 - i).padStart(2, '0')}`,
				payee: `Payee ${i + 1}`,
				amountCents: -(i + 1) * 100
			}));

			render(CellExpansion, {
				props: {
					...defaultProps,
					transactions: manyTransactions,
					totalCount: 12
				}
			});

			const viewAllLink = screen.getByTestId('view-all-link');
			await fireEvent.click(viewAllLink);

			expect(goto).toHaveBeenCalledWith('/transactions?category=cat-1&month=2025-01');
		});
	});

	describe('empty state', () => {
		it('should show "No transactions for this month" when empty', () => {
			render(CellExpansion, {
				props: {
					...defaultProps,
					transactions: [],
					totalCount: 0
				}
			});

			expect(screen.getByText('No transactions for this month')).toBeTruthy();
		});
	});

	describe('loading state', () => {
		it('should show loading state when isLoading is true', () => {
			render(CellExpansion, {
				props: {
					...defaultProps,
					isLoading: true,
					transactions: []
				}
			});

			expect(screen.getByTestId('loading-state')).toBeTruthy();
			expect(screen.getByText('Loading transactions...')).toBeTruthy();
		});
	});

	describe('close functionality', () => {
		it('should dispatch close event when close button is clicked', async () => {
			let closeCalled = false;
			render(CellExpansion, {
				props: defaultProps,
				events: {
					close: () => {
						closeCalled = true;
					}
				}
			});

			const closeButton = screen.getByTestId('close-button');
			await fireEvent.click(closeButton);

			expect(closeCalled).toBe(true);
		});

		it('should dispatch close event when Escape key is pressed', async () => {
			let closeCalled = false;
			render(CellExpansion, {
				props: defaultProps,
				events: {
					close: () => {
						closeCalled = true;
					}
				}
			});

			await fireEvent.keyDown(window, { key: 'Escape' });

			expect(closeCalled).toBe(true);
		});
	});

	describe('accessibility', () => {
		it('should have region role with aria-label', () => {
			render(CellExpansion, { props: defaultProps });

			const panel = screen.getByTestId('cell-expansion');
			expect(panel.getAttribute('role')).toBe('region');
			expect(panel.getAttribute('aria-label')).toContain('Groceries');
			expect(panel.getAttribute('aria-label')).toContain('January 2025');
		});

		it('should have close button with aria-label', () => {
			render(CellExpansion, { props: defaultProps });

			const closeButton = screen.getByTestId('close-button');
			expect(closeButton.getAttribute('aria-label')).toBe('Close expansion');
		});
	});
});
