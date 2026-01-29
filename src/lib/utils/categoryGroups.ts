/**
 * Category grouping utilities for budget sections
 *
 * Groups categories into collapsible sections for the budget grid.
 */

import type { Category } from '$lib/types/category';
import type { MonthString } from '$lib/types/budget';
import type { BudgetCell } from '$lib/stores/budget';

/**
 * Budget section names in display order
 */
export const SECTION_ORDER = ['Income', 'Housing', 'Essential', 'Lifestyle', 'Savings'] as const;

export type SectionName = (typeof SECTION_ORDER)[number];

/**
 * Check if a category name matches a section name
 */
export function isSectionCategory(category: Category): boolean {
	return category.parentId === null && SECTION_ORDER.includes(category.name as SectionName);
}

/**
 * Get the section name for a category
 */
export function getSectionForCategory(
	category: Category,
	allCategories: Category[]
): SectionName | null {
	if (category.parentId === null) {
		return SECTION_ORDER.includes(category.name as SectionName)
			? (category.name as SectionName)
			: null;
	}

	// Find parent category
	const parent = allCategories.find((c) => c.id === category.parentId);
	if (parent) {
		return getSectionForCategory(parent, allCategories);
	}

	return null;
}

/**
 * Section with its child categories
 */
export interface CategorySection {
	id: string;
	name: SectionName;
	category: Category;
	children: Category[];
	sortOrder: number;
}

/**
 * Section totals for a single month
 */
export interface SectionTotals {
	budgetedCents: number;
	actualCents: number;
	remainingCents: number;
}

/**
 * Group categories by section
 * Returns sections in the defined order: Income, Housing, Essential, Lifestyle, Savings
 */
export function groupCategoriesBySections(categories: Category[]): CategorySection[] {
	const sectionMap = new Map<SectionName, CategorySection>();

	// First, find all section (parent) categories
	categories.forEach((category) => {
		if (category.parentId === null && SECTION_ORDER.includes(category.name as SectionName)) {
			sectionMap.set(category.name as SectionName, {
				id: category.id,
				name: category.name as SectionName,
				category,
				children: [],
				sortOrder: SECTION_ORDER.indexOf(category.name as SectionName)
			});
		}
	});

	// Then, add children to their parent sections
	categories.forEach((category) => {
		if (category.parentId) {
			// Find the parent
			const parent = categories.find((c) => c.id === category.parentId);
			if (parent && sectionMap.has(parent.name as SectionName)) {
				const section = sectionMap.get(parent.name as SectionName);
				if (section) {
					section.children.push(category);
				}
			}
		}
	});

	// Sort children within each section by sortOrder
	sectionMap.forEach((section) => {
		section.children.sort((a, b) => a.sortOrder - b.sortOrder);
	});

	// Return sections in defined order
	return SECTION_ORDER.map((name) => sectionMap.get(name)).filter(
		(s): s is CategorySection => s !== undefined
	);
}

/**
 * Calculate section totals for a given month
 */
export function calculateSectionTotals(
	section: CategorySection,
	month: MonthString,
	cellsMap: Map<string, BudgetCell>
): SectionTotals {
	let budgetedCents = 0;
	let actualCents = 0;

	section.children.forEach((category) => {
		const key = `${category.id}:${month}`;
		const cell = cellsMap.get(key);
		if (cell) {
			budgetedCents += cell.budgetedCents;
			actualCents += cell.actualCents;
		}
	});

	return {
		budgetedCents,
		actualCents,
		remainingCents: budgetedCents - Math.abs(actualCents)
	};
}

/**
 * Calculate section totals for all months
 */
export function calculateAllSectionTotals(
	section: CategorySection,
	months: MonthString[],
	cellsMap: Map<string, BudgetCell>
): Map<MonthString, SectionTotals> {
	const totals = new Map<MonthString, SectionTotals>();

	months.forEach((month) => {
		totals.set(month, calculateSectionTotals(section, month, cellsMap));
	});

	return totals;
}

/**
 * Get the status class for section totals based on budget usage
 */
export function getSectionStatusClass(totals: SectionTotals): string {
	if (totals.budgetedCents === 0) return '';

	const percentUsed = (Math.abs(totals.actualCents) / totals.budgetedCents) * 100;

	if (percentUsed <= 75) return 'status-good';
	if (percentUsed <= 100) return 'status-warning';
	return 'status-danger';
}

/**
 * Create default sections if categories don't exist
 * Used for initializing the database with standard sections
 */
export function createDefaultSections(): Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] {
	return SECTION_ORDER.map((name, index) => ({
		name,
		parentId: null,
		type: name === 'Income' ? ('income' as const) : ('expense' as const),
		icon: null,
		color: null,
		sortOrder: index
	}));
}
