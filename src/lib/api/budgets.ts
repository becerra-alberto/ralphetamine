/**
 * Budget API wrapper for Tauri backend communication
 *
 * Provides functions to interact with the budget database through Tauri commands.
 */

import { invoke } from '@tauri-apps/api/core';
import type { Budget, BudgetInput, BudgetSummary, MonthString } from '../types/budget';

/**
 * Set or update a budget for a category and month
 * Uses upsert semantics - creates if not exists, updates if exists
 */
export async function setBudget(input: BudgetInput): Promise<Budget> {
  return invoke('set_budget', {
    categoryId: input.categoryId,
    month: input.month,
    amountCents: input.amountCents,
    note: input.note ?? null
  });
}

/**
 * Get a budget for a specific category and month
 * Returns null if no budget exists
 */
export async function getBudget(categoryId: string, month: MonthString): Promise<Budget | null> {
  return invoke('get_budget', { categoryId, month });
}

/**
 * Get all budgets for a specific month
 */
export async function getBudgetsForMonth(month: MonthString): Promise<Budget[]> {
  return invoke('get_budgets_for_month', { month });
}

/**
 * Get budgets for a category within a date range
 */
export async function getBudgetsForCategory(
  categoryId: string,
  startMonth: MonthString,
  endMonth: MonthString
): Promise<Budget[]> {
  return invoke('get_budgets_for_category', { categoryId, startMonth, endMonth });
}

/**
 * Delete a budget for a specific category and month
 */
export async function deleteBudget(categoryId: string, month: MonthString): Promise<void> {
  return invoke('delete_budget', { categoryId, month });
}

/**
 * Copy budgets from one month to another
 * Useful for repeating monthly budgets
 */
export async function copyBudgets(sourceMonth: MonthString, targetMonth: MonthString): Promise<number> {
  return invoke('copy_budgets', { sourceMonth, targetMonth });
}

/**
 * Copy budgets from one month to another with overwrite option
 */
export async function copyBudgetsToMonth(
  sourceMonth: MonthString,
  targetMonth: MonthString,
  overwrite: boolean = false
): Promise<number> {
  return invoke('copy_budgets_to_month', { sourceMonth, targetMonth, overwrite });
}

/**
 * Get budget summaries with actual spending for a month
 */
export async function getBudgetSummaries(month: MonthString): Promise<BudgetSummary[]> {
  return invoke('get_budget_summaries', { month });
}

/**
 * Batch update multiple budgets at once
 */
export async function setBudgetsBatch(budgets: BudgetInput[]): Promise<number> {
  return invoke('set_budgets_batch', { budgets });
}

/**
 * Set the same budget amount for a category across multiple months
 * Useful for "Set for all future months" functionality
 */
export async function setFutureMonthsBudget(
  categoryId: string,
  startMonth: MonthString,
  amountCents: number,
  monthCount: number = 12
): Promise<number> {
  const budgets: BudgetInput[] = [];
  let currentMonth = startMonth;

  for (let i = 0; i < monthCount; i++) {
    budgets.push({
      categoryId,
      month: currentMonth,
      amountCents
    });
    currentMonth = getNextMonth(currentMonth);
  }

  return setBudgetsBatch(budgets);
}

/**
 * Increase budgets by a percentage for a category across multiple months
 * Useful for "Increase future months by %" functionality
 */
export async function increaseFutureMonthsBudget(
  categoryId: string,
  startMonth: MonthString,
  baseCents: number,
  percentage: number,
  monthCount: number = 12
): Promise<number> {
  // Calculate the new amount using integer math
  const increaseCents = Math.round((baseCents * percentage) / 100);
  const newAmountCents = baseCents + increaseCents;

  return setFutureMonthsBudget(categoryId, startMonth, newAmountCents, monthCount);
}

/**
 * Helper to get the next month string
 */
function getNextMonth(month: MonthString): MonthString {
  const [year, m] = month.split('-').map(Number);
  if (m === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(m + 1).padStart(2, '0')}`;
}
