/**
 * Transaction API wrapper for Tauri backend communication
 *
 * Provides functions to interact with the transactions database through Tauri commands.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Transaction,
  TransactionInput,
  TransactionUpdate,
  TransactionFilters,
  CategoryTotal
} from '../types/transaction';

/**
 * Create a new transaction
 */
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  return invoke('create_transaction', {
    date: input.date,
    payee: input.payee,
    categoryId: input.categoryId,
    memo: input.memo,
    amountCents: input.amountCents,
    accountId: input.accountId,
    tags: input.tags || [],
    isReconciled: input.isReconciled || false,
    importSource: input.importSource
  });
}

/**
 * Get a transaction by ID
 */
export async function getTransaction(id: string): Promise<Transaction | null> {
  return invoke('get_transaction', { id });
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(id: string, update: TransactionUpdate): Promise<Transaction> {
  return invoke('update_transaction', { id, ...update });
}

/**
 * Delete a transaction by ID
 */
export async function deleteTransaction(id: string): Promise<void> {
  return invoke('delete_transaction', { id });
}

/**
 * Get transactions with optional filters
 */
export async function getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
  return invoke('get_transactions', { filters: filters || {} });
}

/**
 * Get transactions for a specific month
 */
export async function getTransactionsForMonth(month: string): Promise<Transaction[]> {
  const startDate = month + '-01';
  const parts = month.split('-').map(Number);
  const year = parts[0];
  const m = parts[1];
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = month + '-' + String(lastDay).padStart(2, '0');

  return getTransactions({ startDate, endDate });
}

/**
 * Get category totals for a specific month
 */
export async function getCategoryTotals(month: string): Promise<CategoryTotal[]> {
  return invoke('get_category_totals', { month });
}

/**
 * Get total for uncategorized transactions in a month
 */
export async function getUncategorizedTotal(month: string): Promise<number> {
  return invoke('get_uncategorized_total', { month });
}

/**
 * Get recent transactions (last N transactions)
 */
export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
  return invoke('get_recent_transactions', { limit });
}

/**
 * Search transactions by payee or memo
 */
export async function searchTransactions(query: string, limit?: number): Promise<Transaction[]> {
  return getTransactions({ search: query, limit });
}

/**
 * Get uncategorized transactions
 */
export async function getUncategorizedTransactions(limit?: number): Promise<Transaction[]> {
  return getTransactions({ uncategorizedOnly: true, limit });
}

/**
 * Bulk categorize transactions
 */
export async function bulkCategorize(
  transactionIds: string[],
  categoryId: string
): Promise<number> {
  return invoke('bulk_categorize_transactions', { transactionIds, categoryId });
}

/**
 * Import transactions from parsed CSV data
 */
export async function importTransactions(
  transactions: TransactionInput[],
  skipDuplicates?: boolean
): Promise<{ imported: number; skipped: number }> {
  return invoke('import_transactions', { transactions, skipDuplicates: skipDuplicates || true });
}

/**
 * Get unique payees for autocomplete
 */
export async function getUniquePayees(search?: string, limit?: number): Promise<string[]> {
  return invoke('get_unique_payees', { search, limit: limit || 20 });
}

export interface PayeeSuggestion {
  payee: string;
  frequency: number;
}

export interface PayeeCategoryAssociation {
  payee: string;
  categoryId: string;
  count: number;
}

/**
 * Get payee suggestions sorted by frequency
 */
export async function getPayeeSuggestions(search?: string, limit?: number): Promise<PayeeSuggestion[]> {
  return invoke('get_payee_suggestions', { search, limit: limit || 10 });
}

/**
 * Get the most-used category for a given payee
 */
export async function getPayeeCategory(payee: string): Promise<PayeeCategoryAssociation | null> {
  return invoke('get_payee_category', { payee });
}

/**
 * Get unique tags for autocomplete
 */
export async function getUniqueTags(search?: string, limit?: number): Promise<string[]> {
  return invoke('get_unique_tags', { search, limit: limit || 20 });
}

export interface PaginatedTransactionsParams {
  limit: number;
  offset: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: TransactionFilters;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Get paginated transactions with sorting and filtering
 */
export async function getTransactionsPaginated(
  params: PaginatedTransactionsParams
): Promise<PaginatedResult<Transaction>> {
  const { limit, offset, sortField = 'date', sortDirection = 'desc', filters } = params;

  // Get all transactions matching filters, then apply pagination
  const allTransactions = await getTransactions(filters);

  // Sort transactions
  const sorted = [...allTransactions].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'payee':
        comparison = a.payee.localeCompare(b.payee);
        break;
      case 'amount_cents':
        comparison = a.amountCents - b.amountCents;
        break;
      default:
        comparison = a.date.localeCompare(b.date);
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Apply pagination
  const items = sorted.slice(offset, offset + limit);

  return {
    items,
    totalCount: allTransactions.length,
    hasMore: offset + limit < allTransactions.length
  };
}
