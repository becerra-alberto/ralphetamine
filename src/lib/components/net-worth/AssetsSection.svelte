<script lang="ts">
	import AssetCategory from './AssetCategory.svelte';
	import { groupAccountsByCategory } from '$lib/utils/accountGroups';
	import type { AccountWithBalance } from '$lib/api/netWorth';

	export let accounts: AccountWithBalance[] = [];
	export let totalAssetsCents: number = 0;
	export let testId = 'assets-section';

	$: categories = groupAccountsByCategory(accounts, totalAssetsCents);
	$: hasCategories = categories.length > 0;
</script>

<section class="assets-section" data-testid={testId}>
	<h2 class="section-title" data-testid="{testId}-title">Assets</h2>

	{#if hasCategories}
		<div class="categories-list" data-testid="{testId}-categories">
			{#each categories as category, i (category.key)}
				<AssetCategory {category} testId="{testId}-category-{i}" />
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

	.section-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		margin: 0 0 12px 0;
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
</style>
