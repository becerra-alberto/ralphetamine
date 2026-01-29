<script lang="ts">
	import type { Category } from '$lib/types/category';
	import type { MonthString } from '$lib/types/budget';
	import type { BudgetCell } from '$lib/stores/budget';
	import { formatCentsCurrency } from '$lib/types/budget';

	export let category: Category;
	export let cells: Map<MonthString, BudgetCell>;
	export let months: MonthString[];
	export let currentMonth: MonthString;

	/**
	 * Get color indicator class based on budget usage
	 */
	function getStatusClass(cell: BudgetCell): string {
		if (cell.budgetedCents === 0) return '';

		const percentUsed = (Math.abs(cell.actualCents) / cell.budgetedCents) * 100;

		if (percentUsed <= 75) return 'status-good';
		if (percentUsed <= 100) return 'status-warning';
		return 'status-danger';
	}
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
			{@const statusClass = cell ? getStatusClass(cell) : ''}
			<div
				class="budget-cell {statusClass}"
				class:current-month={month === currentMonth}
				role="cell"
				data-testid="budget-cell"
				data-month={month}
			>
				{#if cell}
					<span class="cell-budgeted">
						{formatCentsCurrency(cell.budgetedCents)}
					</span>
					<span class="cell-actual">
						{formatCentsCurrency(cell.actualCents)}
					</span>
				{:else}
					<span class="cell-budgeted">€0.00</span>
					<span class="cell-actual">€0.00</span>
				{/if}
			</div>
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

	.budget-cell {
		min-width: 120px;
		width: 120px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		border-right: 1px solid var(--border-color, #e5e7eb);
		font-variant-numeric: tabular-nums;
	}

	.budget-cell.current-month {
		background: var(--bg-highlight, #eff6ff);
	}

	.cell-budgeted {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.cell-actual {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	/* Status indicators */
	.status-good .cell-actual {
		color: var(--color-success, #10b981);
	}

	.status-warning .cell-actual {
		color: var(--color-warning, #f59e0b);
	}

	.status-danger .cell-actual {
		color: var(--color-danger, #ef4444);
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
