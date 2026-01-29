import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as transactionsApi from '../../api/transactions';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

import { invoke } from '@tauri-apps/api/core';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('Transactions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should call invoke with create_transaction command', async () => {
      const mockTx = {
        id: 'tx-123',
        date: '2025-01-15',
        payee: 'Amazon',
        categoryId: 'cat-shopping',
        amountCents: -5000,
        accountId: 'acct-checking'
      };
      mockInvoke.mockResolvedValue(mockTx);

      const input = {
        date: '2025-01-15',
        payee: 'Amazon',
        amountCents: -5000,
        accountId: 'acct-checking'
      };

      const result = await transactionsApi.createTransaction(input);

      expect(mockInvoke).toHaveBeenCalledWith('create_transaction', {
        date: '2025-01-15',
        payee: 'Amazon',
        categoryId: undefined,
        memo: undefined,
        amountCents: -5000,
        accountId: 'acct-checking',
        tags: [],
        isReconciled: false,
        importSource: undefined
      });
      expect(result).toEqual(mockTx);
    });
  });

  describe('getTransaction', () => {
    it('should call invoke with get_transaction command', async () => {
      const mockTx = { id: 'tx-123', date: '2025-01-15', payee: 'Amazon' };
      mockInvoke.mockResolvedValue(mockTx);

      const result = await transactionsApi.getTransaction('tx-123');

      expect(mockInvoke).toHaveBeenCalledWith('get_transaction', { id: 'tx-123' });
      expect(result).toEqual(mockTx);
    });

    it('should return null when transaction not found', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await transactionsApi.getTransaction('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateTransaction', () => {
    it('should call invoke with update_transaction command', async () => {
      const mockTx = { id: 'tx-123', payee: 'Updated Payee' };
      mockInvoke.mockResolvedValue(mockTx);

      const result = await transactionsApi.updateTransaction('tx-123', {
        payee: 'Updated Payee'
      });

      expect(mockInvoke).toHaveBeenCalledWith('update_transaction', {
        id: 'tx-123',
        payee: 'Updated Payee'
      });
      expect(result).toEqual(mockTx);
    });
  });

  describe('deleteTransaction', () => {
    it('should call invoke with delete_transaction command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await transactionsApi.deleteTransaction('tx-123');

      expect(mockInvoke).toHaveBeenCalledWith('delete_transaction', { id: 'tx-123' });
    });
  });

  describe('getTransactions', () => {
    it('should call invoke with get_transactions command', async () => {
      const mockTxs = [{ id: 'tx-1' }, { id: 'tx-2' }];
      mockInvoke.mockResolvedValue(mockTxs);

      const result = await transactionsApi.getTransactions({
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(mockInvoke).toHaveBeenCalledWith('get_transactions', {
        filters: { startDate: '2025-01-01', endDate: '2025-01-31' }
      });
      expect(result).toEqual(mockTxs);
    });

    it('should use empty filters object when none provided', async () => {
      mockInvoke.mockResolvedValue([]);

      await transactionsApi.getTransactions();

      expect(mockInvoke).toHaveBeenCalledWith('get_transactions', { filters: {} });
    });
  });

  describe('getTransactionsForMonth', () => {
    it('should calculate correct date range for month', async () => {
      mockInvoke.mockResolvedValue([]);

      await transactionsApi.getTransactionsForMonth('2025-01');

      expect(mockInvoke).toHaveBeenCalledWith('get_transactions', {
        filters: { startDate: '2025-01-01', endDate: '2025-01-31' }
      });
    });

    it('should handle February correctly', async () => {
      mockInvoke.mockResolvedValue([]);

      await transactionsApi.getTransactionsForMonth('2025-02');

      expect(mockInvoke).toHaveBeenCalledWith('get_transactions', {
        filters: { startDate: '2025-02-01', endDate: '2025-02-28' }
      });
    });
  });

  describe('getCategoryTotals', () => {
    it('should call invoke with get_category_totals command', async () => {
      const mockTotals = [
        { categoryId: 'cat-1', totalCents: -50000, transactionCount: 5 }
      ];
      mockInvoke.mockResolvedValue(mockTotals);

      const result = await transactionsApi.getCategoryTotals('2025-01');

      expect(mockInvoke).toHaveBeenCalledWith('get_category_totals', {
        month: '2025-01'
      });
      expect(result).toEqual(mockTotals);
    });
  });

  describe('getUncategorizedTotal', () => {
    it('should call invoke with get_uncategorized_total command', async () => {
      mockInvoke.mockResolvedValue(-15000);

      const result = await transactionsApi.getUncategorizedTotal('2025-01');

      expect(mockInvoke).toHaveBeenCalledWith('get_uncategorized_total', {
        month: '2025-01'
      });
      expect(result).toBe(-15000);
    });
  });

  describe('getRecentTransactions', () => {
    it('should call invoke with get_recent_transactions command', async () => {
      const mockTxs = [{ id: 'tx-1' }, { id: 'tx-2' }];
      mockInvoke.mockResolvedValue(mockTxs);

      const result = await transactionsApi.getRecentTransactions(5);

      expect(mockInvoke).toHaveBeenCalledWith('get_recent_transactions', { limit: 5 });
      expect(result).toEqual(mockTxs);
    });

    it('should use default limit of 10', async () => {
      mockInvoke.mockResolvedValue([]);

      await transactionsApi.getRecentTransactions();

      expect(mockInvoke).toHaveBeenCalledWith('get_recent_transactions', { limit: 10 });
    });
  });

  describe('getUncategorizedTransactions', () => {
    it('should filter for uncategorized only', async () => {
      mockInvoke.mockResolvedValue([]);

      await transactionsApi.getUncategorizedTransactions();

      expect(mockInvoke).toHaveBeenCalledWith('get_transactions', {
        filters: { uncategorizedOnly: true, limit: undefined }
      });
    });
  });

  describe('bulkCategorize', () => {
    it('should call invoke with bulk_categorize_transactions command', async () => {
      mockInvoke.mockResolvedValue(5);

      const result = await transactionsApi.bulkCategorize(
        ['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'],
        'cat-groceries'
      );

      expect(mockInvoke).toHaveBeenCalledWith('bulk_categorize_transactions', {
        transactionIds: ['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'],
        categoryId: 'cat-groceries'
      });
      expect(result).toBe(5);
    });
  });

  describe('importTransactions', () => {
    it('should call invoke with import_transactions command', async () => {
      mockInvoke.mockResolvedValue({ imported: 10, skipped: 2 });

      const transactions = [
        { date: '2025-01-15', payee: 'Test', amountCents: -5000, accountId: 'acct-1' }
      ];

      const result = await transactionsApi.importTransactions(transactions);

      expect(mockInvoke).toHaveBeenCalledWith('import_transactions', {
        transactions,
        skipDuplicates: true
      });
      expect(result).toEqual({ imported: 10, skipped: 2 });
    });
  });

  describe('getUniquePayees', () => {
    it('should call invoke with get_unique_payees command', async () => {
      mockInvoke.mockResolvedValue(['Amazon', 'Walmart', 'Target']);

      const result = await transactionsApi.getUniquePayees('am');

      expect(mockInvoke).toHaveBeenCalledWith('get_unique_payees', {
        search: 'am',
        limit: 20
      });
      expect(result).toEqual(['Amazon', 'Walmart', 'Target']);
    });
  });

  describe('getUniqueTags', () => {
    it('should call invoke with get_unique_tags command', async () => {
      mockInvoke.mockResolvedValue(['work', 'personal', 'groceries']);

      const result = await transactionsApi.getUniqueTags();

      expect(mockInvoke).toHaveBeenCalledWith('get_unique_tags', {
        search: undefined,
        limit: 20
      });
      expect(result).toEqual(['work', 'personal', 'groceries']);
    });
  });
});
