<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import AccountRow from './AccountRow.svelte';
	import type { AccountCategory } from '$lib/utils/accountGroups';

	export let category: AccountCategory;
	export let editable = false;
	export let testId = 'asset-category';

	const dispatch = createEventDispatcher();

	$: formattedTotal = formatCentsCurrency(category.totalCents);
	$: formattedPercent = `${category.percentOfTotal.toFixed(1)}%`;

	function handleBalanceSave(event: CustomEvent) {
		dispatch('balanceSave', event.detail);
	}

	function handleEdit(event: CustomEvent) {
		dispatch('edit', event.detail);
	}

	function handleDelete(event: CustomEvent) {
		dispatch('delete', event.detail);
	}
</script>

<div class="asset-category" data-testid={testId}>
	<div class="category-header" data-testid="{testId}-header">
		<div class="header-left">
			<h3 class="category-label" data-testid="{testId}-label">{category.label}</h3>
			<span class="category-percent" data-testid="{testId}-percent">{formattedPercent}</span>
		</div>
		<span class="category-total" data-testid="{testId}-total">{formattedTotal}</span>
	</div>
	<div class="account-list" data-testid="{testId}-accounts">
		{#each category.accounts as account, i (account.id)}
			<AccountRow {account} {editable} testId="{testId}-account-{i}" on:balanceSave={handleBalanceSave} on:edit={handleEdit} on:delete={handleDelete} />
		{/each}
	</div>
</div>

<style>
	.asset-category {
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		overflow: visible;
	}

	.category-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		border-radius: 7px 7px 0 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.category-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.category-percent {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		font-weight: 500;
	}

	.category-total {
		font-size: 0.9375rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary, #111827);
	}

	.account-list {
		padding: 4px 4px;
	}

	:global(.dark) .asset-category {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
	}

	:global(.dark) .category-header {
		background: var(--bg-tertiary, #0f0f0f);
		border-color: #2d2d2d;
	}

	:global(.dark) .category-label {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .category-total {
		color: var(--text-primary, #f9fafb);
	}
</style>
