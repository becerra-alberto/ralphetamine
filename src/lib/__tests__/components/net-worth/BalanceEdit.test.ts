import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import BalanceEdit from '../../../components/net-worth/BalanceEdit.svelte';

describe('BalanceEdit', () => {
	it('should render trigger with slot content', () => {
		render(BalanceEdit, {
			props: { balanceCents: 15050 }
		});

		const trigger = screen.getByTestId('balance-edit-trigger');
		expect(trigger).toBeTruthy();
	});

	it('should show input when trigger is clicked', async () => {
		render(BalanceEdit, {
			props: { balanceCents: 15050 }
		});

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input');
		expect(input).toBeTruthy();
	});

	it('should display current value as formatted decimal in input', async () => {
		render(BalanceEdit, {
			props: { balanceCents: 15050 }
		});

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		// 15050 cents = 150.50
		expect(input.value).toBe('150.50');
	});

	it('should show absolute value for negative balances', async () => {
		render(BalanceEdit, {
			props: { balanceCents: -75000 }
		});

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		// -75000 -> abs -> 750.00
		expect(input.value).toBe('750.00');
	});

	it('should dispatch save event on Enter key', async () => {
		let savedDetail: { newBalanceCents: number } | undefined;

		render(BalanceEdit, {
			props: { balanceCents: 15050 },
			events: {
				save: (event: CustomEvent) => {
					savedDetail = event.detail;
				}
			}
		} as any);

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '200.00' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(savedDetail).toBeDefined();
		expect(savedDetail!.newBalanceCents).toBe(20000);
	});

	it('should preserve negative sign for liability on save', async () => {
		let savedDetail: { newBalanceCents: number } | undefined;

		render(BalanceEdit, {
			props: { balanceCents: -75000 },
			events: {
				save: (event: CustomEvent) => {
					savedDetail = event.detail;
				}
			}
		} as any);

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '500.00' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		// Original was negative, so saved value should be negative
		expect(savedDetail).toBeDefined();
		expect(savedDetail!.newBalanceCents).toBe(-50000);
	});

	it('should dispatch cancel event on Escape key', async () => {
		let cancelCalled = false;

		render(BalanceEdit, {
			props: { balanceCents: 15050 },
			events: {
				cancel: () => {
					cancelCalled = true;
				}
			}
		} as any);

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input');
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(cancelCalled).toBe(true);
	});

	it('should exit edit mode after Escape', async () => {
		render(BalanceEdit, {
			props: { balanceCents: 15050 }
		});

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		expect(screen.getByTestId('balance-edit-input')).toBeTruthy();

		const input = screen.getByTestId('balance-edit-input');
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(screen.getByTestId('balance-edit-trigger')).toBeTruthy();
	});

	it('should handle comma-formatted input correctly', async () => {
		let savedDetail: { newBalanceCents: number } | undefined;

		render(BalanceEdit, {
			props: { balanceCents: 0 },
			events: {
				save: (event: CustomEvent) => {
					savedDetail = event.detail;
				}
			}
		} as any);

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '1,500.00' } });
		await fireEvent.keyDown(input, { key: 'Enter' });

		expect(savedDetail).toBeDefined();
		expect(savedDetail!.newBalanceCents).toBe(150000);
	});

	it('should accept custom testId', () => {
		render(BalanceEdit, {
			props: { balanceCents: 10000, testId: 'custom-edit' }
		});

		expect(screen.getByTestId('custom-edit-trigger')).toBeTruthy();
	});

	it('should accept typing in the input field', async () => {
		render(BalanceEdit, {
			props: { balanceCents: 15050 }
		});

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '999.99' } });

		expect(input.value).toBe('999.99');
	});

	it('should not cancel edit when blur moves to a related element inside the container', async () => {
		let cancelCalled = false;

		render(BalanceEdit, {
			props: { balanceCents: 15050 },
			events: {
				cancel: () => {
					cancelCalled = true;
				},
				save: () => {}
			}
		} as any);

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input');
		const container = screen.getByTestId('balance-edit-container');

		// Simulate blur where relatedTarget is inside the edit container
		await fireEvent.blur(input, { relatedTarget: container });

		// Should NOT have cancelled — focus moved to related element
		expect(cancelCalled).toBe(false);
	});

	it('should save on blur when focus leaves to an unrelated element', async () => {
		let savedDetail: { newBalanceCents: number } | undefined;

		render(BalanceEdit, {
			props: { balanceCents: 15050 },
			events: {
				save: (event: CustomEvent) => {
					savedDetail = event.detail;
				}
			}
		} as any);

		const trigger = screen.getByTestId('balance-edit-trigger');
		await fireEvent.click(trigger);

		const input = screen.getByTestId('balance-edit-input') as HTMLInputElement;
		await fireEvent.input(input, { target: { value: '200.00' } });

		// Blur with no relatedTarget (or unrelated element) should save
		await fireEvent.blur(input, { relatedTarget: null });

		expect(savedDetail).toBeDefined();
		expect(savedDetail!.newBalanceCents).toBe(20000);
	});
});
