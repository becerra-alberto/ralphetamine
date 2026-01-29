import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import QuickShortcuts from '../../components/dashboard/QuickShortcuts.svelte';

describe('QuickShortcuts', () => {
	it('should render quick shortcuts container', () => {
		render(QuickShortcuts);

		expect(screen.getByTestId('quick-shortcuts')).toBeTruthy();
	});

	it('should show "Quick shortcuts" label', () => {
		render(QuickShortcuts);

		const label = screen.getByTestId('quick-shortcuts-label');
		expect(label).toBeTruthy();
		expect(label.textContent).toBe('Quick shortcuts');
	});

	it('should render all three shortcuts (⌘T, ⌘U, ⌘W)', () => {
		render(QuickShortcuts);

		expect(screen.getByTestId('quick-shortcuts-item-transactions')).toBeTruthy();
		expect(screen.getByTestId('quick-shortcuts-item-budget')).toBeTruthy();
		expect(screen.getByTestId('quick-shortcuts-item-net-worth')).toBeTruthy();
	});

	it('should display correct keyboard shortcuts', () => {
		render(QuickShortcuts);

		const transactions = screen.getByTestId('quick-shortcuts-item-transactions');
		const budget = screen.getByTestId('quick-shortcuts-item-budget');
		const netWorth = screen.getByTestId('quick-shortcuts-item-net-worth');

		expect(transactions.textContent).toContain('⌘T');
		expect(transactions.textContent).toContain('Transactions');
		expect(budget.textContent).toContain('⌘U');
		expect(budget.textContent).toContain('Budget');
		expect(netWorth.textContent).toContain('⌘W');
		expect(netWorth.textContent).toContain('Net Worth');
	});

	it('should dispatch navigate event with /transactions path on click', async () => {
		let navigatedPath: string | null = null;

		render(QuickShortcuts, {
			events: {
				navigate: (event: CustomEvent<{ path: string }>) => {
					navigatedPath = event.detail.path;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('quick-shortcuts-item-transactions'));

		expect(navigatedPath).toBe('/transactions');
	});

	it('should dispatch navigate event with /budget path on click', async () => {
		let navigatedPath: string | null = null;

		render(QuickShortcuts, {
			events: {
				navigate: (event: CustomEvent<{ path: string }>) => {
					navigatedPath = event.detail.path;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('quick-shortcuts-item-budget'));

		expect(navigatedPath).toBe('/budget');
	});

	it('should dispatch navigate event with /net-worth path on click', async () => {
		let navigatedPath: string | null = null;

		render(QuickShortcuts, {
			events: {
				navigate: (event: CustomEvent<{ path: string }>) => {
					navigatedPath = event.detail.path;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('quick-shortcuts-item-net-worth'));

		expect(navigatedPath).toBe('/net-worth');
	});

	it('should accept custom testId', () => {
		render(QuickShortcuts, {
			props: { testId: 'custom-shortcuts' }
		});

		expect(screen.getByTestId('custom-shortcuts')).toBeTruthy();
		expect(screen.getByTestId('custom-shortcuts-label')).toBeTruthy();
	});
});
