import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MoMChange from '../../../components/net-worth/MoMChange.svelte';
import type { MomChangeData } from '../../../api/netWorth';

const positiveChange: MomChangeData = {
	hasPrevious: true,
	changeCents: 150000,
	changePercent: 5.2,
	previousMonth: '2025-12',
	previousNetWorthCents: 2884615,
	currentNetWorthCents: 3034615
};

const negativeChange: MomChangeData = {
	hasPrevious: true,
	changeCents: -80000,
	changePercent: -3.1,
	previousMonth: '2025-12',
	previousNetWorthCents: 2580645,
	currentNetWorthCents: 2500645
};

const zeroChange: MomChangeData = {
	hasPrevious: true,
	changeCents: 0,
	changePercent: 0,
	previousMonth: '2025-12',
	previousNetWorthCents: 475000,
	currentNetWorthCents: 475000
};

const firstMonth: MomChangeData = {
	hasPrevious: false,
	changeCents: 0,
	changePercent: 0,
	previousMonth: null,
	previousNetWorthCents: null,
	currentNetWorthCents: 475000
};

describe('MoMChange', () => {
	describe('positive change (AC2)', () => {
		it('should display positive change with plus sign', () => {
			render(MoMChange, { props: { data: positiveChange } });

			const amount = screen.getByTestId('mom-change-amount');
			expect(amount.textContent).toContain('+');
			expect(amount.textContent).toContain('1,500.00');
		});

		it('should display green color for positive change', () => {
			render(MoMChange, { props: { data: positiveChange } });

			const indicator = screen.getByTestId('mom-change-indicator');
			expect(indicator.classList.contains('positive')).toBe(true);
		});

		it('should display upward arrow for positive change', () => {
			render(MoMChange, { props: { data: positiveChange } });

			const arrow = screen.getByTestId('mom-change-arrow');
			expect(arrow).toBeTruthy();
			// ▲ is the up-pointing triangle (&#x25B2;)
			expect(arrow.textContent).toBe('▲');
		});

		it('should display positive percentage', () => {
			render(MoMChange, { props: { data: positiveChange } });

			const percent = screen.getByTestId('mom-change-percent');
			expect(percent.textContent).toContain('+5.2%');
		});
	});

	describe('negative change (AC3)', () => {
		it('should display negative change with minus sign', () => {
			render(MoMChange, { props: { data: negativeChange } });

			const amount = screen.getByTestId('mom-change-amount');
			expect(amount.textContent).toContain('-');
			expect(amount.textContent).toContain('800.00');
		});

		it('should display red color for negative change', () => {
			render(MoMChange, { props: { data: negativeChange } });

			const indicator = screen.getByTestId('mom-change-indicator');
			expect(indicator.classList.contains('negative')).toBe(true);
		});

		it('should display downward arrow for negative change', () => {
			render(MoMChange, { props: { data: negativeChange } });

			const arrow = screen.getByTestId('mom-change-arrow');
			expect(arrow).toBeTruthy();
			// ▼ is the down-pointing triangle (&#x25BC;)
			expect(arrow.textContent).toBe('▼');
		});

		it('should display negative percentage', () => {
			render(MoMChange, { props: { data: negativeChange } });

			const percent = screen.getByTestId('mom-change-percent');
			expect(percent.textContent).toContain('-3.1%');
		});
	});

	describe('zero change (AC4)', () => {
		it('should display zero change with no sign prefix', () => {
			render(MoMChange, { props: { data: zeroChange } });

			const amount = screen.getByTestId('mom-change-amount');
			expect(amount.textContent).toContain('0.00');
		});

		it('should display neutral color for zero change', () => {
			render(MoMChange, { props: { data: zeroChange } });

			const indicator = screen.getByTestId('mom-change-indicator');
			expect(indicator.classList.contains('neutral')).toBe(true);
		});

		it('should not display arrow for zero change', () => {
			render(MoMChange, { props: { data: zeroChange } });

			expect(screen.queryByTestId('mom-change-arrow')).toBeNull();
		});

		it('should display 0.0% for zero change', () => {
			render(MoMChange, { props: { data: zeroChange } });

			const percent = screen.getByTestId('mom-change-percent');
			expect(percent.textContent).toContain('0.0%');
		});
	});

	describe('first month handling (AC5)', () => {
		it('should display first month message when no previous data', () => {
			render(MoMChange, { props: { data: firstMonth } });

			const firstMonthEl = screen.getByTestId('mom-change-first-month');
			expect(firstMonthEl.textContent).toContain('First month');
			expect(firstMonthEl.textContent).toContain('no comparison');
		});

		it('should not display change indicator on first month', () => {
			render(MoMChange, { props: { data: firstMonth } });

			expect(screen.queryByTestId('mom-change-indicator')).toBeNull();
		});

		it('should not throw error on first month', () => {
			expect(() => {
				render(MoMChange, { props: { data: firstMonth } });
			}).not.toThrow();
		});
	});

	describe('percentage calculation', () => {
		it('should correctly calculate percentage: (current - previous) / previous * 100', () => {
			// (3034615 - 2884615) / 2884615 * 100 = 5.198...% ≈ 5.2%
			render(MoMChange, { props: { data: positiveChange } });

			const percent = screen.getByTestId('mom-change-percent');
			expect(percent.textContent).toContain('5.2');
		});

		it('should handle division by zero gracefully (previous=0)', () => {
			const previousZero: MomChangeData = {
				hasPrevious: true,
				changeCents: 475000,
				changePercent: 100.0,
				previousMonth: '2025-12',
				previousNetWorthCents: 0,
				currentNetWorthCents: 475000
			};

			expect(() => {
				render(MoMChange, { props: { data: previousZero } });
			}).not.toThrow();

			const percent = screen.getByTestId('mom-change-percent');
			expect(percent.textContent).toContain('100.0%');
		});
	});

	describe('cents arithmetic', () => {
		it('should correctly display cents change: (15000 - 10000) = 5000 cents', () => {
			const centsChange: MomChangeData = {
				hasPrevious: true,
				changeCents: 5000,
				changePercent: 50.0,
				previousMonth: '2025-12',
				previousNetWorthCents: 10000,
				currentNetWorthCents: 15000
			};

			render(MoMChange, { props: { data: centsChange } });

			const amount = screen.getByTestId('mom-change-amount');
			// 5000 cents = €50.00
			expect(amount.textContent).toContain('50.00');
		});
	});

	describe('tooltip (AC6)', () => {
		it('should show tooltip on hover with previous/current values and change', async () => {
			render(MoMChange, { props: { data: positiveChange } });

			const indicator = screen.getByTestId('mom-change-indicator');

			// Hover to show tooltip
			await fireEvent.mouseEnter(indicator);

			const tooltip = screen.getByTestId('mom-change-tooltip');
			expect(tooltip).toBeTruthy();

			// Tooltip should show previous month name
			const monthEl = screen.getByTestId('mom-change-tooltip-month');
			expect(monthEl.textContent).toContain('December');
			expect(monthEl.textContent).toContain('2025');

			// Tooltip should show previous value
			const previousEl = screen.getByTestId('mom-change-tooltip-previous');
			expect(previousEl.textContent).toContain('28,846.15');

			// Tooltip should show current value
			const currentEl = screen.getByTestId('mom-change-tooltip-current');
			expect(currentEl.textContent).toContain('30,346.15');

			// Tooltip should show change
			const changeEl = screen.getByTestId('mom-change-tooltip-change');
			expect(changeEl.textContent).toContain('1,500.00');
			expect(changeEl.textContent).toContain('5.2');
		});

		it('should hide tooltip on mouse leave', async () => {
			render(MoMChange, { props: { data: positiveChange } });

			const indicator = screen.getByTestId('mom-change-indicator');

			// Show tooltip
			await fireEvent.mouseEnter(indicator);
			expect(screen.getByTestId('mom-change-tooltip')).toBeTruthy();

			// Hide tooltip
			await fireEvent.mouseLeave(indicator);
			expect(screen.queryByTestId('mom-change-tooltip')).toBeNull();
		});
	});

	describe('null data', () => {
		it('should render nothing when data is null', () => {
			render(MoMChange, { props: { data: null } });

			// Container exists but no content
			const container = screen.getByTestId('mom-change');
			expect(container).toBeTruthy();
			expect(screen.queryByTestId('mom-change-indicator')).toBeNull();
			expect(screen.queryByTestId('mom-change-first-month')).toBeNull();
		});
	});

	describe('custom testId', () => {
		it('should use custom testId', () => {
			render(MoMChange, {
				props: { data: positiveChange, testId: 'custom-mom' }
			});

			expect(screen.getByTestId('custom-mom')).toBeTruthy();
			expect(screen.getByTestId('custom-mom-indicator')).toBeTruthy();
		});
	});
});
