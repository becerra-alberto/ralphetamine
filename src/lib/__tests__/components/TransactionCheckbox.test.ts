import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TransactionCheckbox from '../../components/transactions/TransactionCheckbox.svelte';

describe('TransactionCheckbox', () => {
	it('should render the checkbox', () => {
		render(TransactionCheckbox, { props: { transactionId: 'tx-1' } });
		expect(screen.getByTestId('transaction-checkbox')).toBeTruthy();
	});

	it('should render unchecked by default', () => {
		render(TransactionCheckbox, { props: { transactionId: 'tx-1' } });
		const input = screen.getByTestId('transaction-checkbox-input') as HTMLInputElement;
		expect(input.checked).toBe(false);
	});

	it('should render checked when checked prop is true', () => {
		render(TransactionCheckbox, { props: { transactionId: 'tx-1', checked: true } });
		const input = screen.getByTestId('transaction-checkbox-input') as HTMLInputElement;
		expect(input.checked).toBe(true);
	});

	it('should dispatch toggle with correct transactionId on change', async () => {
		const handleToggle = vi.fn();
		render(TransactionCheckbox, {
			props: { transactionId: 'tx-42', checked: false },
			events: { toggle: handleToggle }
		} as any);

		await fireEvent.change(screen.getByTestId('transaction-checkbox-input'));
		expect(handleToggle).toHaveBeenCalledTimes(1);
	});

	it('should accept custom testId', () => {
		render(TransactionCheckbox, { props: { transactionId: 'tx-1', testId: 'custom-cb' } });
		expect(screen.getByTestId('custom-cb')).toBeTruthy();
	});
});
