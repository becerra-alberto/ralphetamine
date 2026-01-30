<script lang="ts" context="module">
	import type { AccountType } from '$lib/types/account';

	export interface AccountMappingEntry {
		csvValue: string;
		action: 'existing' | 'create' | 'skip' | 'unmapped';
		accountId?: string;
		newAccount?: {
			name: string;
			type: AccountType;
			institution: string;
			bankNumber: string;
			country: string;
		};
	}
</script>

<script lang="ts">
	import { createEventDispatcher, afterUpdate } from 'svelte';
	import type { Account } from '$lib/types/account';
	import { ACCOUNT_TYPES } from '$lib/types/account';

	export let uniqueAccountValues: string[] = [];
	export let existingAccounts: Account[] = [];
	export let testId: string = 'account-value-mapping';

	const dispatch = createEventDispatcher<{
		mappingChange: {
			mappings: Record<string, AccountMappingEntry>;
			allMapped: boolean;
		};
	}>();

	let mappings: Record<string, AccountMappingEntry> = {};
	let expandedCreateForms: Set<string> = new Set();
	let initialized = false;

	// Track prop changes to re-initialize
	let prevValuesKey = '';
	$: valuesKey = uniqueAccountValues.join('|') + '::' + existingAccounts.map((a) => a.id).join('|');
	$: if (valuesKey !== prevValuesKey) {
		prevValuesKey = valuesKey;
		initializeMappings();
	}

	function initializeMappings() {
		const newMappings: Record<string, AccountMappingEntry> = {};
		for (const csvValue of uniqueAccountValues) {
			const matched = autoMatch(csvValue, existingAccounts);
			if (matched) {
				newMappings[csvValue] = {
					csvValue,
					action: 'existing',
					accountId: matched.id
				};
			} else {
				newMappings[csvValue] = {
					csvValue,
					action: 'unmapped'
				};
			}
		}
		mappings = newMappings;
		initialized = true;
		emitChange();
	}

	// Reactive computed: is everything mapped?
	$: allMapped = computeAllMapped(mappings, uniqueAccountValues);

	function autoMatch(csvValue: string, accounts: Account[]): Account | null {
		const normalized = csvValue.toLowerCase().trim();
		// Match by name (case-insensitive)
		for (const acct of accounts) {
			if (acct.name.toLowerCase().trim() === normalized) {
				return acct;
			}
		}
		// Match by bank number
		for (const acct of accounts) {
			if (acct.bankNumber && acct.bankNumber.toLowerCase().trim() === normalized) {
				return acct;
			}
		}
		return null;
	}

	function handleActionChange(csvValue: string, action: string) {
		if (action === 'existing') {
			// Default to first account
			const firstAccount = existingAccounts[0];
			mappings[csvValue] = {
				csvValue,
				action: 'existing',
				accountId: firstAccount?.id || ''
			};
			expandedCreateForms.delete(csvValue);
			expandedCreateForms = expandedCreateForms;
		} else if (action === 'create') {
			mappings[csvValue] = {
				csvValue,
				action: 'create',
				newAccount: {
					name: csvValue,
					type: 'checking',
					institution: '',
					bankNumber: '',
					country: ''
				}
			};
			expandedCreateForms.add(csvValue);
			expandedCreateForms = expandedCreateForms;
		} else if (action === 'skip') {
			mappings[csvValue] = {
				csvValue,
				action: 'skip'
			};
			expandedCreateForms.delete(csvValue);
			expandedCreateForms = expandedCreateForms;
		}
		mappings = mappings;
		emitChange();
	}

	function handleAccountSelect(csvValue: string, accountId: string) {
		mappings[csvValue] = {
			...mappings[csvValue],
			accountId
		};
		mappings = mappings;
		emitChange();
	}

	function handleNewAccountField(csvValue: string, field: string, value: string) {
		const entry = mappings[csvValue];
		if (entry?.action === 'create' && entry.newAccount) {
			entry.newAccount = { ...entry.newAccount, [field]: value };
			mappings[csvValue] = entry;
			mappings = mappings;
			emitChange();
		}
	}

	function computeAllMapped(m: Record<string, AccountMappingEntry>, values: string[]): boolean {
		for (const csvValue of values) {
			const entry = m[csvValue];
			if (!entry || entry.action === 'unmapped') return false;
			if (entry.action === 'existing' && !entry.accountId) return false;
			if (entry.action === 'create' && (!entry.newAccount || !entry.newAccount.name.trim())) return false;
		}
		return true;
	}

	function emitChange() {
		dispatch('mappingChange', {
			mappings,
			allMapped: computeAllMapped(mappings, uniqueAccountValues)
		});
	}

	function getActionValue(csvValue: string): string {
		const entry = mappings[csvValue];
		if (!entry || entry.action === 'unmapped') return '';
		return entry.action;
	}
</script>

<div class="account-mapping" data-testid={testId}>
	<div class="mapping-header">
		<h3 class="mapping-title" data-testid="{testId}-title">Map Account Values</h3>
		<p class="mapping-subtitle" data-testid="{testId}-subtitle">
			Map each unique CSV account value to an existing Stackz account
		</p>
	</div>

	<div class="mapping-list" data-testid="{testId}-list">
		{#each uniqueAccountValues as csvValue, idx}
			{@const entry = mappings[csvValue]}
			{@const isUnmapped = !entry || entry.action === 'unmapped'}
			<div
				class="mapping-row"
				class:mapping-row--unmapped={isUnmapped}
				class:mapping-row--matched={entry?.action === 'existing'}
				data-testid="{testId}-row-{idx}"
			>
				<div class="row-header">
					<span class="csv-value" data-testid="{testId}-csv-value-{idx}">
						{csvValue}
					</span>

					<div class="row-controls">
						<select
							class="action-select"
							value={getActionValue(csvValue)}
							data-testid="{testId}-action-{idx}"
							on:change={(e) => handleActionChange(csvValue, e.currentTarget.value)}
						>
							<option value="" disabled>Select action...</option>
							{#if existingAccounts.length > 0}
								<option value="existing">Map to existing</option>
							{/if}
							<option value="create">Create new</option>
							<option value="skip">Skip</option>
						</select>

						{#if entry?.action === 'existing'}
							<select
								class="account-select"
								value={entry.accountId || ''}
								data-testid="{testId}-account-select-{idx}"
								on:change={(e) => handleAccountSelect(csvValue, e.currentTarget.value)}
							>
								{#each existingAccounts as acct}
									<option value={acct.id}>{acct.name}</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>

				{#if entry?.action === 'create' && expandedCreateForms.has(csvValue)}
					<div class="create-form" data-testid="{testId}-create-form-{idx}">
						<div class="form-row">
							<label class="form-label">
								Name
								<input
									type="text"
									class="form-input"
									value={entry.newAccount?.name || ''}
									data-testid="{testId}-new-name-{idx}"
									on:input={(e) => handleNewAccountField(csvValue, 'name', e.currentTarget.value)}
								/>
							</label>
							<label class="form-label">
								Type
								<select
									class="form-input"
									value={entry.newAccount?.type || 'checking'}
									data-testid="{testId}-new-type-{idx}"
									on:change={(e) => handleNewAccountField(csvValue, 'type', e.currentTarget.value)}
								>
									{#each ACCOUNT_TYPES as accountType}
										<option value={accountType}>{accountType}</option>
									{/each}
								</select>
							</label>
						</div>
						<div class="form-row">
							<label class="form-label">
								Institution
								<input
									type="text"
									class="form-input"
									value={entry.newAccount?.institution || ''}
									placeholder="e.g., Chase, ING"
									data-testid="{testId}-new-institution-{idx}"
									on:input={(e) => handleNewAccountField(csvValue, 'institution', e.currentTarget.value)}
								/>
							</label>
							<label class="form-label">
								Bank Number
								<input
									type="text"
									class="form-input"
									value={entry.newAccount?.bankNumber || ''}
									placeholder="IBAN, CLABE, etc."
									data-testid="{testId}-new-bank-number-{idx}"
									on:input={(e) => handleNewAccountField(csvValue, 'bankNumber', e.currentTarget.value)}
								/>
							</label>
						</div>
						<div class="form-row">
							<label class="form-label">
								Country
								<input
									type="text"
									class="form-input"
									value={entry.newAccount?.country || ''}
									placeholder="e.g., US, NL, MX"
									data-testid="{testId}-new-country-{idx}"
									on:input={(e) => handleNewAccountField(csvValue, 'country', e.currentTarget.value)}
								/>
							</label>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if !allMapped}
		<div class="unmapped-warning" role="alert" data-testid="{testId}-unmapped-warning">
			All account values must be mapped before proceeding.
		</div>
	{/if}
</div>

<style>
	.account-mapping {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.mapping-header {
		text-align: center;
	}

	.mapping-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.mapping-subtitle {
		margin: 4px 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.mapping-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mapping-row {
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		padding: 12px;
		transition: border-color 0.15s ease;
	}

	.mapping-row--unmapped {
		border-color: var(--color-danger, #ef4444);
		background: rgba(239, 68, 68, 0.04);
	}

	.mapping-row--matched {
		border-color: var(--color-success, #10b981);
		background: rgba(16, 185, 129, 0.04);
	}

	.row-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.csv-value {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.action-select,
	.account-select {
		padding: 6px 10px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
	}

	.create-form {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--border-color, #e5e7eb);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.form-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
	}

	.form-input {
		padding: 6px 10px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
	}

	.form-input::placeholder {
		color: var(--text-secondary, #9ca3af);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}

	.unmapped-warning {
		padding: 10px 14px;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid var(--color-danger, #ef4444);
		border-radius: 8px;
		font-size: 0.8125rem;
		color: var(--color-danger, #ef4444);
	}

	/* Dark mode */
	:global(.dark) .mapping-title {
		color: #f9fafb;
	}

	:global(.dark) .csv-value {
		color: #f9fafb;
	}

	:global(.dark) .mapping-row {
		border-color: #374151;
	}

	:global(.dark) .mapping-row--unmapped {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
	}

	:global(.dark) .mapping-row--matched {
		border-color: #10b981;
		background: rgba(16, 185, 129, 0.08);
	}

	:global(.dark) .action-select,
	:global(.dark) .account-select,
	:global(.dark) .form-input {
		background: #1a1a1a;
		border-color: #374151;
		color: #f9fafb;
	}

	:global(.dark) .create-form {
		border-top-color: #374151;
	}
</style>
