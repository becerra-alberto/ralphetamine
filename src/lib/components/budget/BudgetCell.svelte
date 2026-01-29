<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MonthString } from '$lib/types/budget';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import { getBudgetStatusWithClass } from '$lib/utils/budgetStatus';
	import { tooltip } from '$lib/actions/tooltip';
	import Tooltip from '$lib/components/shared/Tooltip.svelte';
	import BudgetCellTooltip from './BudgetCellTooltip.svelte';
	import BudgetCellContextMenu from './BudgetCellContextMenu.svelte';
	import CellInput from './CellInput.svelte';

	export let budgetedCents: number = 0;
	export let actualCents: number = 0;
	export let month: MonthString;
	export let isCurrent: boolean = false;
	export let categoryType: 'expense' | 'income' | 'transfer' = 'expense';
	export let categoryId: string = '';
	export let isExpanded: boolean = false;

	const dispatch = createEventDispatcher<{
		expand: { categoryId: string; month: MonthString };
		budgetChange: { categoryId: string; month: MonthString; amountCents: number };
		navigate: {
			categoryId: string;
			month: MonthString;
			direction: 'next' | 'prev';
			amountCents: number;
		};
		setFutureMonths: { categoryId: string; month: MonthString; amountCents: number };
		increaseFutureMonths: { categoryId: string; month: MonthString; percentage: number };
	}>();

	// Edit mode state
	let isEditing: boolean = false;
	let hasInputError: boolean = false;

	// Context menu state
	let contextMenuVisible: boolean = false;
	let contextMenuX: number = 0;
	let contextMenuY: number = 0;

	// Calculate budget status using the utility
	$: statusResult = getBudgetStatusWithClass(actualCents, budgetedCents, categoryType);
	$: statusClass = statusResult.className;

	/**
	 * Handle single click to expand cell
	 */
	function handleClick() {
		if (!isEditing && !contextMenuVisible) {
			dispatch('expand', { categoryId, month });
		}
	}

	/**
	 * Handle double-click to enter edit mode
	 */
	function handleDoubleClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		enterEditMode();
	}

	/**
	 * Handle right-click to open context menu
	 */
	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		contextMenuX = event.clientX;
		contextMenuY = event.clientY;
		contextMenuVisible = true;
		tooltipVisible = false;
	}

	/**
	 * Handle keyboard events
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (isEditing) {
			// Let CellInput handle its own keyboard events
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			enterEditMode();
		} else if (event.key === ' ') {
			event.preventDefault();
			dispatch('expand', { categoryId, month });
		} else if (event.key === 'F10' && event.shiftKey) {
			// Shift+F10 opens context menu (keyboard accessibility)
			event.preventDefault();
			openContextMenuFromKeyboard();
		} else if (event.key === 'ContextMenu') {
			// Menu key opens context menu
			event.preventDefault();
			openContextMenuFromKeyboard();
		}
	}

	/**
	 * Open context menu via keyboard (position near the cell)
	 */
	function openContextMenuFromKeyboard() {
		if (cellRef) {
			const rect = cellRef.getBoundingClientRect();
			contextMenuX = rect.left + rect.width / 2;
			contextMenuY = rect.top + rect.height / 2;
			contextMenuVisible = true;
			tooltipVisible = false;
		}
	}

	/**
	 * Enter edit mode
	 */
	function enterEditMode() {
		isEditing = true;
		hasInputError = false;
		// Hide tooltip when editing
		tooltipVisible = false;
		contextMenuVisible = false;
	}

	/**
	 * Handle save from CellInput
	 */
	function handleSave(event: CustomEvent<{ valueCents: number }>) {
		const newValue = event.detail.valueCents;
		isEditing = false;
		hasInputError = false;

		// Only dispatch change if value actually changed
		if (newValue !== budgetedCents) {
			dispatch('budgetChange', {
				categoryId,
				month,
				amountCents: newValue
			});
		}
	}

	/**
	 * Handle cancel from CellInput
	 */
	function handleCancel() {
		isEditing = false;
		hasInputError = false;
	}

	/**
	 * Handle Tab navigation from CellInput
	 * Saves the value and dispatches navigate event for parent to handle focus
	 */
	function handleNavigate(event: CustomEvent<{ direction: 'next' | 'prev'; valueCents: number }>) {
		const { direction, valueCents } = event.detail;
		isEditing = false;
		hasInputError = false;

		// Dispatch budget change if value changed
		if (valueCents !== budgetedCents) {
			dispatch('budgetChange', {
				categoryId,
				month,
				amountCents: valueCents
			});
		}

		// Dispatch navigation event for parent to handle
		dispatch('navigate', {
			categoryId,
			month,
			direction,
			amountCents: valueCents
		});
	}

	/**
	 * Public method to programmatically enter edit mode
	 * Called by parent component for Tab navigation
	 */
	export function startEditing() {
		enterEditMode();
	}

	// Context menu event handlers
	function handleContextMenuClose() {
		contextMenuVisible = false;
	}

	function handleEditThisMonth() {
		contextMenuVisible = false;
		enterEditMode();
	}

	function handleSetFutureMonths(event: CustomEvent<{ amountCents: number }>) {
		contextMenuVisible = false;
		dispatch('setFutureMonths', {
			categoryId,
			month,
			amountCents: event.detail.amountCents
		});
	}

	function handleIncreaseFutureMonths(event: CustomEvent<{ percentage: number }>) {
		contextMenuVisible = false;
		dispatch('increaseFutureMonths', {
			categoryId,
			month,
			percentage: event.detail.percentage
		});
	}

	// Tooltip state
	let tooltipVisible = false;
	let cellElement: HTMLElement | null = null;
	let isTooltipHovered = false;
	let cellRef: HTMLElement | null = null;

	function showTooltip(element: HTMLElement) {
		// Don't show tooltip while editing or context menu is open
		if (isEditing || contextMenuVisible) return;
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
	bind:this={cellRef}
	class="budget-cell {statusClass}"
	class:current-month={isCurrent}
	class:expanded={isExpanded}
	class:editing={isEditing}
	role="cell"
	tabindex={isEditing ? -1 : 0}
	data-testid="budget-cell"
	data-month={month}
	on:click={handleClick}
	on:dblclick={handleDoubleClick}
	on:contextmenu={handleContextMenu}
	on:keydown={handleKeydown}
	use:tooltip={{ onShow: showTooltip, onHide: hideTooltip, showDelay: 200, hideDelay: 200 }}
>
	{#if isEditing}
		<CellInput
			valueCents={budgetedCents}
			bind:hasError={hasInputError}
			on:save={handleSave}
			on:cancel={handleCancel}
			on:navigate={handleNavigate}
		/>
	{:else}
		<span class="cell-actual" data-testid="cell-actual">
			{formatCentsCurrency(actualCents)}
		</span>
		<span class="cell-budgeted" data-testid="cell-budgeted">
			{formatCentsCurrency(budgetedCents)}
		</span>
	{/if}
</div>

{#if !isEditing}
	<Tooltip visible={tooltipVisible} targetElement={cellElement}>
		<div
			on:mouseenter={handleTooltipMouseEnter}
			on:mouseleave={handleTooltipMouseLeave}
			role="presentation"
		>
			<BudgetCellTooltip {actualCents} budgetCents={budgetedCents} {categoryId} {month} />
		</div>
	</Tooltip>
{/if}

<BudgetCellContextMenu
	visible={contextMenuVisible}
	x={contextMenuX}
	y={contextMenuY}
	currentBudgetCents={budgetedCents}
	on:close={handleContextMenuClose}
	on:editThisMonth={handleEditThisMonth}
	on:setFutureMonths={handleSetFutureMonths}
	on:increaseFutureMonths={handleIncreaseFutureMonths}
/>

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

	.budget-cell.editing {
		padding: 4px;
		align-items: stretch;
		cursor: default;
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
