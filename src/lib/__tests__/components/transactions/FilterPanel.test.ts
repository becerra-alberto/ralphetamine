import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FilterPanel from '../../../components/transactions/FilterPanel.svelte';
import type { TransactionFilterState } from '../../../stores/transactionFilters';

// CategoryNode and TagInfo are exported from their respective Svelte components.
// We define inline interfaces here to avoid importing from .svelte files in tests.
interface CategoryNode {
	id: string;
	name: string;
	parentId: string | null;
	type: string;
	children: CategoryNode[];
}

interface TagInfo {
	name: string;
	count: number;
}

function createDefaultFilters(): TransactionFilterState {
	return {
		isOpen: true,
		dateRange: { start: null, end: null, preset: null },
		accountIds: [],
		categoryIds: [],
		tagNames: [],
		amountRange: { min: null, max: null },
		type: 'all'
	};
}

const mockAccounts = [
	{
		id: 'acc-1',
		name: 'Checking',
		type: 'checking' as const,
		institution: 'Bank A',
		currency: 'USD' as const,
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	},
	{
		id: 'acc-2',
		name: 'Savings',
		type: 'savings' as const,
		institution: 'Bank B',
		currency: 'EUR' as const,
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	}
];

const mockCategories: CategoryNode[] = [
	{
		id: 'cat-income',
		name: 'Income',
		parentId: null,
		type: 'income',
		children: [
			{ id: 'cat-income-salary', name: 'Salary', parentId: 'cat-income', type: 'income', children: [] }
		]
	},
	{
		id: 'cat-housing',
		name: 'Housing',
		parentId: null,
		type: 'expense',
		children: [
			{ id: 'cat-housing-rent', name: 'Rent', parentId: 'cat-housing', type: 'expense', children: [] }
		]
	},
	{
		id: 'cat-essential',
		name: 'Essential',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-essential-groceries',
				name: 'Groceries',
				parentId: 'cat-essential',
				type: 'expense',
				children: []
			}
		]
	},
	{
		id: 'cat-lifestyle',
		name: 'Lifestyle',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-lifestyle-dining',
				name: 'Dining',
				parentId: 'cat-lifestyle',
				type: 'expense',
				children: []
			}
		]
	},
	{
		id: 'cat-savings',
		name: 'Savings',
		parentId: null,
		type: 'expense',
		children: [
			{
				id: 'cat-savings-emergency',
				name: 'Emergency Fund',
				parentId: 'cat-savings',
				type: 'expense',
				children: []
			}
		]
	}
];

const mockTags: TagInfo[] = [
	{ name: 'recurring', count: 5 },
	{ name: 'vacation', count: 3 }
];

describe('FilterPanel', () => {
	it('should render all six filter sections (Date, Account, Category, Tags, Amount, Type)', () => {
		render(FilterPanel, {
			props: {
				filters: createDefaultFilters(),
				accounts: mockAccounts,
				categories: mockCategories,
				tags: mockTags,
				activeFilterCount: 0
			}
		});

		expect(screen.getByTestId('filter-panel')).toBeTruthy();
		expect(screen.getByTestId('date-range-filter')).toBeTruthy();
		expect(screen.getByTestId('account-filter')).toBeTruthy();
		expect(screen.getByTestId('category-filter')).toBeTruthy();
		expect(screen.getByTestId('tags-filter')).toBeTruthy();
		expect(screen.getByTestId('amount-filter')).toBeTruthy();
		expect(screen.getByTestId('type-filter')).toBeTruthy();
	});

	it('should focus the first interactive element when the panel opens', async () => {
		render(FilterPanel, {
			props: {
				filters: createDefaultFilters(),
				accounts: mockAccounts,
				categories: mockCategories,
				tags: mockTags,
				activeFilterCount: 0
			}
		});

		// Wait for the onMount callback to execute and focus the element
		await new Promise((resolve) => setTimeout(resolve, 0));

		const focused = document.activeElement;
		expect(
			focused?.tagName === 'BUTTON' || focused?.tagName === 'INPUT'
		).toBe(true);
	});

	it('should display badge with correct count when active filters exist and hide badge when none', () => {
		// Render with activeFilterCount = 0: badge should not appear
		const { unmount } = render(FilterPanel, {
			props: {
				filters: createDefaultFilters(),
				accounts: mockAccounts,
				categories: mockCategories,
				tags: mockTags,
				activeFilterCount: 0
			}
		});

		expect(screen.queryByTestId('filter-badge')).toBeNull();
		unmount();

		// Render with activeFilterCount = 3: badge should appear with text "3"
		render(FilterPanel, {
			props: {
				filters: createDefaultFilters(),
				accounts: mockAccounts,
				categories: mockCategories,
				tags: mockTags,
				activeFilterCount: 3
			}
		});

		const badge = screen.getByTestId('filter-badge');
		expect(badge).toBeTruthy();
		expect(badge.textContent).toBe('3');
	});
});
