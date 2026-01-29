import { describe, it, expect } from 'vitest';
import {
  isValidMonthString,
  getCurrentMonth,
  getPreviousMonth,
  getNextMonth,
  getMonthRange,
  formatCentsToDisplay,
  parseDisplayToCents,
  type Budget,
  type BudgetInput,
  type BudgetSummary
} from '../../types/budget';

describe('Budget Types', () => {
  describe('Budget interface', () => {
    it('should define required Budget properties', () => {
      const budget: Budget = {
        categoryId: 'cat-123',
        month: '2025-01',
        amountCents: 50000,
        note: 'Monthly rent budget',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      expect(budget.categoryId).toBe('cat-123');
      expect(budget.month).toBe('2025-01');
      expect(budget.amountCents).toBe(50000);
      expect(budget.note).toBe('Monthly rent budget');
    });

    it('should allow null note', () => {
      const budget: Budget = {
        categoryId: 'cat-123',
        month: '2025-01',
        amountCents: 50000,
        note: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      };

      expect(budget.note).toBeNull();
    });
  });

  describe('BudgetInput interface', () => {
    it('should define required input properties', () => {
      const input: BudgetInput = {
        categoryId: 'cat-123',
        month: '2025-01',
        amountCents: 50000
      };

      expect(input.categoryId).toBe('cat-123');
      expect(input.month).toBe('2025-01');
      expect(input.amountCents).toBe(50000);
    });

    it('should allow optional note', () => {
      const input: BudgetInput = {
        categoryId: 'cat-123',
        month: '2025-01',
        amountCents: 50000,
        note: 'Optional note'
      };

      expect(input.note).toBe('Optional note');
    });
  });

  describe('BudgetSummary interface', () => {
    it('should include actual vs budgeted amounts', () => {
      const summary: BudgetSummary = {
        categoryId: 'cat-123',
        month: '2025-01',
        budgetedCents: 50000,
        actualCents: 35000,
        remainingCents: 15000,
        percentageUsed: 70
      };

      expect(summary.budgetedCents).toBe(50000);
      expect(summary.actualCents).toBe(35000);
      expect(summary.remainingCents).toBe(15000);
      expect(summary.percentageUsed).toBe(70);
    });
  });

  describe('isValidMonthString', () => {
    it('should return true for valid YYYY-MM format', () => {
      expect(isValidMonthString('2025-01')).toBe(true);
      expect(isValidMonthString('2025-12')).toBe(true);
      expect(isValidMonthString('2000-06')).toBe(true);
    });

    it('should return false for invalid month numbers', () => {
      expect(isValidMonthString('2025-00')).toBe(false);
      expect(isValidMonthString('2025-13')).toBe(false);
    });

    it('should return false for invalid formats', () => {
      expect(isValidMonthString('Jan 2025')).toBe(false);
      expect(isValidMonthString('2025/01')).toBe(false);
      expect(isValidMonthString('25-01')).toBe(false);
      expect(isValidMonthString('2025-1')).toBe(false);
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    });
  });

  describe('getPreviousMonth', () => {
    it('should return previous month', () => {
      expect(getPreviousMonth('2025-06')).toBe('2025-05');
      expect(getPreviousMonth('2025-12')).toBe('2025-11');
    });

    it('should handle year boundary', () => {
      expect(getPreviousMonth('2025-01')).toBe('2024-12');
    });
  });

  describe('getNextMonth', () => {
    it('should return next month', () => {
      expect(getNextMonth('2025-06')).toBe('2025-07');
      expect(getNextMonth('2025-01')).toBe('2025-02');
    });

    it('should handle year boundary', () => {
      expect(getNextMonth('2025-12')).toBe('2026-01');
    });
  });

  describe('getMonthRange', () => {
    it('should return array of months in range', () => {
      const range = getMonthRange('2025-01', '2025-03');
      expect(range).toEqual(['2025-01', '2025-02', '2025-03']);
    });

    it('should handle cross-year range', () => {
      const range = getMonthRange('2024-11', '2025-02');
      expect(range).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
    });

    it('should return single month for same start/end', () => {
      const range = getMonthRange('2025-06', '2025-06');
      expect(range).toEqual(['2025-06']);
    });
  });

  describe('formatCentsToDisplay', () => {
    it('should format cents to 2 decimal places', () => {
      expect(formatCentsToDisplay(50000)).toBe('500.00');
      expect(formatCentsToDisplay(50099)).toBe('500.99');
      expect(formatCentsToDisplay(100)).toBe('1.00');
      expect(formatCentsToDisplay(1)).toBe('0.01');
    });

    it('should handle zero', () => {
      expect(formatCentsToDisplay(0)).toBe('0.00');
    });
  });

  describe('parseDisplayToCents', () => {
    it('should parse display string to cents', () => {
      expect(parseDisplayToCents('500.00')).toBe(50000);
      expect(parseDisplayToCents('1.00')).toBe(100);
      expect(parseDisplayToCents('0.01')).toBe(1);
    });

    it('should handle formatted strings', () => {
      expect(parseDisplayToCents('$500.00')).toBe(50000);
      expect(parseDisplayToCents('1,234.56')).toBe(123456);
    });

    it('should handle negative amounts', () => {
      expect(parseDisplayToCents('-50.00')).toBe(-5000);
    });
  });
});
