/**
 * Duplicate detection for CSV imports.
 * Matches imported rows against existing transactions using date, amount, and payee.
 */

import type { Transaction } from '$lib/types/transaction';
import type { PreviewTransaction } from '$lib/utils/columnDetection';

export interface DuplicateMatch {
	/** Index in the import batch */
	importIndex: number;
	/** The imported transaction preview */
	imported: PreviewTransaction;
	/** The existing transaction it matches */
	existing: Transaction;
	/** Confidence: 'exact' | 'likely' */
	confidence: 'exact' | 'likely';
	/** Whether to include this transaction in the import (user decision) */
	include: boolean;
}

export interface DuplicateCheckResult {
	/** All import rows with duplicate info */
	duplicates: DuplicateMatch[];
	/** Import rows that are NOT duplicates */
	cleanCount: number;
	/** Total import rows */
	totalCount: number;
}

/**
 * Check imported transactions for duplicates against existing transactions.
 */
export function detectDuplicates(
	imported: PreviewTransaction[],
	existing: Transaction[]
): DuplicateCheckResult {
	const duplicates: DuplicateMatch[] = [];

	for (let i = 0; i < imported.length; i++) {
		const imp = imported[i];
		const match = findBestMatch(imp, existing);
		if (match) {
			duplicates.push({
				importIndex: i,
				imported: imp,
				existing: match.transaction,
				confidence: match.confidence,
				include: false // Default: skip duplicates
			});
		}
	}

	return {
		duplicates,
		cleanCount: imported.length - duplicates.length,
		totalCount: imported.length
	};
}

interface MatchResult {
	transaction: Transaction;
	confidence: 'exact' | 'likely';
}

/**
 * Find the best matching existing transaction for an import row.
 */
function findBestMatch(
	imp: PreviewTransaction,
	existing: Transaction[]
): MatchResult | null {
	for (const tx of existing) {
		// Must match date
		if (tx.date !== imp.date) continue;

		// Must match amount
		if (tx.amountCents !== imp.amountCents) continue;

		// Check payee match
		const payeeMatch = matchPayee(imp.payee, tx.payee);
		if (payeeMatch === 'exact') {
			return { transaction: tx, confidence: 'exact' };
		}
		if (payeeMatch === 'likely') {
			return { transaction: tx, confidence: 'likely' };
		}
	}

	return null;
}

/**
 * Compare two payee strings for matching.
 * Returns 'exact' for case-insensitive exact match,
 * 'likely' for fuzzy match (one contains the other, or high similarity),
 * 'none' for no match.
 */
export function matchPayee(
	a: string,
	b: string
): 'exact' | 'likely' | 'none' {
	const normA = normalizePayee(a);
	const normB = normalizePayee(b);

	if (!normA || !normB) return 'none';

	// Exact match (case-insensitive, trimmed)
	if (normA === normB) return 'exact';

	// Containment match: "Albert Heijn B.V." contains "Albert Heijn"
	if (normA.includes(normB) || normB.includes(normA)) return 'likely';

	// Similarity check (for minor typos/variations)
	const similarity = computeSimilarity(normA, normB);
	if (similarity >= 0.85) return 'likely';

	return 'none';
}

/**
 * Normalize a payee string for comparison.
 */
function normalizePayee(payee: string): string {
	return payee
		.toLowerCase()
		.trim()
		.replace(/[.,\-_'"]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/\b(b\.?v\.?|n\.?v\.?|inc\.?|ltd\.?|llc\.?|gmbh|bv|nv)\b/gi, '')
		.trim();
}

/**
 * Compute string similarity using Dice coefficient on bigrams.
 * Returns value between 0 (no match) and 1 (identical).
 */
export function computeSimilarity(a: string, b: string): number {
	if (a === b) return 1;
	if (a.length < 2 || b.length < 2) return 0;

	const bigramsA = getBigrams(a);
	const bigramsB = getBigrams(b);

	let intersection = 0;
	const bCopy = new Map(bigramsB);

	for (const [bigram, countA] of bigramsA) {
		const countB = bCopy.get(bigram) || 0;
		if (countB > 0) {
			intersection += Math.min(countA, countB);
			bCopy.set(bigram, countB - Math.min(countA, countB));
		}
	}

	const totalA = Array.from(bigramsA.values()).reduce((s, c) => s + c, 0);
	const totalB = Array.from(bigramsB.values()).reduce((s, c) => s + c, 0);

	return (2 * intersection) / (totalA + totalB);
}

function getBigrams(str: string): Map<string, number> {
	const bigrams = new Map<string, number>();
	for (let i = 0; i < str.length - 1; i++) {
		const bigram = str.substring(i, i + 2);
		bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
	}
	return bigrams;
}

/**
 * Get the date range from an array of preview transactions.
 */
export function getDateRange(
	transactions: PreviewTransaction[]
): { earliest: string; latest: string } | null {
	if (transactions.length === 0) return null;

	const dates = transactions
		.map((t) => t.date)
		.filter((d) => d && d.length > 0)
		.sort();

	if (dates.length === 0) return null;

	return {
		earliest: dates[0],
		latest: dates[dates.length - 1]
	};
}

/**
 * Build import summary statistics.
 */
export interface ImportSummary {
	totalTransactions: number;
	duplicatesFound: number;
	dateRange: { earliest: string; latest: string } | null;
	toImport: number;
}

export function buildImportSummary(
	transactions: PreviewTransaction[],
	duplicateResult: DuplicateCheckResult
): ImportSummary {
	const includedDuplicates = duplicateResult.duplicates.filter((d) => d.include).length;
	return {
		totalTransactions: transactions.length,
		duplicatesFound: duplicateResult.duplicates.length,
		dateRange: getDateRange(transactions),
		toImport: duplicateResult.cleanCount + includedDuplicates
	};
}
