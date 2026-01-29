<script lang="ts">
	import type { MonthString } from '$lib/types/budget';
	import type { Trailing12MTotals } from '$lib/utils/budgetCalculations';
	import { formatCentsCurrency } from '$lib/types/budget';
	import TotalsColumn from './TotalsColumn.svelte';
	import { goto } from '$app/navigation';

	export let months: MonthString[];
	export let currentMonth: MonthString;
	export let monthlyTotals: Map<MonthString, { totalCents: number; transactionCount: number }>;
	export let totalTransactionCount: number;
	export let totals12M: Trailing12MTotals | undefined = undefined;

	/**
	 * Navigate to transactions view filtered by uncategorized
	 */
	function handleRowClick() {
		goto('/transactions?filter=uncategorized');
	}

	/**
	 * Handle keyboard navigation
	 */
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleRowClick();
		}
	}
</script>

<div
	class="uncategorized-row"
	role="row"
	data-testid="uncategorized-row"
	tabindex="0"
	on:click={handleRowClick}
	on:keydown={handleKeyDown}
>
	<!-- Row label (sticky column) -->
	<div class="row-label" role="rowheader">
		<span class="label-text">Uncategorized</span>
		<span class="count-badge" data-testid="transaction-count">
			({totalTransactionCount} transaction{totalTransactionCount !== 1 ? 's' : ''})
		</span>
	</div>

	<!-- Monthly totals cells -->
	<div class="uncategorized-cells">
		{#each months as month (month)}
			{@const monthData = monthlyTotals.get(month)}
			<div
				class="uncategorized-cell"
				class:current-month={month === currentMonth}
				role="cell"
				data-testid="uncategorized-cell"
				data-month={month}
			>
				{#if monthData && monthData.totalCents !== 0}
					<span class="cell-actual">
						{formatCentsCurrency(Math.abs(monthData.totalCents))}
					</span>
				{:else}
					<span class="cell-empty">—</span>
				{/if}
			</div>
		{/each}
	</div>

	<!-- 12M totals column -->
	{#if totals12M}
		<TotalsColumn totals={totals12M} />
	{:else}
		<div class="totals-placeholder"></div>
	{/if}
</div>

<style>
	.uncategorized-row {
		display: flex;
		min-height: 48px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		background: var(--bg-warning-light, rgba(245, 158, 11, 0.08));
		border-left: 3px solid var(--color-warning, #f59e0b);
		cursor: pointer;
		transition: background 150ms ease;
	}

	.uncategorized-row:hover {
		background: var(--bg-warning-hover, rgba(245, 158, 11, 0.12));
	}

	.uncategorized-row:focus {
		outline: 2px solid var(--color-warning, #f59e0b);
		outline-offset: -2px;
	}

	.row-label {
		min-width: 200px;
		width: 200px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		background: var(--bg-warning-light, rgba(245, 158, 11, 0.08));
		border-right: 1px solid var(--border-color, #e5e7eb);
		position: sticky;
		left: 0;
		z-index: 10;
	}

	.uncategorized-row:hover .row-label {
		background: var(--bg-warning-hover, rgba(245, 158, 11, 0.12));
	}

	.label-text {
		font-weight: 600;
		color: var(--color-warning, #f59e0b);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.count-badge {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.uncategorized-cells {
		display: flex;
		flex: 1;
	}

	.uncategorized-cell {
		min-width: 120px;
		width: 120px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		border-right: 1px solid var(--border-color, #e5e7eb);
		font-variant-numeric: tabular-nums;
	}

	.uncategorized-cell.current-month {
		background: var(--bg-warning-current, rgba(245, 158, 11, 0.15));
	}

	.cell-actual {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.cell-empty {
		font-size: 0.875rem;
		color: var(--text-tertiary, #9ca3af);
	}

	.totals-placeholder {
		min-width: 140px;
		width: 140px;
		background: var(--bg-warning-light, rgba(245, 158, 11, 0.08));
		border-left: 2px solid var(--color-accent, #4f46e5);
	}

	/* Dark mode */
	:global(.dark) .uncategorized-row {
		--bg-warning-light: rgba(245, 158, 11, 0.1);
		--bg-warning-hover: rgba(245, 158, 11, 0.15);
		--bg-warning-current: rgba(245, 158, 11, 0.2);
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--text-tertiary: #6b7280;
	}
</style>
