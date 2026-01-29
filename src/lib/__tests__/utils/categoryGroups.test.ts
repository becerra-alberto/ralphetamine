import { describe, it, expect } from 'vitest';
import {
	SECTION_ORDER,
	isSectionCategory,
	getSectionForCategory,
	groupCategoriesBySections,
	calculateSectionTotals,
	getSectionStatusClass,
	createDefaultSections
} from '../../utils/categoryGroups';
import type { Category } from '../../types/category';
import type { BudgetCell } from '../../stores/budget';

describe('Category Groups Utilities', () => {
	const createCategory = (
		id: string,
		name: string,
		parentId: string | null = null
	): Category => ({
		id,
		name,
		parentId,
		type: 'expense',
		icon: null,
		color: null,
		sortOrder: 0,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z'
	});

	describe('SECTION_ORDER', () => {
		it('should have 5 sections in order: Income, Housing, Essential, Lifestyle, Savings', () => {
			expect(SECTION_ORDER).toEqual([
				'Income',
				'Housing',
				'Essential',
				'Lifestyle',
				'Savings'
			]);
		});
	});

	describe('isSectionCategory', () => {
		it('should return true for section categories (parentId=null, matching name)', () => {
			const incomeSection = createCategory('sec-1', 'Income');
			expect(isSectionCategory(incomeSection)).toBe(true);
		});

		it('should return false for non-section categories', () => {
			const groceries = createCategory('cat-1', 'Groceries', 'sec-essential');
			expect(isSectionCategory(groceries)).toBe(false);
		});

		it('should return false for root categories with non-section names', () => {
			const custom = createCategory('cat-1', 'Custom Category');
			expect(isSectionCategory(custom)).toBe(false);
		});
	});

	describe('getSectionForCategory', () => {
		const allCategories: Category[] = [
			createCategory('sec-income', 'Income'),
			createCategory('sec-essential', 'Essential'),
			createCategory('cat-groceries', 'Groceries', 'sec-essential'),
			createCategory('cat-salary', 'Salary', 'sec-income')
		];

		it('should return section name for child category', () => {
			const groceries = allCategories.find((c) => c.id === 'cat-groceries')!;
			expect(getSectionForCategory(groceries, allCategories)).toBe('Essential');
		});

		it('should return section name for section category itself', () => {
			const income = allCategories.find((c) => c.id === 'sec-income')!;
			expect(getSectionForCategory(income, allCategories)).toBe('Income');
		});
	});

	describe('groupCategoriesBySections', () => {
		it('should group categories by their parent sections', () => {
			const categories: Category[] = [
				createCategory('sec-income', 'Income'),
				createCategory('sec-housing', 'Housing'),
				createCategory('sec-essential', 'Essential'),
				createCategory('cat-rent', 'Rent', 'sec-housing'),
				createCategory('cat-groceries', 'Groceries', 'sec-essential'),
				createCategory('cat-salary', 'Salary', 'sec-income')
			];

			const sections = groupCategoriesBySections(categories);

			expect(sections).toHaveLength(3);
			expect(sections[0].name).toBe('Income');
			expect(sections[0].children).toHaveLength(1);
			expect(sections[0].children[0].name).toBe('Salary');
		});

		it('should return sections in defined order', () => {
			const categories: Category[] = [
				createCategory('sec-savings', 'Savings'),
				createCategory('sec-income', 'Income'),
				createCategory('sec-lifestyle', 'Lifestyle')
			];

			const sections = groupCategoriesBySections(categories);

			// Order should be: Income, Lifestyle, Savings (based on SECTION_ORDER)
			expect(sections[0].name).toBe('Income');
			expect(sections[1].name).toBe('Lifestyle');
			expect(sections[2].name).toBe('Savings');
		});

		it('should sort children by sortOrder', () => {
			const categories: Category[] = [
				createCategory('sec-essential', 'Essential'),
				{
					...createCategory('cat-utilities', 'Utilities', 'sec-essential'),
					sortOrder: 2
				},
				{
					...createCategory('cat-groceries', 'Groceries', 'sec-essential'),
					sortOrder: 1
				}
			];

			const sections = groupCategoriesBySections(categories);

			expect(sections[0].children[0].name).toBe('Groceries');
			expect(sections[0].children[1].name).toBe('Utilities');
		});

		it('should return empty array when no valid sections exist', () => {
			const categories: Category[] = [
				createCategory('cat-1', 'Custom Category'),
				createCategory('cat-2', 'Another Category', 'cat-1')
			];

			const sections = groupCategoriesBySections(categories);
			expect(sections).toEqual([]);
		});
	});

	describe('calculateSectionTotals', () => {
		it('should calculate totals from child categories in cents', () => {
			const section = {
				id: 'sec-essential',
				name: 'Essential' as const,
				category: createCategory('sec-essential', 'Essential'),
				children: [
					createCategory('cat-groceries', 'Groceries', 'sec-essential'),
					createCategory('cat-utilities', 'Utilities', 'sec-essential')
				],
				sortOrder: 0
			};

			const cellsMap = new Map<string, BudgetCell>([
				[
					'cat-groceries:2025-01',
					{
						categoryId: 'cat-groceries',
						month: '2025-01',
						budgetedCents: 50000,
						actualCents: -35000,
						remainingCents: 15000
					}
				],
				[
					'cat-utilities:2025-01',
					{
						categoryId: 'cat-utilities',
						month: '2025-01',
						budgetedCents: 20000,
						actualCents: -18000,
						remainingCents: 2000
					}
				]
			]);

			const totals = calculateSectionTotals(section, '2025-01', cellsMap);

			expect(totals.budgetedCents).toBe(70000);
			expect(totals.actualCents).toBe(-53000);
			expect(totals.remainingCents).toBe(17000);
		});
	});

	describe('getSectionStatusClass', () => {
		it('should return empty string when budgetedCents is 0', () => {
			expect(getSectionStatusClass({ budgetedCents: 0, actualCents: 0, remainingCents: 0 })).toBe(
				''
			);
		});

		it('should return status-good when usage <= 75%', () => {
			expect(
				getSectionStatusClass({
					budgetedCents: 10000,
					actualCents: -7500,
					remainingCents: 2500
				})
			).toBe('status-good');
		});

		it('should return status-warning when usage > 75% and <= 100%', () => {
			expect(
				getSectionStatusClass({
					budgetedCents: 10000,
					actualCents: -9000,
					remainingCents: 1000
				})
			).toBe('status-warning');
		});

		it('should return status-danger when usage > 100%', () => {
			expect(
				getSectionStatusClass({
					budgetedCents: 10000,
					actualCents: -12000,
					remainingCents: -2000
				})
			).toBe('status-danger');
		});
	});

	describe('createDefaultSections', () => {
		it('should create 5 default sections', () => {
			const defaults = createDefaultSections();
			expect(defaults).toHaveLength(5);
		});

		it('should have Income as type income', () => {
			const defaults = createDefaultSections();
			const income = defaults.find((s) => s.name === 'Income');
			expect(income?.type).toBe('income');
		});

		it('should have all other sections as type expense', () => {
			const defaults = createDefaultSections();
			const nonIncome = defaults.filter((s) => s.name !== 'Income');
			nonIncome.forEach((s) => {
				expect(s.type).toBe('expense');
			});
		});
	});
});
