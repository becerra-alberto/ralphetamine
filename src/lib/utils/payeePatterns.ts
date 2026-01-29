/**
 * Payee pattern detection for bulk category assignment.
 * Groups uncategorized transactions by payee and suggests categories
 * based on existing categorized transactions with the same payee.
 */

import type { Transaction } from '$lib/types/transaction';

export interface PayeePattern {
	/** The normalized payee name */
	payee: string;
	/** Transaction IDs matching this payee */
	transactionIds: string[];
	/** Number of uncategorized transactions with this payee */
	count: number;
	/** Suggested category ID (from existing categorized transactions) */
	suggestedCategoryId: string | null;
	/** Suggested category name */
	suggestedCategoryName: string | null;
	/** Confidence: how many existing transactions use this category */
	existingCount: number;
}

/**
 * Normalize a payee string for grouping.
 * Trims whitespace, lowercases, collapses whitespace, strips trailing punctuation.
 */
export function normalizePayeeForGrouping(payee: string): string {
	return payee
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/[.,;:!]+$/, '')
		.trim();
}

/**
 * Group uncategorized transactions by normalized payee.
 * Returns only groups with at least `minCount` transactions.
 */
export function groupByPayee(
	transactions: Transaction[],
	minCount: number = 2
): Map<string, Transaction[]> {
	const groups = new Map<string, Transaction[]>();

	for (const tx of transactions) {
		if (tx.categoryId !== null) continue;
		const key = normalizePayeeForGrouping(tx.payee);
		if (!key) continue;

		const group = groups.get(key) || [];
		group.push(tx);
		groups.set(key, group);
	}

	// Filter out groups below threshold
	for (const [key, group] of groups) {
		if (group.length < minCount) {
			groups.delete(key);
		}
	}

	return groups;
}

/**
 * Detect payee patterns from uncategorized transactions and suggest categories
 * based on existing categorized transactions with the same payee.
 *
 * @param uncategorized - Uncategorized transactions to analyze
 * @param allTransactions - All transactions (for finding category patterns)
 * @param minCount - Minimum group size for a pattern suggestion (default 2)
 */
export function detectPayeePatterns(
	uncategorized: Transaction[],
	allTransactions: Transaction[],
	minCount: number = 2
): PayeePattern[] {
	const groups = groupByPayee(uncategorized, minCount);

	// Build a map of payee -> most-used category from categorized transactions
	const categoryMap = buildCategoryMap(allTransactions);

	const patterns: PayeePattern[] = [];

	for (const [normalizedPayee, txGroup] of groups) {
		const suggestion = categoryMap.get(normalizedPayee);
		patterns.push({
			payee: txGroup[0].payee, // Use original case from first transaction
			transactionIds: txGroup.map((t) => t.id),
			count: txGroup.length,
			suggestedCategoryId: suggestion?.categoryId ?? null,
			suggestedCategoryName: suggestion?.categoryName ?? null,
			existingCount: suggestion?.count ?? 0
		});
	}

	// Sort by count descending (largest groups first)
	patterns.sort((a, b) => b.count - a.count);

	return patterns;
}

interface CategorySuggestion {
	categoryId: string;
	categoryName: string | null;
	count: number;
}

/**
 * Build a map of normalized payee -> most-used category from categorized transactions.
 */
function buildCategoryMap(transactions: Transaction[]): Map<string, CategorySuggestion> {
	// Group categorized transactions by payee, then count category usage
	const payeeCategoryCount = new Map<string, Map<string, { count: number; name: string | null }>>();

	for (const tx of transactions) {
		if (!tx.categoryId) continue;
		const key = normalizePayeeForGrouping(tx.payee);
		if (!key) continue;

		if (!payeeCategoryCount.has(key)) {
			payeeCategoryCount.set(key, new Map());
		}
		const categories = payeeCategoryCount.get(key)!;
		const existing = categories.get(tx.categoryId) || { count: 0, name: null };
		existing.count++;
		categories.set(tx.categoryId, existing);
	}

	// For each payee, find the most-used category
	const result = new Map<string, CategorySuggestion>();

	for (const [payee, categories] of payeeCategoryCount) {
		let best: CategorySuggestion | null = null;
		for (const [categoryId, data] of categories) {
			if (!best || data.count > best.count) {
				best = { categoryId, categoryName: data.name, count: data.count };
			}
		}
		if (best) {
			result.set(payee, best);
		}
	}

	return result;
}

/**
 * Format a pattern suggestion message.
 * e.g., "Categorize all 'Albert Heijn' as Groceries?"
 */
export function formatPatternSuggestion(pattern: PayeePattern): string {
	if (!pattern.suggestedCategoryName) {
		return `Categorize all ${pattern.count} '${pattern.payee}' transactions`;
	}
	return `Categorize all '${pattern.payee}' as ${pattern.suggestedCategoryName}?`;
}
