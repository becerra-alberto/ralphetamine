import { describe, it, expect } from 'vitest';
import {
  type Account,
  type AccountType,
  type Currency,
  ACCOUNT_TYPES,
  CURRENCIES,
  isAccountType,
  isCurrency,
} from '../../types/account';

describe('Account Types', () => {
  describe('AccountType', () => {
    it('should contain only checking, savings, credit, investment, cash', () => {
      expect(ACCOUNT_TYPES).toEqual(['checking', 'savings', 'credit', 'investment', 'cash']);
      expect(ACCOUNT_TYPES).toHaveLength(5);
    });

    it('should include checking', () => {
      expect(ACCOUNT_TYPES).toContain('checking');
    });

    it('should include savings', () => {
      expect(ACCOUNT_TYPES).toContain('savings');
    });

    it('should include credit', () => {
      expect(ACCOUNT_TYPES).toContain('credit');
    });

    it('should include investment', () => {
      expect(ACCOUNT_TYPES).toContain('investment');
    });

    it('should include cash', () => {
      expect(ACCOUNT_TYPES).toContain('cash');
    });
  });

  describe('Currency', () => {
    it('should contain only EUR, USD, CAD', () => {
      expect(CURRENCIES).toEqual(['EUR', 'USD', 'CAD']);
      expect(CURRENCIES).toHaveLength(3);
    });

    it('should include EUR', () => {
      expect(CURRENCIES).toContain('EUR');
    });

    it('should include USD', () => {
      expect(CURRENCIES).toContain('USD');
    });

    it('should include CAD', () => {
      expect(CURRENCIES).toContain('CAD');
    });
  });

  describe('isAccountType', () => {
    it('should return true for valid account types', () => {
      expect(isAccountType('checking')).toBe(true);
      expect(isAccountType('savings')).toBe(true);
      expect(isAccountType('credit')).toBe(true);
      expect(isAccountType('investment')).toBe(true);
      expect(isAccountType('cash')).toBe(true);
    });

    it('should return false for invalid account types', () => {
      expect(isAccountType('invalid')).toBe(false);
      expect(isAccountType('')).toBe(false);
      expect(isAccountType('CHECKING')).toBe(false);
      expect(isAccountType('Savings')).toBe(false);
    });
  });

  describe('isCurrency', () => {
    it('should return true for valid currencies', () => {
      expect(isCurrency('EUR')).toBe(true);
      expect(isCurrency('USD')).toBe(true);
      expect(isCurrency('CAD')).toBe(true);
    });

    it('should return false for invalid currencies', () => {
      expect(isCurrency('GBP')).toBe(false);
      expect(isCurrency('eur')).toBe(false);
      expect(isCurrency('')).toBe(false);
      expect(isCurrency('MXN')).toBe(false);
    });
  });

  describe('Account interface', () => {
    it('should match expected structure', () => {
      const account: Account = {
        id: 'acc-123',
        name: 'Main Checking',
        type: 'checking',
        institution: 'Bank of America',
        currency: 'USD',
        isActive: true,
        includeInNetWorth: true,
        createdAt: '2025-01-28T12:00:00Z',
        updatedAt: '2025-01-28T12:00:00Z',
      };

      expect(account.id).toBe('acc-123');
      expect(account.name).toBe('Main Checking');
      expect(account.type).toBe('checking');
      expect(account.institution).toBe('Bank of America');
      expect(account.currency).toBe('USD');
      expect(account.isActive).toBe(true);
      expect(account.includeInNetWorth).toBe(true);
      expect(account.createdAt).toBe('2025-01-28T12:00:00Z');
      expect(account.updatedAt).toBe('2025-01-28T12:00:00Z');
    });

    it('should allow inactive accounts', () => {
      const account: Account = {
        id: 'acc-456',
        name: 'Old Savings',
        type: 'savings',
        institution: 'Chase',
        currency: 'USD',
        isActive: false,
        includeInNetWorth: false,
        createdAt: '2025-01-28T12:00:00Z',
        updatedAt: '2025-01-28T12:00:00Z',
      };

      expect(account.isActive).toBe(false);
      expect(account.includeInNetWorth).toBe(false);
    });

    it('should support all account types', () => {
      const accountTypes: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'cash'];

      accountTypes.forEach((type) => {
        const account: Account = {
          id: `acc-${type}`,
          name: `Test ${type}`,
          type,
          institution: 'Test Bank',
          currency: 'EUR',
          isActive: true,
          includeInNetWorth: true,
          createdAt: '2025-01-28T12:00:00Z',
          updatedAt: '2025-01-28T12:00:00Z',
        };

        expect(account.type).toBe(type);
      });
    });

    it('should support all currencies', () => {
      const currencies: Currency[] = ['EUR', 'USD', 'CAD'];

      currencies.forEach((currency) => {
        const account: Account = {
          id: `acc-${currency}`,
          name: `Test ${currency}`,
          type: 'checking',
          institution: 'Test Bank',
          currency,
          isActive: true,
          includeInNetWorth: true,
          createdAt: '2025-01-28T12:00:00Z',
          updatedAt: '2025-01-28T12:00:00Z',
        };

        expect(account.currency).toBe(currency);
      });
    });
  });
});
