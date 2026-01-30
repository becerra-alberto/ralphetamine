import { describe, it, expect } from 'vitest';
import { formatBudgetAmount } from '../../utils/budgetFormatting';

describe('formatBudgetAmount', () => {
	it('should format 0 as "€0"', () => {
		expect(formatBudgetAmount(0)).toBe('€0');
	});

	it('should format 50000 (500.00) as "€500" (no decimals)', () => {
		expect(formatBudgetAmount(50000)).toBe('€500');
	});

	it('should format 150000 (1500.00) as "€1.5K"', () => {
		expect(formatBudgetAmount(150000)).toBe('€1.5K');
	});

	it('should format -50000 as "-€500"', () => {
		expect(formatBudgetAmount(-50000)).toBe('-€500');
	});

	it('should format -150000 as "-€1.5K"', () => {
		expect(formatBudgetAmount(-150000)).toBe('-€1.5K');
	});

	it('should format 100000 (1000.00) as "€1K" (exact thousands no decimal)', () => {
		expect(formatBudgetAmount(100000)).toBe('€1K');
	});

	it('should format 99999 (999.99) as "€999"', () => {
		expect(formatBudgetAmount(99999)).toBe('€999');
	});

	it('should include currency symbol prefix', () => {
		expect(formatBudgetAmount(50000)).toMatch(/^€/);
		expect(formatBudgetAmount(150000)).toMatch(/^€/);
		expect(formatBudgetAmount(0)).toMatch(/^€/);
	});

	it('should use USD symbol when specified', () => {
		expect(formatBudgetAmount(50000, 'USD')).toBe('$500');
		expect(formatBudgetAmount(150000, 'USD')).toBe('$1.5K');
	});

	it('should handle large amounts', () => {
		expect(formatBudgetAmount(1000000)).toBe('€10K');
		expect(formatBudgetAmount(10000000)).toBe('€100K');
	});

	it('should handle negative amounts with K suffix', () => {
		expect(formatBudgetAmount(-100000)).toBe('-€1K');
		expect(formatBudgetAmount(-250000)).toBe('-€2.5K');
	});

	it('should truncate cents for amounts under 1000', () => {
		// 12345 cents = 123.45 → "€123"
		expect(formatBudgetAmount(12345)).toBe('€123');
	});
});
