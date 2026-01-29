/**
 * Simple fuzzy search for command palette.
 * Matches query characters in order within the target string.
 * Returns a score (lower is better match) or -1 for no match.
 */

export interface FuzzyResult<T> {
	item: T;
	score: number;
}

/**
 * Score a single item against a query string.
 * Returns -1 if no match, otherwise a score where lower = better.
 */
export function fuzzyScore(query: string, target: string): number {
	if (!query) return 0;

	const q = query.toLowerCase();
	const t = target.toLowerCase();

	// Exact substring match gets best score
	if (t.includes(q)) {
		const idx = t.indexOf(q);
		// Prefer matches at start of words
		return idx === 0 ? 0 : idx;
	}

	// Character-by-character fuzzy match
	let qi = 0;
	let score = 0;
	let lastMatchIdx = -1;

	for (let ti = 0; ti < t.length && qi < q.length; ti++) {
		if (t[ti] === q[qi]) {
			// Penalize gaps between matched characters
			if (lastMatchIdx >= 0) {
				score += (ti - lastMatchIdx - 1) * 2;
			}
			lastMatchIdx = ti;
			qi++;
		}
	}

	// All query characters must be found
	if (qi < q.length) return -1;

	// Base score from character positions + gap penalty
	return score + 100;
}

/**
 * Filter and sort items by fuzzy match against a query.
 * Returns items sorted by score (best match first).
 */
export function fuzzySearch<T>(
	items: T[],
	query: string,
	getText: (item: T) => string
): FuzzyResult<T>[] {
	if (!query.trim()) {
		return items.map((item) => ({ item, score: 0 }));
	}

	const results: FuzzyResult<T>[] = [];

	for (const item of items) {
		const text = getText(item);
		const score = fuzzyScore(query, text);
		if (score >= 0) {
			results.push({ item, score });
		}
	}

	results.sort((a, b) => a.score - b.score);
	return results;
}
