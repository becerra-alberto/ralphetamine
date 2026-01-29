/**
 * Transaction types for Stackz budget management
 *
 * Transactions represent individual financial entries (income/expense).
 * Amounts are stored in cents (integer) - positive = income, negative = expense.
 */

/**
 * Represents a financial transaction
 */
export interface Transaction {
  /** Unique identifier (UUID) */
  id: string;
  /** Transaction date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Payee/merchant name */
  payee: string;
  /** Category ID (null for uncategorized transactions) */
  categoryId: string | null;
  /** Optional memo/description */
  memo: string | null;
  /** Amount in cents (positive = income, negative = expense) */
  amountCents: number;
  /** Account ID (foreign key to accounts table) */
  accountId: string;
  /** Tags as JSON array of strings */
  tags: string[];
  /** Whether the transaction has been reconciled */
  isReconciled: boolean;
  /** Source of import (e.g., "CSV", "Manual") */
  importSource: string | null;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
}

/**
 * Transaction with computed display values
 */
export interface TransactionWithDisplay extends Transaction {
  /** Formatted amount for display (e.g., "-50.00" or "+100.00") */
  amountDisplay: string;
  /** Category name for display */
  categoryName?: string;
  /** Account name for display */
  accountName?: string;
  /** Whether amount is income (positive) */
  isIncome: boolean;
  /** Whether amount is expense (negative) */
  isExpense: boolean;
}

/**
 * Transaction with related entity details (for list views)
 */
export interface TransactionWithDetails extends Transaction {
  /** Category name */
  categoryName?: string | null;
  /** Category type */
  categoryType?: string | null;
  /** Account name */
  accountName: string;
  /** Account type */
  accountType: string;
}

/**
 * Input for creating a new transaction
 */
export interface TransactionInput {
  date: string;
  payee: string;
  categoryId?: string;
  memo?: string;
  amountCents: number;
  accountId: string;
  tags?: string[];
  isReconciled?: boolean;
  importSource?: string;
}

/**
 * Input for updating an existing transaction (all fields optional)
 */
export interface TransactionUpdateInput {
  date?: string;
  payee?: string;
  categoryId?: string | null;
  memo?: string | null;
  amountCents?: number;
  accountId?: string;
  tags?: string[];
  isReconciled?: boolean;
}

/**
 * Alias for backward compatibility
 */
export type TransactionUpdate = TransactionUpdateInput;

/**
 * Filter options for querying transactions
 */
export interface TransactionFilters {
  /** Start date (inclusive) */
  startDate?: string;
  /** End date (inclusive) */
  endDate?: string;
  /** Filter by category ID */
  categoryId?: string | null;
  /** Filter by multiple category IDs */
  categoryIds?: string[];
  /** Filter by account ID */
  accountId?: string;
  /** Filter by multiple account IDs */
  accountIds?: string[];
  /** Filter by payee */
  payee?: string;
  /** Search term for payee/memo */
  search?: string;
  /** Filter by single tag */
  tag?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by reconciled status */
  isReconciled?: boolean;
  /** Only show uncategorized transactions */
  uncategorizedOnly?: boolean;
  /** Minimum amount in cents */
  minAmountCents?: number;
  /** Maximum amount in cents */
  maxAmountCents?: number;
  /** Transaction type: "income", "expense", or undefined for all */
  transactionType?: 'income' | 'expense';
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Sort options for transactions
 */
export interface TransactionSort {
  field: 'date' | 'payee' | 'amountCents' | 'createdAt';
  direction: 'asc' | 'desc';
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Category total for a given period
 */
export interface CategoryTotal {
  categoryId: string | null;
  categoryName?: string | null;
  /** Total amount in cents */
  totalCents: number;
  /** Number of transactions */
  transactionCount: number;
}

/**
 * Monthly spending summary
 */
export interface MonthlySpendingSummary {
  /** Month in YYYY-MM format */
  month: string;
  /** Total income in cents */
  incomeCents: number;
  /** Total expenses in cents (positive number) */
  expensesCents: number;
  /** Net change (income - expenses) */
  netCents: number;
  /** Number of transactions */
  transactionCount: number;
}

/**
 * Validate transaction date format (YYYY-MM-DD)
 */
export function isValidDate(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);
}

/**
 * Alias for backward compatibility
 */
export const isValidDateString = isValidDate;

/**
 * Get current date as YYYY-MM-DD string
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Alias for backward compatibility
 */
export const getCurrentDate = getTodayDate;

/**
 * Get the month portion of a date string
 */
export function getMonthFromDate(date: string): string {
  return date.substring(0, 7);
}

/**
 * Format cents as currency display string
 */
export function formatAmount(cents: number, currency: string = 'EUR'): string {
  const absValue = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';

  const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    CAD: 'C$',
    GBP: '£'
  };

  const symbol = currencySymbols[currency] || currency + ' ';
  return sign + symbol + absValue.toFixed(2);
}

/**
 * Format cents to a display string with sign
 */
export function formatAmountWithSign(cents: number, currency: string = 'EUR'): string {
  const absValue = Math.abs(cents) / 100;
  const sign = cents >= 0 ? '+' : '-';

  const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    CAD: 'C$',
    GBP: '£'
  };

  const symbol = currencySymbols[currency] || currency + ' ';
  return sign + symbol + absValue.toFixed(2);
}

/**
 * Format cents to a display string with sign (alias)
 */
export function formatTransactionAmount(cents: number): string {
  const absValue = Math.abs(cents) / 100;
  const formatted = absValue.toFixed(2);
  return cents >= 0 ? '+' + formatted : '-' + formatted;
}

/**
 * Check if a transaction/amount is income (positive amount)
 * Can accept either a number (cents) or an object with amountCents property
 */
export function isIncome(transactionOrAmount: number | { amountCents: number }): boolean {
  const amount = typeof transactionOrAmount === 'number'
    ? transactionOrAmount
    : transactionOrAmount.amountCents;
  return amount > 0;
}

/**
 * Check if a transaction/amount is an expense (negative amount)
 * Can accept either a number (cents) or an object with amountCents property
 */
export function isExpense(transactionOrAmount: number | { amountCents: number }): boolean {
  const amount = typeof transactionOrAmount === 'number'
    ? transactionOrAmount
    : transactionOrAmount.amountCents;
  return amount < 0;
}

/**
 * Parse a display amount string to cents
 * Handles formats like "50.00", "-50.00", "+50.00"
 */
export function parseAmountToCents(display: string): number {
  const cleaned = display.replace(/[^0-9.-]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
}

/**
 * Generate a UUID v4 for transaction ID
 */
export function generateTransactionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
