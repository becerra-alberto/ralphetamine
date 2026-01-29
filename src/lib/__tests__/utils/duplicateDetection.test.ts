import { describe, it, expect } from 'vitest';
import {
	detectDuplicates,
	matchPayee,
	computeSimilarity,
	getDateRange,
	buildImportSummary,
	type DuplicateCheckResult
} from '../../utils/duplicateDetection';
import type { PreviewTransaction } from '../../utils/columnDetection';
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

function mockPreview(overrides: Partial<PreviewTransaction> = {}): PreviewTransaction {
	return {
		date: '2025-01-15',
		payee: 'Test Payee',
		amountCents: -5000,
		memo: '',
		category: '',
		...overrides
	};
}

describe('duplicateDetection', () => {
	describe('detectDuplicates', () => {
		it('should detect exact duplicate (same date + amount + payee)', () => {
			const imported = [mockPreview({ date: '2025-01-15', payee: 'Coffee Shop', amountCents: -450 })];
			const existing = [mockTransaction({ date: '2025-01-15', payee: 'Coffee Shop', amountCents: -450 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates).toHaveLength(1);
			expect(result.duplicates[0].confidence).toBe('exact');
			expect(result.duplicates[0].importIndex).toBe(0);
		});

		it('should detect case-insensitive payee match', () => {
			const imported = [mockPreview({ payee: 'ALBERT HEIJN', amountCents: -2500 })];
			const existing = [mockTransaction({ payee: 'Albert Heijn', amountCents: -2500 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates).toHaveLength(1);
			expect(result.duplicates[0].confidence).toBe('exact');
		});

		it('should detect match with company suffix (B.V. stripped by normalizer)', () => {
			const imported = [mockPreview({ payee: 'Albert Heijn B.V.', amountCents: -2500 })];
			const existing = [mockTransaction({ payee: 'Albert Heijn', amountCents: -2500 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates).toHaveLength(1);
			// Normalization strips B.V., so both become "albert heijn" => exact
			expect(result.duplicates[0].confidence).toBe('exact');
		});

		it('should not match same payee with different dates', () => {
			const imported = [mockPreview({ date: '2025-01-20', payee: 'Coffee Shop', amountCents: -450 })];
			const existing = [mockTransaction({ date: '2025-01-15', payee: 'Coffee Shop', amountCents: -450 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates).toHaveLength(0);
		});

		it('should not match same date/payee with different amounts', () => {
			const imported = [mockPreview({ payee: 'Coffee Shop', amountCents: -450 })];
			const existing = [mockTransaction({ payee: 'Coffee Shop', amountCents: -900 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates).toHaveLength(0);
		});

		it('should report correct clean count', () => {
			const imported = [
				mockPreview({ payee: 'Coffee Shop', amountCents: -450 }),
				mockPreview({ payee: 'Grocery Store', amountCents: -3000 }),
				mockPreview({ payee: 'Gas Station', amountCents: -5000 })
			];
			const existing = [mockTransaction({ payee: 'Coffee Shop', amountCents: -450 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates).toHaveLength(1);
			expect(result.cleanCount).toBe(2);
			expect(result.totalCount).toBe(3);
		});

		it('should handle empty imported list', () => {
			const result = detectDuplicates([], [mockTransaction()]);
			expect(result.duplicates).toHaveLength(0);
			expect(result.cleanCount).toBe(0);
			expect(result.totalCount).toBe(0);
		});

		it('should handle empty existing list', () => {
			const imported = [mockPreview(), mockPreview()];
			const result = detectDuplicates(imported, []);
			expect(result.duplicates).toHaveLength(0);
			expect(result.cleanCount).toBe(2);
		});

		it('should default duplicates to include: false', () => {
			const imported = [mockPreview({ payee: 'Shop', amountCents: -1000 })];
			const existing = [mockTransaction({ payee: 'Shop', amountCents: -1000 })];

			const result = detectDuplicates(imported, existing);
			expect(result.duplicates[0].include).toBe(false);
		});

		it('should handle large datasets efficiently', () => {
			const imported: PreviewTransaction[] = [];
			for (let i = 0; i < 100; i++) {
				imported.push(mockPreview({ payee: `Payee ${i}`, amountCents: -(i + 1) * 100 }));
			}
			const existing: Transaction[] = [];
			for (let i = 0; i < 1000; i++) {
				existing.push(mockTransaction({ payee: `Payee ${i}`, amountCents: -(i + 1) * 100 }));
			}

			const start = Date.now();
			const result = detectDuplicates(imported, existing);
			const elapsed = Date.now() - start;

			// Should detect duplicates for matching payees
			expect(result.duplicates.length).toBeGreaterThan(0);
			// Should complete in under 2 seconds
			expect(elapsed).toBeLessThan(2000);
		});
	});

	describe('matchPayee', () => {
		it('should return exact for case-insensitive match', () => {
			expect(matchPayee('Coffee Shop', 'coffee shop')).toBe('exact');
		});

		it('should return exact for same string', () => {
			expect(matchPayee('Store', 'Store')).toBe('exact');
		});

		it('should return exact when normalization strips B.V. suffix', () => {
			// normalizePayee strips B.V., so both become "albert heijn"
			expect(matchPayee('Albert Heijn B.V.', 'Albert Heijn')).toBe('exact');
		});

		it('should return exact for reverse case with suffix stripped', () => {
			expect(matchPayee('Albert Heijn', 'Albert Heijn B.V.')).toBe('exact');
		});

		it('should return likely for actual containment (no suffix stripping)', () => {
			expect(matchPayee('Albert Heijn Store', 'Albert Heijn')).toBe('likely');
		});

		it('should return none for completely different strings', () => {
			expect(matchPayee('Coffee Shop', 'Gas Station')).toBe('none');
		});

		it('should return none for empty strings', () => {
			expect(matchPayee('', 'Store')).toBe('none');
			expect(matchPayee('Store', '')).toBe('none');
		});

		it('should normalize company suffixes (B.V., Inc, etc)', () => {
			// GmbH stripped by normalizer, both become "rewe group"
			expect(matchPayee('REWE Group', 'REWE Group GmbH')).toBe('exact');
		});

		it('should handle punctuation differences', () => {
			expect(matchPayee("McDonald's", 'McDonalds')).toBe('exact');
		});
	});

	describe('computeSimilarity', () => {
		it('should return 1 for identical strings', () => {
			expect(computeSimilarity('hello', 'hello')).toBe(1);
		});

		it('should return 0 for completely different strings', () => {
			expect(computeSimilarity('abc', 'xyz')).toBe(0);
		});

		it('should return high similarity for similar strings', () => {
			const sim = computeSimilarity('coffee shop', 'coffe shop');
			expect(sim).toBeGreaterThan(0.8);
		});

		it('should return 0 for single character strings', () => {
			expect(computeSimilarity('a', 'a')).toBe(1); // identical
			expect(computeSimilarity('a', 'b')).toBe(0); // too short for bigrams
		});
	});

	describe('getDateRange', () => {
		it('should return earliest and latest dates', () => {
			const transactions: PreviewTransaction[] = [
				mockPreview({ date: '2025-01-15' }),
				mockPreview({ date: '2025-01-10' }),
				mockPreview({ date: '2025-01-20' })
			];
			const range = getDateRange(transactions);
			expect(range).toEqual({ earliest: '2025-01-10', latest: '2025-01-20' });
		});

		it('should return null for empty list', () => {
			expect(getDateRange([])).toBeNull();
		});

		it('should handle single transaction', () => {
			const range = getDateRange([mockPreview({ date: '2025-01-15' })]);
			expect(range).toEqual({ earliest: '2025-01-15', latest: '2025-01-15' });
		});

		it('should filter out empty date strings', () => {
			const transactions = [
				mockPreview({ date: '' }),
				mockPreview({ date: '2025-01-15' }),
				mockPreview({ date: '' })
			];
			const range = getDateRange(transactions);
			expect(range).toEqual({ earliest: '2025-01-15', latest: '2025-01-15' });
		});
	});

	describe('buildImportSummary', () => {
		it('should build correct summary with no duplicates', () => {
			const transactions = [mockPreview(), mockPreview(), mockPreview()];
			const dupResult: DuplicateCheckResult = {
				duplicates: [],
				cleanCount: 3,
				totalCount: 3
			};

			const summary = buildImportSummary(transactions, dupResult);
			expect(summary.totalTransactions).toBe(3);
			expect(summary.duplicatesFound).toBe(0);
			expect(summary.toImport).toBe(3);
		});

		it('should account for duplicates in toImport count', () => {
			const transactions = [mockPreview(), mockPreview(), mockPreview()];
			const dupResult: DuplicateCheckResult = {
				duplicates: [{
					importIndex: 0,
					imported: transactions[0],
					existing: mockTransaction(),
					confidence: 'exact',
					include: false
				}],
				cleanCount: 2,
				totalCount: 3
			};

			const summary = buildImportSummary(transactions, dupResult);
			expect(summary.totalTransactions).toBe(3);
			expect(summary.duplicatesFound).toBe(1);
			expect(summary.toImport).toBe(2);
		});

		it('should include marked duplicates in toImport', () => {
			const transactions = [mockPreview(), mockPreview()];
			const dupResult: DuplicateCheckResult = {
				duplicates: [{
					importIndex: 0,
					imported: transactions[0],
					existing: mockTransaction(),
					confidence: 'exact',
					include: true // User chose to include
				}],
				cleanCount: 1,
				totalCount: 2
			};

			const summary = buildImportSummary(transactions, dupResult);
			expect(summary.toImport).toBe(2); // 1 clean + 1 included duplicate
		});

		it('should include date range', () => {
			const transactions = [
				mockPreview({ date: '2025-01-10' }),
				mockPreview({ date: '2025-01-20' })
			];
			const dupResult: DuplicateCheckResult = {
				duplicates: [],
				cleanCount: 2,
				totalCount: 2
			};

			const summary = buildImportSummary(transactions, dupResult);
			expect(summary.dateRange).toEqual({ earliest: '2025-01-10', latest: '2025-01-20' });
		});
	});
});
