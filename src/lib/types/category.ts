/**
 * Category types for Stackz budget management
 */

/** Valid category type values */
export type CategoryType = 'income' | 'expense' | 'transfer';

/** All valid category types */
export const CATEGORY_TYPES: readonly CategoryType[] = ['income', 'expense', 'transfer'] as const;

/**
 * Represents a budget category
 */
export interface Category {
  /** Unique identifier (UUID) */
  id: string;
  /** Display name */
  name: string;
  /** Parent category ID for hierarchical structure (null for root categories) */
  parentId: string | null;
  /** Category type */
  type: CategoryType;
  /** Optional icon identifier */
  icon: string | null;
  /** Optional color hex code */
  color: string | null;
  /** Sort order within parent */
  sortOrder: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
}

/**
 * Category with nested children for hierarchical display
 */
export interface CategoryWithChildren extends Category {
  /** Child categories */
  children: CategoryWithChildren[];
}

/**
 * Type guard to check if a string is a valid CategoryType
 */
export function isCategoryType(value: string): value is CategoryType {
  return CATEGORY_TYPES.includes(value as CategoryType);
}
