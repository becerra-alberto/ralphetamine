/**
 * Account types for Stackz financial tracking
 */

/** Valid account type values */
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';

/** All valid account types */
export const ACCOUNT_TYPES: readonly AccountType[] = [
  'checking',
  'savings',
  'credit',
  'investment',
  'cash',
] as const;

/** Valid currency codes */
export type Currency = 'EUR' | 'USD' | 'CAD';

/** All valid currency codes */
export const CURRENCIES: readonly Currency[] = ['EUR', 'USD', 'CAD'] as const;

/**
 * Represents a financial account
 */
export interface Account {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name */
  name: string;
  /** Account type */
  type: AccountType;
  /** Financial institution name */
  institution: string;
  /** Currency code */
  currency: Currency;
  /** Whether the account is active */
  isActive: boolean;
  /** Whether to include in net worth calculations */
  includeInNetWorth: boolean;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
}

/**
 * Type guard to check if a string is a valid AccountType
 */
export function isAccountType(value: string): value is AccountType {
  return ACCOUNT_TYPES.includes(value as AccountType);
}

/**
 * Type guard to check if a string is a valid Currency
 */
export function isCurrency(value: string): value is Currency {
  return CURRENCIES.includes(value as Currency);
}
