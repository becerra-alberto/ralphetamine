<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import AssetCategory from './AssetCategory.svelte';
	import { groupAccountsByCategory } from '$lib/utils/accountGroups';
	import type { AccountWithBalance } from '$lib/api/netWorth';

	export let accounts: AccountWithBalance[] = [];
	export let totalAssetsCents: number = 0;
	export let editable = false;
	export let testId = 'assets-section';

	const dispatch = createEventDispatcher();

	$: categories = groupAccountsByCategory(accounts, totalAssetsCents);
	$: hasCategories = categories.length > 0;

	function handleBalanceSave(event: CustomEvent) {
		dispatch('balanceSave', event.detail);
	}

	function handleAddAccount() {
		dispatch('addAccount', { defaultType: 'checking' });
	}
</script>

<section class="assets-section" data-testid={testId}>
	<div class="section-header">
		<h2 class="section-title" data-testid="{testId}-title">Assets</h2>
		{#if editable}
			<button class="add-account-btn" data-testid="{testId}-add" on:click={handleAddAccount}>
				+ Add Account
			</button>
		{/if}
	</div>

	{#if hasCategories}
		<div class="categories-list" data-testid="{testId}-categories">
			{#each categories as category, i (category.key)}
				<AssetCategory {category} {editable} testId="{testId}-category-{i}" on:balanceSave={handleBalanceSave} />
			{/each}
		</div>
	{:else}
		<p class="empty-state" data-testid="{testId}-empty">No asset accounts found.</p>
	{/if}
</section>

<style>
	.assets-section {
		margin-top: 24px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.add-account-btn {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--accent, #4f46e5);
		background: none;
		border: 1px solid var(--accent, #4f46e5);
		border-radius: 6px;
		padding: 4px 12px;
		cursor: pointer;
	}

	.add-account-btn:hover {
		background: var(--accent, #4f46e5);
		color: white;
	}

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.empty-state {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		font-style: italic;
		padding: 16px 0;
	}

	:global(.dark) .section-title {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .add-account-btn {
		color: #818cf8;
		border-color: #818cf8;
	}

	:global(.dark) .add-account-btn:hover {
		background: #818cf8;
		color: #0f0f0f;
	}
</style>
