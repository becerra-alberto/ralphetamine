import { describe, it, expect } from 'vitest';
import {
  isValidDateString,
  getCurrentDate,
  getMonthFromDate,
  formatTransactionAmount,
  isIncome,
  isExpense,
  parseAmountToCents,
  type Transaction,
  type TransactionInput,
  type TransactionFilters,
  type CategoryTotal
} from '../../types/transaction';

describe('Transaction Types', () => {
  describe('Transaction interface', () => {
    it('should define required Transaction properties', () => {
      const tx: Transaction = {
        id: 'tx-123',
        date: '2025-01-15',
        payee: 'Amazon',
        categoryId: 'cat-shopping',
        memo: 'Office supplies',
        amountCents: -5000,
        accountId: 'acct-checking',
        tags: ['work', 'supplies'],
        isReconciled: false,
        importSource: null,
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      expect(tx.id).toBe('tx-123');
      expect(tx.date).toBe('2025-01-15');
      expect(tx.payee).toBe('Amazon');
      expect(tx.amountCents).toBe(-5000);
      expect(tx.tags).toEqual(['work', 'supplies']);
    });

    it('should allow null categoryId for uncategorized', () => {
      const tx: Transaction = {
        id: 'tx-123',
        date: '2025-01-15',
        payee: 'Unknown',
        categoryId: null,
        memo: null,
        amountCents: -2500,
        accountId: 'acct-checking',
        tags: [],
        isReconciled: false,
        importSource: 'CSV',
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      expect(tx.categoryId).toBeNull();
    });
  });

  describe('TransactionInput interface', () => {
    it('should define required input properties', () => {
      const input: TransactionInput = {
        date: '2025-01-15',
        payee: 'Coffee Shop',
        amountCents: -450,
        accountId: 'acct-checking'
      };

      expect(input.date).toBe('2025-01-15');
      expect(input.payee).toBe('Coffee Shop');
      expect(input.amountCents).toBe(-450);
      expect(input.accountId).toBe('acct-checking');
    });

    it('should allow optional properties', () => {
      const input: TransactionInput = {
        date: '2025-01-15',
        payee: 'Coffee Shop',
        amountCents: -450,
        accountId: 'acct-checking',
        categoryId: 'cat-dining',
        memo: 'Morning coffee',
        tags: ['coffee'],
        isReconciled: true
      };

      expect(input.categoryId).toBe('cat-dining');
      expect(input.memo).toBe('Morning coffee');
      expect(input.tags).toEqual(['coffee']);
      expect(input.isReconciled).toBe(true);
    });
  });

  describe('TransactionFilters interface', () => {
    it('should define filter properties', () => {
      const filters: TransactionFilters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        categoryId: 'cat-groceries',
        accountId: 'acct-checking',
        search: 'supermarket',
        limit: 50,
        offset: 0
      };

      expect(filters.startDate).toBe('2025-01-01');
      expect(filters.endDate).toBe('2025-01-31');
      expect(filters.limit).toBe(50);
    });

    it('should support uncategorized filter', () => {
      const filters: TransactionFilters = {
        uncategorizedOnly: true,
        limit: 100
      };

      expect(filters.uncategorizedOnly).toBe(true);
    });
  });

  describe('CategoryTotal interface', () => {
    it('should include total and count', () => {
      const total: CategoryTotal = {
        categoryId: 'cat-groceries',
        categoryName: 'Groceries',
        totalCents: -35000,
        transactionCount: 12
      };

      expect(total.totalCents).toBe(-35000);
      expect(total.transactionCount).toBe(12);
    });
  });

  describe('isValidDateString', () => {
    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateString('2025-01-15')).toBe(true);
      expect(isValidDateString('2025-12-31')).toBe(true);
      expect(isValidDateString('2000-06-01')).toBe(true);
    });

    it('should return false for invalid month/day numbers', () => {
      expect(isValidDateString('2025-00-15')).toBe(false);
      expect(isValidDateString('2025-13-15')).toBe(false);
      expect(isValidDateString('2025-01-00')).toBe(false);
      expect(isValidDateString('2025-01-32')).toBe(false);
    });

    it('should return false for invalid formats', () => {
      expect(isValidDateString('Jan 15 2025')).toBe(false);
      expect(isValidDateString('2025/01/15')).toBe(false);
      expect(isValidDateString('15-01-2025')).toBe(false);
    });
  });

  describe('getCurrentDate', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const result = getCurrentDate();
      expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    });
  });

  describe('getMonthFromDate', () => {
    it('should extract month from date string', () => {
      expect(getMonthFromDate('2025-01-15')).toBe('2025-01');
      expect(getMonthFromDate('2025-12-31')).toBe('2025-12');
    });
  });

  describe('formatTransactionAmount', () => {
    it('should format positive amounts with plus sign', () => {
      expect(formatTransactionAmount(50000)).toBe('+500.00');
      expect(formatTransactionAmount(100)).toBe('+1.00');
    });

    it('should format negative amounts with minus sign', () => {
      expect(formatTransactionAmount(-50000)).toBe('-500.00');
      expect(formatTransactionAmount(-100)).toBe('-1.00');
    });

    it('should handle zero', () => {
      expect(formatTransactionAmount(0)).toBe('+0.00');
    });
  });

  describe('isIncome', () => {
    it('should return true for positive amounts', () => {
      expect(isIncome(10000)).toBe(true);
      expect(isIncome(1)).toBe(true);
    });

    it('should return false for zero and negative amounts', () => {
      expect(isIncome(0)).toBe(false);
      expect(isIncome(-5000)).toBe(false);
    });
  });

  describe('isExpense', () => {
    it('should return true for negative amounts', () => {
      expect(isExpense(-10000)).toBe(true);
      expect(isExpense(-1)).toBe(true);
    });

    it('should return false for zero and positive amounts', () => {
      expect(isExpense(0)).toBe(false);
      expect(isExpense(5000)).toBe(false);
    });
  });

  describe('parseAmountToCents', () => {
    it('should parse positive amounts', () => {
      expect(parseAmountToCents('500.00')).toBe(50000);
      expect(parseAmountToCents('+500.00')).toBe(50000);
    });

    it('should parse negative amounts', () => {
      expect(parseAmountToCents('-500.00')).toBe(-50000);
      expect(parseAmountToCents('-50.00')).toBe(-5000);
    });

    it('should handle formatted strings', () => {
      expect(parseAmountToCents('$1,234.56')).toBe(123456);
    });
  });
});
