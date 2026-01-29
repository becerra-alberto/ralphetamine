<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Account } from '$lib/types/account';

	export let accounts: Account[] = [];
	export let selectedIds: string[] = [];

	const dispatch = createEventDispatcher<{
		toggle: { accountId: string };
		selectAll: void;
		clearAll: void;
	}>();

	$: allSelected = accounts.length > 0 && selectedIds.length === accounts.length;
	$: noneSelected = selectedIds.length === 0;

	function handleToggle(accountId: string) {
		dispatch('toggle', { accountId });
	}

	function handleSelectAll() {
		dispatch('selectAll');
	}

	function handleClearAll() {
		dispatch('clearAll');
	}

	function getCurrencyIndicator(currency: string): string {
		const symbols: Record<string, string> = {
			EUR: '\u20AC',
			USD: '$',
			CAD: 'C$',
			GBP: '\u00A3'
		};
		return symbols[currency] || currency;
	}
</script>

<div class="filter-section" data-testid="account-filter">
	<div class="filter-header">
		<h4 class="filter-label">Accounts</h4>
		<div class="header-actions">
			<button
				type="button"
				class="action-btn"
				on:click={handleSelectAll}
				disabled={allSelected}
				data-testid="account-select-all"
			>
				Select all
			</button>
			<button
				type="button"
				class="action-btn"
				on:click={handleClearAll}
				disabled={noneSelected}
				data-testid="account-clear-all"
			>
				Clear all
			</button>
		</div>
	</div>

	<div class="checkbox-list" data-testid="account-list">
		{#each accounts as account}
			<label class="checkbox-item" data-testid="account-item-{account.id}">
				<input
					type="checkbox"
					checked={selectedIds.includes(account.id)}
					on:change={() => handleToggle(account.id)}
					aria-label="Filter by {account.name}"
				/>
				<span class="checkbox-label">
					{account.name}
					<span class="currency-badge">{getCurrencyIndicator(account.currency)}</span>
				</span>
			</label>
		{/each}

		{#if accounts.length === 0}
			<p class="empty-message">No accounts found</p>
		{/if}
	</div>
</div>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.filter-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.action-btn {
		font-size: 0.7rem;
		color: var(--accent, #4f46e5);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.action-btn:disabled {
		color: var(--text-tertiary, #9ca3af);
		cursor: default;
	}

	.action-btn:hover:not(:disabled) {
		text-decoration: underline;
	}

	.checkbox-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 150px;
		overflow-y: auto;
	}

	.checkbox-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--text-primary, #111827);
	}

	.checkbox-item input[type='checkbox'] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.currency-badge {
		font-size: 0.65rem;
		padding: 1px 4px;
		background: var(--bg-secondary, #f3f4f6);
		border-radius: 3px;
		color: var(--text-secondary, #6b7280);
	}

	.empty-message {
		font-size: 0.75rem;
		color: var(--text-tertiary, #9ca3af);
		margin: 0;
	}

	:global(.dark) .currency-badge {
		background: var(--bg-secondary, #1a1a1a);
	}
</style>
