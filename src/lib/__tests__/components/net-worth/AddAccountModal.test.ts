import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AddAccountModal from '../../../components/net-worth/AddAccountModal.svelte';

describe('AddAccountModal', () => {
	it('should not render when isOpen is false', () => {
		render(AddAccountModal, {
			props: { isOpen: false }
		});

		expect(screen.queryByTestId('add-account-modal')).toBeNull();
	});

	it('should render when isOpen is true', () => {
		render(AddAccountModal, {
			props: { isOpen: true }
		});

		expect(screen.getByTestId('add-account-modal')).toBeTruthy();
		expect(screen.getByTestId('add-account-modal-title').textContent).toBe('Add Account');
	});

	it('should have all form fields', () => {
		render(AddAccountModal, {
			props: { isOpen: true }
		});

		expect(screen.getByTestId('add-account-modal-name-input')).toBeTruthy();
		expect(screen.getByTestId('add-account-modal-type-select')).toBeTruthy();
		expect(screen.getByTestId('add-account-modal-institution-input')).toBeTruthy();
		expect(screen.getByTestId('add-account-modal-currency-select')).toBeTruthy();
		expect(screen.getByTestId('add-account-modal-balance-input')).toBeTruthy();
	});

	it('should validate required fields on submit', async () => {
		render(AddAccountModal, {
			props: { isOpen: true }
		});

		const submitBtn = screen.getByTestId('add-account-modal-submit');
		await fireEvent.click(submitBtn);

		// Should show name error
		expect(screen.getByTestId('add-account-modal-name-error').textContent).toContain('required');
		// Should show balance error
		expect(screen.getByTestId('add-account-modal-balance-error').textContent).toContain('required');
	});

	it('should include EUR, USD, CAD currency options', () => {
		render(AddAccountModal, {
			props: { isOpen: true }
		});

		const select = screen.getByTestId('add-account-modal-currency-select') as HTMLSelectElement;
		const options = Array.from(select.options).map((o) => o.value);

		expect(options).toContain('EUR');
		expect(options).toContain('USD');
		expect(options).toContain('CAD');
	});

	it('should include all account types', () => {
		render(AddAccountModal, {
			props: { isOpen: true }
		});

		const select = screen.getByTestId('add-account-modal-type-select') as HTMLSelectElement;
		const options = Array.from(select.options).map((o) => o.value);

		expect(options).toContain('checking');
		expect(options).toContain('savings');
		expect(options).toContain('credit');
		expect(options).toContain('investment');
		expect(options).toContain('cash');
	});

	it('should dispatch submit event with correct data', async () => {
		let submitData: Record<string, unknown> | null = null;

		render(AddAccountModal, {
			props: { isOpen: true },
			events: {
				submit: (event: CustomEvent) => {
					submitData = event.detail;
				}
			}
		} as any);

		// Fill in form
		const nameInput = screen.getByTestId('add-account-modal-name-input') as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'My Checking' } });

		const balanceInput = screen.getByTestId('add-account-modal-balance-input') as HTMLInputElement;
		await fireEvent.input(balanceInput, { target: { value: '1500.50' } });

		const submitBtn = screen.getByTestId('add-account-modal-submit');
		await fireEvent.click(submitBtn);

		expect(submitData).not.toBeNull();
		expect((submitData as unknown as Record<string, unknown>).name).toBe('My Checking');
		expect((submitData as unknown as Record<string, unknown>).startingBalanceCents).toBe(150050);
	});

	it('should dispatch close event on cancel', async () => {
		let closeCalled = false;

		render(AddAccountModal, {
			props: { isOpen: true },
			events: {
				close: () => {
					closeCalled = true;
				}
			}
		} as any);

		const cancelBtn = screen.getByTestId('add-account-modal-cancel');
		await fireEvent.click(cancelBtn);

		expect(closeCalled).toBe(true);
	});

	it('should convert starting balance to cents on submit', async () => {
		let submitData: Record<string, unknown> | null = null;

		render(AddAccountModal, {
			props: { isOpen: true },
			events: {
				submit: (event: CustomEvent) => {
					submitData = event.detail;
				}
			}
		} as any);

		const nameInput = screen.getByTestId('add-account-modal-name-input') as HTMLInputElement;
		await fireEvent.input(nameInput, { target: { value: 'Test' } });

		const balanceInput = screen.getByTestId('add-account-modal-balance-input') as HTMLInputElement;
		await fireEvent.input(balanceInput, { target: { value: '123.45' } });

		const submitBtn = screen.getByTestId('add-account-modal-submit');
		await fireEvent.click(submitBtn);

		expect(submitData).not.toBeNull();
		// 123.45 -> 12345 cents
		expect((submitData as unknown as Record<string, unknown>).startingBalanceCents).toBe(12345);
	});

	it('should use defaultType prop for initial account type', () => {
		render(AddAccountModal, {
			props: { isOpen: true, defaultType: 'credit' }
		});

		const select = screen.getByTestId('add-account-modal-type-select') as HTMLSelectElement;
		expect(select.value).toBe('credit');
	});

	it('should accept custom testId', () => {
		render(AddAccountModal, {
			props: { isOpen: true, testId: 'custom-modal' }
		});

		expect(screen.getByTestId('custom-modal')).toBeTruthy();
		expect(screen.getByTestId('custom-modal-title')).toBeTruthy();
	});

	it('should show full country names in country dropdown, not just codes', () => {
		render(AddAccountModal, {
			props: { isOpen: true }
		});

		const select = screen.getByTestId('add-account-modal-country-select') as HTMLSelectElement;
		const options = Array.from(select.options);

		// First option is the placeholder
		expect(options[0].textContent).toBe('-- Select --');

		// Country options should show full names with code
		const nlOption = options.find((o) => o.value === 'NL');
		expect(nlOption).toBeDefined();
		expect(nlOption!.textContent).toBe('Netherlands (NL)');

		const usOption = options.find((o) => o.value === 'US');
		expect(usOption).toBeDefined();
		expect(usOption!.textContent).toBe('United States (US)');

		// No option should show just a bare 2-letter code as text
		const countryOptions = options.filter((o) => o.value !== '');
		for (const opt of countryOptions) {
			expect(opt.textContent!.length).toBeGreaterThan(2);
		}
	});
});
