import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AdjustmentPreview from '../../../components/budget/AdjustmentPreview.svelte';
import type { PreviewItem } from '../../../types/ui';

// Mock the utility functions
vi.mock('../../../utils/currency', () => ({
	formatCentsCurrency: (cents: number) => {
		const amount = cents / 100;
		return amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`;
	},
	formatCurrency: (cents: number) => {
		const amount = cents / 100;
		return amount < 0 ? `-$${Math.abs(amount).toFixed(2)}` : `$${amount.toFixed(2)}`;
	}
}));

vi.mock('../../../utils/dates', () => ({
	formatMonthDisplay: (month: string) => {
		const [, m] = month.split('-');
		const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		return monthNames[parseInt(m) - 1];
	}
}));

describe('AdjustmentPreview', () => {
	const mockItems: PreviewItem[] = [
		{
			categoryId: 'rent',
			categoryName: 'Rent',
			month: '2026-02',
			currentCents: 100000,
			newCents: 110000
		},
		{
			categoryId: 'rent',
			categoryName: 'Rent',
			month: '2026-03',
			currentCents: 100000,
			newCents: 110000
		},
		{
			categoryId: 'utilities',
			categoryName: 'Utilities',
			month: '2026-02',
			currentCents: 15000,
			newCents: 16500
		},
		{
			categoryId: 'utilities',
			categoryName: 'Utilities',
			month: '2026-03',
			currentCents: 15000,
			newCents: 16500
		},
		{
			categoryId: 'groceries',
			categoryName: 'Groceries',
			month: '2026-02',
			currentCents: 40000,
			newCents: 44000
		},
		{
			categoryId: 'groceries',
			categoryName: 'Groceries',
			month: '2026-03',
			currentCents: 40000,
			newCents: 44000
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should show count of affected cells', () => {
			render(AdjustmentPreview, {
				props: {
					items: mockItems,
					totalAffected: 6,
					isLoading: false
				}
			});

			const count = screen.getByTestId('preview-count');
			expect(count.textContent).toContain('6 cells affected');
		});

		it('should show "1 cell affected" for singular', () => {
			render(AdjustmentPreview, {
				props: {
					items: [mockItems[0]],
					totalAffected: 1,
					isLoading: false
				}
			});

			const count = screen.getByTestId('preview-count');
			expect(count.textContent).toContain('1 cell affected');
		});

		it('should show before/after for first 5 cells by default', () => {
			render(AdjustmentPreview, {
				props: {
					items: mockItems,
					totalAffected: 6,
					isLoading: false,
					maxDisplay: 5
				}
			});

			// Should show preview list
			const previewList = screen.getByTestId('preview-list');
			expect(previewList).toBeTruthy();

			// Should show preview rows (limited to 5)
			const previewRows = screen.getAllByTestId('preview-row');
			expect(previewRows.length).toBe(5);
		});

		it('should show "...and X more" when more items exist', () => {
			render(AdjustmentPreview, {
				props: {
					items: mockItems,
					totalAffected: 6,
					isLoading: false,
					maxDisplay: 5
				}
			});

			const more = screen.getByTestId('preview-more');
			expect(more.textContent).toContain('...and 1 more');
		});

		it('should show empty state when no items', () => {
			render(AdjustmentPreview, {
				props: {
					items: [],
					totalAffected: 0,
					isLoading: false
				}
			});

			const empty = screen.getByTestId('preview-empty');
			expect(empty).toBeTruthy();
			expect(empty.textContent).toContain('Select categories and date range');
		});

		it('should show loading state when isLoading is true', () => {
			render(AdjustmentPreview, {
				props: {
					items: [],
					totalAffected: 0,
					isLoading: true
				}
			});

			const loading = screen.getByTestId('preview-loading');
			expect(loading).toBeTruthy();
			expect(loading.textContent).toContain('Calculating preview');
		});
	});

	describe('preview calculations', () => {
		it('should display "Set amount" preview correctly - all cells show new amount', () => {
			const setAmountItems: PreviewItem[] = [
				{
					categoryId: 'rent',
					categoryName: 'Rent',
					month: '2026-02',
					currentCents: 100000,
					newCents: 50000
				},
				{
					categoryId: 'utilities',
					categoryName: 'Utilities',
					month: '2026-02',
					currentCents: 15000,
					newCents: 50000
				}
			];

			render(AdjustmentPreview, {
				props: {
					items: setAmountItems,
					totalAffected: 2,
					isLoading: false
				}
			});

			const rows = screen.getAllByTestId('preview-row');
			// Both should show $500.00 as new value
			rows.forEach((row) => {
				const newValue = row.querySelector('.col-new');
				expect(newValue?.textContent).toContain('500.00');
			});
		});

		it('should display "Increase by %" preview correctly (400 + 10% = 440)', () => {
			const increaseItems: PreviewItem[] = [
				{
					categoryId: 'rent',
					categoryName: 'Rent',
					month: '2026-02',
					currentCents: 40000, // $400.00
					newCents: 44000 // $440.00 (10% increase)
				}
			];

			render(AdjustmentPreview, {
				props: {
					items: increaseItems,
					totalAffected: 1,
					isLoading: false
				}
			});

			const row = screen.getByTestId('preview-row');
			const currentValue = row.querySelector('.col-current');
			const newValue = row.querySelector('.col-new');

			expect(currentValue?.textContent).toContain('400.00');
			expect(newValue?.textContent).toContain('440.00');
		});

		it('should display "Decrease by %" preview correctly (400 - 10% = 360)', () => {
			const decreaseItems: PreviewItem[] = [
				{
					categoryId: 'rent',
					categoryName: 'Rent',
					month: '2026-02',
					currentCents: 40000, // $400.00
					newCents: 36000 // $360.00 (10% decrease)
				}
			];

			render(AdjustmentPreview, {
				props: {
					items: decreaseItems,
					totalAffected: 1,
					isLoading: false
				}
			});

			const row = screen.getByTestId('preview-row');
			const currentValue = row.querySelector('.col-current');
			const newValue = row.querySelector('.col-new');

			expect(currentValue?.textContent).toContain('400.00');
			expect(newValue?.textContent).toContain('360.00');
		});
	});

	describe('difference display', () => {
		it('should show positive difference for increases', () => {
			const items: PreviewItem[] = [
				{
					categoryId: 'rent',
					categoryName: 'Rent',
					month: '2026-02',
					currentCents: 40000,
					newCents: 44000
				}
			];

			render(AdjustmentPreview, {
				props: {
					items,
					totalAffected: 1,
					isLoading: false
				}
			});

			const row = screen.getByTestId('preview-row');
			const diff = row.querySelector('.col-diff');
			expect(diff?.textContent).toContain('+');
			expect(diff?.classList.contains('diff-increase')).toBe(true);
		});

		it('should show negative difference for decreases', () => {
			const items: PreviewItem[] = [
				{
					categoryId: 'rent',
					categoryName: 'Rent',
					month: '2026-02',
					currentCents: 40000,
					newCents: 36000
				}
			];

			render(AdjustmentPreview, {
				props: {
					items,
					totalAffected: 1,
					isLoading: false
				}
			});

			const row = screen.getByTestId('preview-row');
			const diff = row.querySelector('.col-diff');
			expect(diff?.classList.contains('diff-decrease')).toBe(true);
		});

		it('should show "No change" for same values', () => {
			const items: PreviewItem[] = [
				{
					categoryId: 'rent',
					categoryName: 'Rent',
					month: '2026-02',
					currentCents: 40000,
					newCents: 40000
				}
			];

			render(AdjustmentPreview, {
				props: {
					items,
					totalAffected: 1,
					isLoading: false
				}
			});

			const row = screen.getByTestId('preview-row');
			const diff = row.querySelector('.col-diff');
			expect(diff?.textContent).toContain('No change');
			expect(diff?.classList.contains('diff-neutral')).toBe(true);
		});
	});

	describe('live updates', () => {
		it('should correctly display different item counts', async () => {
			// Test with 1 item
			const { unmount: unmount1 } = render(AdjustmentPreview, {
				props: {
					items: [mockItems[0]],
					totalAffected: 1,
					isLoading: false
				}
			});

			expect(screen.getByTestId('preview-count').textContent).toContain('1 cell');
			unmount1();

			// Test with 3 items
			render(AdjustmentPreview, {
				props: {
					items: mockItems.slice(0, 3),
					totalAffected: 3,
					isLoading: false
				}
			});

			// Should show 3 cells
			expect(screen.getByTestId('preview-count').textContent).toContain('3 cells');
		});
	});
});
