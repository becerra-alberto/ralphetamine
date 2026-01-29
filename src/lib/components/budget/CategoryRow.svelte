<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import type { Category } from '$lib/types/category';
	import type { MonthString } from '$lib/types/budget';
	import type { BudgetCell as BudgetCellType } from '$lib/stores/budget';
	import type { Trailing12MTotals } from '$lib/utils/budgetCalculations';
	import type { MiniTransaction } from './TransactionMiniList.svelte';
	import BudgetCell from './BudgetCell.svelte';
	import TotalsColumn from './TotalsColumn.svelte';
	import CellExpansion from './CellExpansion.svelte';

	export let category: Category;
	export let cells: Map<MonthString, BudgetCellType>;
	export let months: MonthString[];
	export let currentMonth: MonthString;
	export let totals12M: Trailing12MTotals | undefined = undefined;

	// Expansion state
	export let expandedCellKey: string | null = null;
	export let expansionTransactions: MiniTransaction[] = [];
	export let expansionTotalCount: number = 0;
	export let isExpansionLoading: boolean = false;

	// Cell refs for programmatic focus/edit - using object for bind:this compatibility
	let cellRefs: Record<string, BudgetCell> = {};

	// Index of this category's row (for cross-row navigation)
	export let rowIndex: number = 0;

	// Pending edit request from parent (for Tab navigation)
	export let pendingEditMonth: MonthString | null = null;

	const dispatch = createEventDispatcher<{
		expand: { categoryId: string; month: MonthString };
		closeExpansion: void;
		budgetChange: { categoryId: string; month: MonthString; amountCents: number };
		navigate: { categoryId: string; month: MonthString; direction: 'next' | 'prev'; monthIndex: number; rowIndex: number };
		setFutureMonths: { categoryId: string; month: MonthString; amountCents: number };
		increaseFutureMonths: { categoryId: string; month: MonthString; percentage: number };
	}>();

	/**
	 * Create a unique key for a cell
	 */
	function getCellKey(categoryId: string, month: MonthString): string {
		return `${categoryId}:${month}`;
	}

	/**
	 * Check if a specific cell is expanded
	 */
	function isCellExpanded(month: MonthString): boolean {
		return expandedCellKey === getCellKey(category.id, month);
	}

	/**
	 * Get expanded month (if this category has an expanded cell)
	 */
	$: expandedMonth = months.find((m) => isCellExpanded(m));
	$: hasExpansion = expandedMonth !== undefined;

	/**
	 * Handle cell expand event
	 */
	function handleCellExpand(event: CustomEvent<{ categoryId: string; month: MonthString }>) {
		dispatch('expand', event.detail);
	}

	/**
	 * Handle expansion close
	 */
	function handleCloseExpansion() {
		dispatch('closeExpansion');
	}

	/**
	 * Handle budget change from cell editing
	 */
	function handleBudgetChange(event: CustomEvent<{ categoryId: string; month: MonthString; amountCents: number }>) {
		dispatch('budgetChange', event.detail);
	}

	/**
	 * Handle Tab navigation from a cell
	 */
	function handleCellNavigate(event: CustomEvent<{ categoryId: string; month: MonthString; direction: 'next' | 'prev'; amountCents: number }>) {
		const { month, direction, amountCents } = event.detail;
		const monthIndex = months.indexOf(month);

		// Dispatch navigation event for parent to handle
		dispatch('navigate', {
			categoryId: category.id,
			month,
			direction,
			monthIndex,
			rowIndex
		});
	}

	/**
	 * Handle set future months from context menu
	 */
	function handleSetFutureMonths(event: CustomEvent<{ categoryId: string; month: MonthString; amountCents: number }>) {
		dispatch('setFutureMonths', event.detail);
	}

	/**
	 * Handle increase future months from context menu
	 */
	function handleIncreaseFutureMonths(event: CustomEvent<{ categoryId: string; month: MonthString; percentage: number }>) {
		dispatch('increaseFutureMonths', event.detail);
	}

	/**
	 * Public method: Start editing a specific month's cell
	 */
	export function startEditingMonth(month: MonthString) {
		const cell = cellRefs[month];
		if (cell) {
			cell.startEditing();
		}
	}

	// React to pendingEditMonth changes from parent
	$: if (pendingEditMonth && cellRefs[pendingEditMonth]) {
		// Use tick to ensure the cell is rendered before trying to edit
		tick().then(() => {
			const cell = cellRefs[pendingEditMonth!];
			if (cell) {
				cell.startEditing();
			}
		});
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
			<BudgetCell
				bind:this={cellRefs[month]}
				{month}
				budgetedCents={cell?.budgetedCents ?? 0}
				actualCents={cell?.actualCents ?? 0}
				isCurrent={month === currentMonth}
				categoryType={category.type}
				categoryId={category.id}
				isExpanded={isCellExpanded(month)}
				on:expand={handleCellExpand}
				on:budgetChange={handleBudgetChange}
				on:navigate={handleCellNavigate}
				on:setFutureMonths={handleSetFutureMonths}
				on:increaseFutureMonths={handleIncreaseFutureMonths}
			/>
		{/each}
	</div>

	<!-- 12M totals column -->
	{#if totals12M}
		<TotalsColumn totals={totals12M} />
	{/if}
</div>

<!-- Expansion panel (shown below the row when a cell is expanded) -->
{#if hasExpansion && expandedMonth}
	<CellExpansion
		categoryId={category.id}
		categoryName={category.name}
		month={expandedMonth}
		transactions={expansionTransactions}
		totalCount={expansionTotalCount}
		isLoading={isExpansionLoading}
		on:close={handleCloseExpansion}
	/>
{/if}

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
