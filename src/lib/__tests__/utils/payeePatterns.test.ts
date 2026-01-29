import { describe, it, expect } from 'vitest';
import {
	detectPayeePatterns,
	formatPatternSuggestion,
	normalizePayeeForGrouping,
	groupByPayee,
	type PayeePattern
} from '../../utils/payeePatterns';
import type { Transaction } from '../../types/transaction';

function mockTransaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: 'tx-' + Math.random().toString(36).substring(2, 9),
		date: '2025-01-15',
		payee: 'Test Payee',
		categoryId: null,
		memo: null,
		amountCents: -5000,
		accountId: 'acc-1',
		tags: [],
		isReconciled: false,
		importSource: null,
		createdAt: '2025-01-15T10:00:00Z',
		updatedAt: '2025-01-15T10:00:00Z',
		...overrides
	};
}

describe('payeePatterns', () => {
	describe('normalizePayeeForGrouping', () => {
		it('should lowercase and trim', () => {
			expect(normalizePayeeForGrouping('  Albert Heijn  ')).toBe('albert heijn');
		});

		it('should collapse whitespace', () => {
			expect(normalizePayeeForGrouping('Albert   Heijn')).toBe('albert heijn');
		});

		it('should strip trailing punctuation', () => {
			expect(normalizePayeeForGrouping('Store Inc.')).toBe('store inc');
		});

		it('should handle empty string', () => {
			expect(normalizePayeeForGrouping('')).toBe('');
		});
	});

	describe('groupByPayee', () => {
		it('should group uncategorized transactions by normalized payee', () => {
			const txs = [
				mockTransaction({ payee: 'Albert Heijn', categoryId: null }),
				mockTransaction({ payee: 'albert heijn', categoryId: null }),
				mockTransaction({ payee: 'Jumbo', categoryId: null })
			];
			const groups = groupByPayee(txs, 2);
			expect(groups.size).toBe(1);
			expect(groups.get('albert heijn')?.length).toBe(2);
		});

		it('should exclude categorized transactions', () => {
			const txs = [
				mockTransaction({ payee: 'Shop', categoryId: 'cat-1' }),
				mockTransaction({ payee: 'Shop', categoryId: null })
			];
			const groups = groupByPayee(txs, 1);
			expect(groups.get('shop')?.length).toBe(1);
		});

		it('should filter by minimum count', () => {
			const txs = [
				mockTransaction({ payee: 'Rare Store', categoryId: null })
			];
			const groups = groupByPayee(txs, 3);
			expect(groups.size).toBe(0);
		});
	});

	describe('detectPayeePatterns', () => {
		it('should detect patterns with minimum 3 occurrences by default', () => {
			const uncategorized = [
				mockTransaction({ payee: 'Albert Heijn', categoryId: null }),
				mockTransaction({ payee: 'Albert Heijn', categoryId: null }),
				mockTransaction({ payee: 'Albert Heijn', categoryId: null }),
				mockTransaction({ payee: 'Jumbo', categoryId: null })
			];
			const all = [
				...uncategorized,
				mockTransaction({ payee: 'Albert Heijn', categoryId: 'cat-groceries' })
			];

			const patterns = detectPayeePatterns(uncategorized, all);
			expect(patterns.length).toBe(1);
			expect(patterns[0].payee).toBe('Albert Heijn');
			expect(patterns[0].count).toBe(3);
			expect(patterns[0].suggestedCategoryId).toBe('cat-groceries');
		});

		it('should detect patterns with custom minCount', () => {
			const uncategorized = [
				mockTransaction({ payee: 'Shop A', categoryId: null }),
				mockTransaction({ payee: 'Shop A', categoryId: null })
			];
			const patterns = detectPayeePatterns(uncategorized, uncategorized, 2);
			expect(patterns.length).toBe(1);
		});

		it('should handle payee variations (whitespace, punctuation)', () => {
			const uncategorized = [
				mockTransaction({ payee: 'Coffee Shop', categoryId: null }),
				mockTransaction({ payee: 'coffee shop', categoryId: null }),
				mockTransaction({ payee: ' Coffee Shop ', categoryId: null })
			];
			const patterns = detectPayeePatterns(uncategorized, uncategorized, 2);
			// All three should group together
			expect(patterns.length).toBe(1);
			expect(patterns[0].count).toBe(3);
		});

		it('should suggest categories from existing categorized transactions', () => {
			const uncategorized = [
				mockTransaction({ payee: 'Grocery Store', categoryId: null }),
				mockTransaction({ payee: 'Grocery Store', categoryId: null }),
				mockTransaction({ payee: 'Grocery Store', categoryId: null })
			];
			const allTx = [
				...uncategorized,
				mockTransaction({ payee: 'Grocery Store', categoryId: 'cat-food' }),
				mockTransaction({ payee: 'Grocery Store', categoryId: 'cat-food' }),
				mockTransaction({ payee: 'Grocery Store', categoryId: 'cat-other' })
			];

			const patterns = detectPayeePatterns(uncategorized, allTx);
			expect(patterns[0].suggestedCategoryId).toBe('cat-food');
		});

		it('should return null suggestion when no categorized transactions exist', () => {
			const uncategorized = [
				mockTransaction({ payee: 'New Store', categoryId: null }),
				mockTransaction({ payee: 'New Store', categoryId: null }),
				mockTransaction({ payee: 'New Store', categoryId: null })
			];

			const patterns = detectPayeePatterns(uncategorized, uncategorized);
			expect(patterns[0].suggestedCategoryId).toBeNull();
		});

		it('should sort patterns by count descending', () => {
			const uncategorized = [
				mockTransaction({ payee: 'A', categoryId: null }),
				mockTransaction({ payee: 'A', categoryId: null }),
				mockTransaction({ payee: 'B', categoryId: null }),
				mockTransaction({ payee: 'B', categoryId: null }),
				mockTransaction({ payee: 'B', categoryId: null })
			];

			const patterns = detectPayeePatterns(uncategorized, uncategorized, 2);
			expect(patterns[0].payee).toBe('B');
			expect(patterns[1].payee).toBe('A');
		});

		it('should include transaction IDs in pattern', () => {
			const tx1 = mockTransaction({ payee: 'Store', categoryId: null });
			const tx2 = mockTransaction({ payee: 'Store', categoryId: null });
			const patterns = detectPayeePatterns([tx1, tx2], [tx1, tx2], 2);
			expect(patterns[0].transactionIds).toContain(tx1.id);
			expect(patterns[0].transactionIds).toContain(tx2.id);
		});
	});

	describe('formatPatternSuggestion', () => {
		it('should format with category name', () => {
			const pattern: PayeePattern = {
				payee: 'Albert Heijn',
				count: 5,
				transactionIds: [],
				suggestedCategoryId: 'cat-1',
				suggestedCategoryName: 'Groceries',
				existingCount: 3
			};
			expect(formatPatternSuggestion(pattern)).toBe("Categorize all 'Albert Heijn' as Groceries?");
		});

		it('should format without category name', () => {
			const pattern: PayeePattern = {
				payee: 'New Store',
				count: 3,
				transactionIds: [],
				suggestedCategoryId: null,
				suggestedCategoryName: null,
				existingCount: 0
			};
			expect(formatPatternSuggestion(pattern)).toContain("Categorize all 3 'New Store' transactions");
		});
	});
});
