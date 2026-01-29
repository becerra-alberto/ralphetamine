import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Step3Accounts from '../../components/onboarding/Step3Accounts.svelte';

describe('Step3Accounts', () => {
	it('should render title', () => {
		render(Step3Accounts, { props: {} });
		expect(screen.getByTestId('step3-accounts-title').textContent).toBe('Add your accounts');
	});

	it('should render subtitle', () => {
		render(Step3Accounts, { props: {} });
		expect(screen.getByTestId('step3-accounts-subtitle').textContent).toContain(
			'Where do you keep your money?'
		);
	});

	it('should show "Add account" button initially', () => {
		render(Step3Accounts, { props: {} });
		expect(screen.getByTestId('step3-accounts-show-form-btn')).toBeTruthy();
	});

	it('should show form when Add account is clicked', async () => {
		render(Step3Accounts, { props: {} });

		await fireEvent.click(screen.getByTestId('step3-accounts-show-form-btn'));

		expect(screen.getByTestId('step3-accounts-form')).toBeTruthy();
		expect(screen.getByTestId('step3-accounts-name-input')).toBeTruthy();
		expect(screen.getByTestId('step3-accounts-type-select')).toBeTruthy();
		expect(screen.getByTestId('step3-accounts-balance-input')).toBeTruthy();
	});

	it('should show "Skip for now" when no accounts', () => {
		render(Step3Accounts, { props: {} });
		expect(screen.getByTestId('step3-accounts-next').textContent?.trim()).toBe('Skip for now');
	});

	it('should show "Next" when accounts exist', () => {
		render(Step3Accounts, {
			props: { accounts: [{ name: 'Test', type: 'checking', balanceCents: 100000 }] }
		});
		expect(screen.getByTestId('step3-accounts-next').textContent?.trim()).toBe('Next');
	});

	it('should display added accounts in list', () => {
		render(Step3Accounts, {
			props: {
				accounts: [
					{ name: 'Checking', type: 'checking', balanceCents: 350000 },
					{ name: 'Savings', type: 'savings', balanceCents: 100000 }
				]
			}
		});

		expect(screen.getByTestId('step3-accounts-list')).toBeTruthy();
		expect(screen.getByTestId('step3-accounts-account-0')).toBeTruthy();
		expect(screen.getByTestId('step3-accounts-account-1')).toBeTruthy();
	});

	it('should have Back button', () => {
		render(Step3Accounts, { props: {} });
		expect(screen.getByTestId('step3-accounts-back')).toBeTruthy();
	});

	it('should dispatch back event', async () => {
		let backCalled = false;

		render(Step3Accounts, {
			props: {},
			events: {
				back: () => {
					backCalled = true;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('step3-accounts-back'));
		expect(backCalled).toBe(true);
	});

	it('should accept custom testId', () => {
		render(Step3Accounts, { props: { testId: 'custom-accounts' } });
		expect(screen.getByTestId('custom-accounts')).toBeTruthy();
	});
});
