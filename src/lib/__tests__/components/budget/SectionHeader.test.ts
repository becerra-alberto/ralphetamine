import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SectionHeader from '../../../components/budget/SectionHeader.svelte';
import { budgetUIStore } from '../../../stores/budgetUI';
import type { CategorySection, SectionTotals } from '../../../utils/categoryGroups';
import type { Category } from '../../../types/category';

// Mock the budgetUIStore
vi.mock('../../../stores/budgetUI', () => ({
	budgetUIStore: {
		subscribe: vi.fn((callback) => {
			callback({ collapsedSections: new Set() });
			return () => {};
		}),
		toggleSection: vi.fn()
	}
}));

describe('SectionHeader', () => {
	const mockCategory: Category = {
		id: 'sec-essential',
		name: 'Essential',
		parentId: null,
		type: 'expense',
		icon: null,
		color: null,
		sortOrder: 2,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	};

	const mockSection: CategorySection = {
		id: 'sec-essential',
		name: 'Essential',
		category: mockCategory,
		children: [],
		sortOrder: 2
	};

	const mockTotals = new Map<string, SectionTotals>([
		['2025-01', { budgetedCents: 50000, actualCents: -35000, remainingCents: 15000 }]
	]);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render section name', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			expect(screen.getByText('Essential')).toBeTruthy();
		});

		it('should have row role', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			expect(screen.getByRole('row')).toBeTruthy();
		});

		it('should have data-testid attribute', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			expect(screen.getByTestId('section-header')).toBeTruthy();
		});
	});

	describe('collapse indicator', () => {
		it('should show ▼ when expanded', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			expect(screen.getByText('▼')).toBeTruthy();
		});

		it('should show ▶ when collapsed', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: true
				}
			});

			expect(screen.getByText('▶')).toBeTruthy();
		});
	});

	describe('accessibility', () => {
		it('should have clickable rowheader for section name', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			// The button has role="rowheader" for semantic table structure
			expect(screen.getByRole('rowheader')).toBeTruthy();
		});

		it('should have aria-expanded attribute', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			const header = screen.getByRole('rowheader');
			expect(header.getAttribute('aria-expanded')).toBe('true');
		});

		it('should have aria-expanded false when collapsed', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: true
				}
			});

			const header = screen.getByRole('rowheader');
			expect(header.getAttribute('aria-expanded')).toBe('false');
		});
	});

	describe('interaction', () => {
		it('should call toggleSection on click', async () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			const header = screen.getByRole('rowheader');
			await fireEvent.click(header);

			expect(budgetUIStore.toggleSection).toHaveBeenCalledWith('sec-essential');
		});

		it('should toggle on Enter key', async () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			const header = screen.getByRole('rowheader');
			await fireEvent.keyDown(header, { key: 'Enter' });

			expect(budgetUIStore.toggleSection).toHaveBeenCalledWith('sec-essential');
		});

		it('should toggle on Space key', async () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			const header = screen.getByRole('rowheader');
			await fireEvent.keyDown(header, { key: ' ' });

			expect(budgetUIStore.toggleSection).toHaveBeenCalledWith('sec-essential');
		});
	});

	describe('totals display', () => {
		it('should display section totals for each month', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			// €500.00 budgeted
			expect(screen.getByText('€500.00')).toBeTruthy();
		});
	});

	describe('styling', () => {
		it('should have distinct background (--bg-secondary)', () => {
			render(SectionHeader, {
				props: {
					section: mockSection,
					months: ['2025-01'],
					currentMonth: '2025-01',
					totals: mockTotals,
					isCollapsed: false
				}
			});

			const header = screen.getByTestId('section-header');
			// Check that the element has the section-header class which uses --bg-secondary
			expect(header.classList.contains('section-header')).toBe(true);
		});
	});
});
