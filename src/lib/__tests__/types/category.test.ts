import { describe, it, expect } from 'vitest';
import {
  type Category,
  type CategoryType,
  type CategoryWithChildren,
  CATEGORY_TYPES,
  isCategoryType,
} from '../../types/category';

describe('Category Types', () => {
  describe('CategoryType', () => {
    it('should contain only income, expense, transfer', () => {
      expect(CATEGORY_TYPES).toEqual(['income', 'expense', 'transfer']);
      expect(CATEGORY_TYPES).toHaveLength(3);
    });

    it('should include income', () => {
      expect(CATEGORY_TYPES).toContain('income');
    });

    it('should include expense', () => {
      expect(CATEGORY_TYPES).toContain('expense');
    });

    it('should include transfer', () => {
      expect(CATEGORY_TYPES).toContain('transfer');
    });
  });

  describe('isCategoryType', () => {
    it('should return true for valid category types', () => {
      expect(isCategoryType('income')).toBe(true);
      expect(isCategoryType('expense')).toBe(true);
      expect(isCategoryType('transfer')).toBe(true);
    });

    it('should return false for invalid category types', () => {
      expect(isCategoryType('invalid')).toBe(false);
      expect(isCategoryType('')).toBe(false);
      expect(isCategoryType('INCOME')).toBe(false);
      expect(isCategoryType('Income')).toBe(false);
    });
  });

  describe('Category interface', () => {
    it('should match expected structure', () => {
      const category: Category = {
        id: 'cat-123',
        name: 'Test Category',
        parentId: null,
        type: 'expense',
        icon: 'home',
        color: '#4F46E5',
        sortOrder: 1,
        createdAt: '2025-01-28T12:00:00Z',
        updatedAt: '2025-01-28T12:00:00Z',
      };

      expect(category.id).toBe('cat-123');
      expect(category.name).toBe('Test Category');
      expect(category.parentId).toBeNull();
      expect(category.type).toBe('expense');
      expect(category.icon).toBe('home');
      expect(category.color).toBe('#4F46E5');
      expect(category.sortOrder).toBe(1);
      expect(category.createdAt).toBe('2025-01-28T12:00:00Z');
      expect(category.updatedAt).toBe('2025-01-28T12:00:00Z');
    });

    it('should allow optional fields to be null', () => {
      const category: Category = {
        id: 'cat-456',
        name: 'Minimal Category',
        parentId: null,
        type: 'income',
        icon: null,
        color: null,
        sortOrder: 0,
        createdAt: '2025-01-28T12:00:00Z',
        updatedAt: '2025-01-28T12:00:00Z',
      };

      expect(category.icon).toBeNull();
      expect(category.color).toBeNull();
      expect(category.parentId).toBeNull();
    });

    it('should allow parentId for subcategories', () => {
      const category: Category = {
        id: 'cat-child',
        name: 'Subcategory',
        parentId: 'cat-parent',
        type: 'expense',
        icon: null,
        color: null,
        sortOrder: 1,
        createdAt: '2025-01-28T12:00:00Z',
        updatedAt: '2025-01-28T12:00:00Z',
      };

      expect(category.parentId).toBe('cat-parent');
    });
  });

  describe('CategoryWithChildren interface', () => {
    it('should extend Category with children array', () => {
      const categoryWithChildren: CategoryWithChildren = {
        id: 'cat-parent',
        name: 'Parent Category',
        parentId: null,
        type: 'expense',
        icon: null,
        color: null,
        sortOrder: 1,
        createdAt: '2025-01-28T12:00:00Z',
        updatedAt: '2025-01-28T12:00:00Z',
        children: [
          {
            id: 'cat-child',
            name: 'Child Category',
            parentId: 'cat-parent',
            type: 'expense',
            icon: null,
            color: null,
            sortOrder: 1,
            createdAt: '2025-01-28T12:00:00Z',
            updatedAt: '2025-01-28T12:00:00Z',
            children: [],
          },
        ],
      };

      expect(categoryWithChildren.children).toHaveLength(1);
      expect(categoryWithChildren.children[0].name).toBe('Child Category');
      expect(categoryWithChildren.children[0].children).toHaveLength(0);
    });
  });
});
