<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MonthString } from '$lib/types/budget';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import { getBudgetStatusWithClass } from '$lib/utils/budgetStatus';
	import { tooltip } from '$lib/actions/tooltip';
	import Tooltip from '$lib/components/shared/Tooltip.svelte';
	import BudgetCellTooltip from './BudgetCellTooltip.svelte';

	export let budgetedCents: number = 0;
	export let actualCents: number = 0;
	export let month: MonthString;
	export let isCurrent: boolean = false;
	export let categoryType: 'expense' | 'income' | 'transfer' = 'expense';
	export let categoryId: string = '';
	export let isExpanded: boolean = false;

	const dispatch = createEventDispatcher<{
		expand: { categoryId: string; month: MonthString };
	}>();

	// Calculate budget status using the utility
	$: statusResult = getBudgetStatusWithClass(actualCents, budgetedCents, categoryType);
	$: statusClass = statusResult.className;

	/**
	 * Handle click to expand cell
	 */
	function handleClick() {
		dispatch('expand', { categoryId, month });
	}

	/**
	 * Handle keyboard expand
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			dispatch('expand', { categoryId, month });
		}
	}

	// Tooltip state
	let tooltipVisible = false;
	let cellElement: HTMLElement | null = null;
	let isTooltipHovered = false;

	function showTooltip(element: HTMLElement) {
		cellElement = element;
		tooltipVisible = true;
	}

	function hideTooltip() {
		if (!isTooltipHovered) {
			tooltipVisible = false;
		}
	}

	function handleTooltipMouseEnter() {
		isTooltipHovered = true;
	}

	function handleTooltipMouseLeave() {
		isTooltipHovered = false;
		tooltipVisible = false;
	}
</script>

<div
	class="budget-cell {statusClass}"
	class:current-month={isCurrent}
	class:expanded={isExpanded}
	role="cell"
	tabindex="0"
	data-testid="budget-cell"
	data-month={month}
	on:click={handleClick}
	on:keydown={handleKeydown}
	use:tooltip={{ onShow: showTooltip, onHide: hideTooltip, showDelay: 200, hideDelay: 200 }}
>
	<span class="cell-actual" data-testid="cell-actual">
		{formatCentsCurrency(actualCents)}
	</span>
	<span class="cell-budgeted" data-testid="cell-budgeted">
		{formatCentsCurrency(budgetedCents)}
	</span>
</div>

<Tooltip visible={tooltipVisible} targetElement={cellElement}>
	<div
		on:mouseenter={handleTooltipMouseEnter}
		on:mouseleave={handleTooltipMouseLeave}
		role="presentation"
	>
		<BudgetCellTooltip
			{actualCents}
			budgetCents={budgetedCents}
			{categoryId}
			{month}
		/>
	</div>
</Tooltip>

<style>
	.budget-cell {
		min-width: 100px;
		width: 120px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-end;
		gap: 2px;
		border-right: 1px solid var(--border-color, #e5e7eb);
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.budget-cell:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.budget-cell:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: -2px;
	}

	.budget-cell.expanded {
		background: var(--bg-expanded, #e0e7ff);
		border-left: 3px solid var(--color-accent, #4f46e5);
	}

	.budget-cell.current-month {
		background: var(--bg-highlight, #eff6ff);
	}

	.cell-actual {
		font-size: 0.875rem; /* 14px */
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.cell-budgeted {
		font-size: 0.75rem; /* 12px */
		color: var(--text-secondary, #6b7280);
	}

	/* Status indicators - Background colors with subtle opacity */
	.status-success {
		background: rgba(16, 185, 129, 0.1); /* --color-success at 10% opacity */
		border-left: 3px solid var(--color-success, #10b981);
	}

	.status-success .cell-actual {
		color: var(--color-success, #10b981);
	}

	.status-warning {
		background: rgba(245, 158, 11, 0.1); /* --color-warning at 10% opacity */
		border-left: 3px solid var(--color-warning, #f59e0b);
	}

	.status-warning .cell-actual {
		color: var(--color-warning, #f59e0b);
	}

	.status-danger {
		background: rgba(239, 68, 68, 0.1); /* --color-danger at 10% opacity */
		border-left: 3px solid var(--color-danger, #ef4444);
	}

	.status-danger .cell-actual {
		color: var(--color-danger, #ef4444);
	}

	.status-neutral {
		background: rgba(107, 114, 128, 0.05); /* --text-secondary at 5% opacity */
		border-left: 3px solid var(--text-secondary, #6b7280);
	}

	/* Dark mode */
	:global(.dark) .budget-cell {
		--bg-primary: #0f0f0f;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--bg-highlight: #1e3a5f;
	}
</style>
