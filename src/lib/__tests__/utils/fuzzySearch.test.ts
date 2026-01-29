import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzySearch } from '../../utils/fuzzySearch';

describe('fuzzyScore', () => {
	it('should return 0 for empty query', () => {
		expect(fuzzyScore('', 'anything')).toBe(0);
	});

	it('should return 0 for exact start match', () => {
		expect(fuzzyScore('go', 'Go to Budget')).toBe(0);
	});

	it('should return positive score for substring match not at start', () => {
		const score = fuzzyScore('budget', 'Go to Budget');
		expect(score).toBeGreaterThan(0);
	});

	it('should return -1 for no match', () => {
		expect(fuzzyScore('xyz', 'Go to Budget')).toBe(-1);
	});

	it('should match "bud" to "Go to Budget"', () => {
		const score = fuzzyScore('bud', 'Go to Budget');
		expect(score).toBeGreaterThanOrEqual(0);
	});

	it('should match "trans" to "Go to Transactions"', () => {
		const score = fuzzyScore('trans', 'Go to Transactions');
		expect(score).toBeGreaterThanOrEqual(0);
	});

	it('should be case insensitive', () => {
		const score = fuzzyScore('BUDGET', 'Go to Budget');
		expect(score).toBeGreaterThanOrEqual(0);
	});
});

describe('fuzzySearch', () => {
	const items = [
		{ id: 'home', label: 'Go to Home' },
		{ id: 'budget', label: 'Go to Budget' },
		{ id: 'transactions', label: 'Go to Transactions' },
		{ id: 'net-worth', label: 'Go to Net Worth' },
		{ id: 'new-transaction', label: 'New Transaction' },
		{ id: 'search', label: 'Search Transactions' },
		{ id: 'adjust', label: 'Adjust Budgets' }
	];

	it('should return all items for empty query', () => {
		const results = fuzzySearch(items, '', (i) => i.label);
		expect(results).toHaveLength(items.length);
	});

	it('should filter "bud" to match Budget commands', () => {
		const results = fuzzySearch(items, 'bud', (i) => i.label);
		const labels = results.map((r) => r.item.label);
		expect(labels).toContain('Go to Budget');
		expect(labels).toContain('Adjust Budgets');
	});

	it('should filter "trans" to match Transaction commands', () => {
		const results = fuzzySearch(items, 'trans', (i) => i.label);
		const labels = results.map((r) => r.item.label);
		expect(labels).toContain('Go to Transactions');
		expect(labels).toContain('New Transaction');
		expect(labels).toContain('Search Transactions');
	});

	it('should return empty array for non-matching query', () => {
		const results = fuzzySearch(items, 'zzzzz', (i) => i.label);
		expect(results).toHaveLength(0);
	});

	it('should sort better matches first', () => {
		const results = fuzzySearch(items, 'budget', (i) => i.label);
		// "Go to Budget" contains exact substring, should rank first
		expect(results[0].item.label).toBe('Go to Budget');
	});

	it('should match "home" to Go to Home', () => {
		const results = fuzzySearch(items, 'home', (i) => i.label);
		expect(results.some((r) => r.item.label === 'Go to Home')).toBe(true);
	});

	it('should match "net" to Go to Net Worth', () => {
		const results = fuzzySearch(items, 'net', (i) => i.label);
		expect(results.some((r) => r.item.label === 'Go to Net Worth')).toBe(true);
	});
});
