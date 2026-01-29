<script lang="ts">
	import LiabilityCategory from './LiabilityCategory.svelte';
	import { groupLiabilitiesByCategory } from '$lib/utils/accountGroups';
	import type { AccountWithBalance } from '$lib/api/netWorth';

	export let accounts: AccountWithBalance[] = [];
	export let totalLiabilitiesCents: number = 0;
	export let testId = 'liabilities-section';

	$: categories = groupLiabilitiesByCategory(accounts, totalLiabilitiesCents);
	$: hasCategories = categories.length > 0;
</script>

<section class="liabilities-section" data-testid={testId}>
	<h2 class="section-title" data-testid="{testId}-title">Liabilities</h2>

	{#if hasCategories}
		<div class="categories-list" data-testid="{testId}-categories">
			{#each categories as category, i (category.key)}
				<LiabilityCategory {category} testId="{testId}-category-{i}" />
			{/each}
		</div>
	{:else}
		<p class="empty-state" data-testid="{testId}-empty">No liabilities — debt-free!</p>
	{/if}
</section>

<style>
	.liabilities-section {
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
		color: var(--success, #10b981);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 16px 0;
	}

	:global(.dark) .section-title {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .empty-state {
		color: #34d399;
	}
</style>
