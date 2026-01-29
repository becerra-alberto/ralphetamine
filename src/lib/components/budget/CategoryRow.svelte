<script lang="ts">
	import type { Category } from '$lib/types/category';
	import type { MonthString } from '$lib/types/budget';
	import type { BudgetCell as BudgetCellType } from '$lib/stores/budget';
	import BudgetCell from './BudgetCell.svelte';

	export let category: Category;
	export let cells: Map<MonthString, BudgetCellType>;
	export let months: MonthString[];
	export let currentMonth: MonthString;
</script>

<div
	class="category-row"
	role="row"
	data-testid="category-row"
	data-category-id={category.id}
>
	<!-- Category name (sticky column) -->
	<div class="category-name" role="rowheader">
		<span class="name-text" title={category.name}>{category.name}</span>
	</div>

	<!-- Budget cells for each month -->
	<div class="category-cells">
		{#each months as month (month)}
			{@const cell = cells.get(month)}
			<BudgetCell
				{month}
				budgetedCents={cell?.budgetedCents ?? 0}
				actualCents={cell?.actualCents ?? 0}
				isCurrent={month === currentMonth}
				categoryType={category.type}
			/>
		{/each}
	</div>
</div>

<style>
	.category-row {
		display: flex;
		min-height: 48px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.category-row:hover {
		background: var(--bg-hover, #f9fafb);
	}

	.category-name {
		min-width: 200px;
		width: 200px;
		padding: 12px;
		display: flex;
		align-items: center;
		background: var(--bg-primary, #ffffff);
		border-right: 1px solid var(--border-color, #e5e7eb);
		position: sticky;
		left: 0;
		z-index: 10;
	}

	.category-row:hover .category-name {
		background: var(--bg-hover, #f9fafb);
	}

	.name-text {
		font-weight: 500;
		color: var(--text-primary, #111827);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.category-cells {
		display: flex;
		flex: 1;
	}

	/* Dark mode */
	:global(.dark) .category-row {
		--bg-primary: #0f0f0f;
		--bg-hover: #1a1a1a;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--bg-highlight: #1e3a5f;
	}
</style>
