import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import AccountValueMapping from '../../components/import/AccountValueMapping.svelte';
import type { Account } from '$lib/types/account';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue([])
}));

function mockAccount(overrides: Partial<Account> = {}): Account {
	return {
		id: 'acct-1',
		name: 'My Checking',
		type: 'checking',
		institution: 'Test Bank',
		currency: 'EUR',
		isActive: true,
		includeInNetWorth: true,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z',
		bankNumber: null,
		country: null,
		...overrides
	};
}

const accounts: Account[] = [
	mockAccount({ id: 'acct-1', name: 'My Checking', bankNumber: 'NL91ABNA0417164300' }),
	mockAccount({ id: 'acct-2', name: 'Savings Account', type: 'savings' }),
	mockAccount({ id: 'acct-3', name: 'Credit Card', type: 'credit', bankNumber: 'CC-1234' })
];

describe('AccountValueMapping', () => {
	// --- Unit Tests ---

	describe('extracting unique account values', () => {
		it('should display all unique CSV account values', () => {
			const uniqueValues = ['Checking', 'Savings', 'Investment'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			expect(screen.getByTestId('account-value-mapping-csv-value-0').textContent?.trim()).toBe('Checking');
			expect(screen.getByTestId('account-value-mapping-csv-value-1').textContent?.trim()).toBe('Savings');
			expect(screen.getByTestId('account-value-mapping-csv-value-2').textContent?.trim()).toBe('Investment');
		});

		it('should render the correct number of mapping rows', () => {
			const uniqueValues = ['Account A', 'Account B'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			expect(screen.getByTestId('account-value-mapping-row-0')).toBeTruthy();
			expect(screen.getByTestId('account-value-mapping-row-1')).toBeTruthy();
			expect(screen.queryByTestId('account-value-mapping-row-2')).toBeNull();
		});
	});

	describe('auto-matching by name', () => {
		it('should auto-match CSV value to existing account by name (case-insensitive)', () => {
			// "my checking" should match account "My Checking"
			const uniqueValues = ['my checking'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			// The action select should be set to 'existing' (auto-matched)
			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			expect(actionSelect.value).toBe('existing');

			// The account dropdown should be pre-selected with the matched account
			const accountSelect = screen.getByTestId('account-value-mapping-account-select-0') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acct-1');
		});

		it('should auto-match CSV value to existing account by exact name match', () => {
			const uniqueValues = ['Savings Account'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			expect(actionSelect.value).toBe('existing');

			const accountSelect = screen.getByTestId('account-value-mapping-account-select-0') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acct-2');
		});

		it('should leave unmatched values as unmapped', () => {
			const uniqueValues = ['Unknown Bank'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			expect(actionSelect.value).toBe('');
		});
	});

	describe('auto-matching by bank number', () => {
		it('should auto-match by bank number when name does not match', () => {
			const uniqueValues = ['NL91ABNA0417164300'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			expect(actionSelect.value).toBe('existing');

			const accountSelect = screen.getByTestId('account-value-mapping-account-select-0') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acct-1');
		});

		it('should auto-match bank number case-insensitively', () => {
			const uniqueValues = ['cc-1234'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			expect(actionSelect.value).toBe('existing');

			const accountSelect = screen.getByTestId('account-value-mapping-account-select-0') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acct-3');
		});
	});

	describe('unmapped values prevent proceeding', () => {
		it('should show unmapped warning when not all values are mapped', () => {
			const uniqueValues = ['Unknown Account'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			expect(screen.getByTestId('account-value-mapping-unmapped-warning')).toBeTruthy();
		});

		it('should not show unmapped warning when all values are auto-matched', () => {
			const uniqueValues = ['My Checking'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			expect(screen.queryByTestId('account-value-mapping-unmapped-warning')).toBeNull();
		});
	});

	// --- Component Tests ---

	describe('component rendering', () => {
		it('should render the mapping panel with title and subtitle', () => {
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: ['Test Value'],
					existingAccounts: accounts
				}
			});

			expect(screen.getByTestId('account-value-mapping')).toBeTruthy();
			expect(screen.getByTestId('account-value-mapping-title').textContent).toContain('Map Account Values');
			expect(screen.getByTestId('account-value-mapping-subtitle')).toBeTruthy();
		});

		it('should render the mapping list', () => {
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: ['Value A', 'Value B', 'Value C'],
					existingAccounts: accounts
				}
			});

			expect(screen.getByTestId('account-value-mapping-list')).toBeTruthy();
		});

		it('should accept custom testId', () => {
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: ['Test'],
					existingAccounts: accounts,
					testId: 'custom-mapping'
				}
			});

			expect(screen.getByTestId('custom-mapping')).toBeTruthy();
		});
	});

	describe('create new form', () => {
		it('should show create form when "Create new" is selected', async () => {
			const uniqueValues = ['New Account'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			await fireEvent.change(actionSelect, { target: { value: 'create' } });

			expect(screen.getByTestId('account-value-mapping-create-form-0')).toBeTruthy();
		});

		it('should pre-populate name from CSV value in create form', async () => {
			const uniqueValues = ['My New Bank'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			await fireEvent.change(actionSelect, { target: { value: 'create' } });

			const nameInput = screen.getByTestId('account-value-mapping-new-name-0') as HTMLInputElement;
			expect(nameInput.value).toBe('My New Bank');
		});

		it('should show type, institution, bank number, and country fields', async () => {
			const uniqueValues = ['New Account'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			await fireEvent.change(actionSelect, { target: { value: 'create' } });

			expect(screen.getByTestId('account-value-mapping-new-name-0')).toBeTruthy();
			expect(screen.getByTestId('account-value-mapping-new-type-0')).toBeTruthy();
			expect(screen.getByTestId('account-value-mapping-new-institution-0')).toBeTruthy();
			expect(screen.getByTestId('account-value-mapping-new-bank-number-0')).toBeTruthy();
			expect(screen.getByTestId('account-value-mapping-new-country-0')).toBeTruthy();
		});

		it('should hide create form when switching back to existing', async () => {
			const uniqueValues = ['New Account'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			await fireEvent.change(actionSelect, { target: { value: 'create' } });
			expect(screen.getByTestId('account-value-mapping-create-form-0')).toBeTruthy();

			await fireEvent.change(actionSelect, { target: { value: 'existing' } });
			expect(screen.queryByTestId('account-value-mapping-create-form-0')).toBeNull();
		});
	});

	describe('existing account dropdown', () => {
		it('should show existing accounts in the dropdown', async () => {
			const uniqueValues = ['Unknown'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			// Select "existing" action
			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			await fireEvent.change(actionSelect, { target: { value: 'existing' } });

			const accountSelect = screen.getByTestId('account-value-mapping-account-select-0') as HTMLSelectElement;
			expect(accountSelect.options.length).toBe(3);
			expect(accountSelect.options[0].textContent).toBe('My Checking');
			expect(accountSelect.options[1].textContent).toBe('Savings Account');
			expect(accountSelect.options[2].textContent).toBe('Credit Card');
		});

		it('should allow overriding auto-matched account', async () => {
			const uniqueValues = ['My Checking'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			// Auto-matched to acct-1
			const accountSelect = screen.getByTestId('account-value-mapping-account-select-0') as HTMLSelectElement;
			expect(accountSelect.value).toBe('acct-1');

			// Override to acct-2
			await fireEvent.change(accountSelect, { target: { value: 'acct-2' } });
			expect(accountSelect.value).toBe('acct-2');
		});
	});

	describe('skip action', () => {
		it('should allow skipping a CSV value', async () => {
			const uniqueValues = ['Ignored Account'];
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: uniqueValues,
					existingAccounts: accounts
				}
			});

			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			await fireEvent.change(actionSelect, { target: { value: 'skip' } });
			await tick();
			expect(actionSelect.value).toBe('skip');

			// No unmapped warning since skip is a valid selection
			expect(screen.queryByTestId('account-value-mapping-unmapped-warning')).toBeNull();
		});
	});

	describe('empty states', () => {
		it('should handle empty unique values list', () => {
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: [],
					existingAccounts: accounts
				}
			});

			expect(screen.getByTestId('account-value-mapping')).toBeTruthy();
			expect(screen.queryByTestId('account-value-mapping-row-0')).toBeNull();
			// No unmapped warning when empty - all (zero) are mapped
			expect(screen.queryByTestId('account-value-mapping-unmapped-warning')).toBeNull();
		});

		it('should handle empty existing accounts list', () => {
			render(AccountValueMapping, {
				props: {
					uniqueAccountValues: ['Test'],
					existingAccounts: []
				}
			});

			expect(screen.getByTestId('account-value-mapping-row-0')).toBeTruthy();
			// Only "Create new" and "Skip" should be available (no "Map to existing")
			const actionSelect = screen.getByTestId('account-value-mapping-action-0') as HTMLSelectElement;
			const options = Array.from(actionSelect.options).map((o) => o.value);
			expect(options).not.toContain('existing');
			expect(options).toContain('create');
			expect(options).toContain('skip');
		});
	});
});
