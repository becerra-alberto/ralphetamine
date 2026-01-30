<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MonthString } from '$lib/types/budget';
	import type { CategorySection, SectionTotals } from '$lib/utils/categoryGroups';
	import type { Trailing12MTotals } from '$lib/utils/budgetCalculations';
	import { getSectionStatusClass } from '$lib/utils/categoryGroups';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import { budgetUIStore } from '$lib/stores/budgetUI';
	import { tooltip } from '$lib/actions/tooltip';
	import Tooltip from '$lib/components/shared/Tooltip.svelte';
	import TotalsColumn from './TotalsColumn.svelte';

	export let section: CategorySection;
	export let months: MonthString[];
	export let currentMonth: MonthString;
	export let totals: Map<MonthString, SectionTotals>;
	export let totals12M: Trailing12MTotals | undefined = undefined;
	export let isCollapsed: boolean;

	const dispatch = createEventDispatcher<{
		sectionExpand: { categoryIds: string[]; month: MonthString; sectionName: string };
	}>();

	// Tooltip state per cell
	let tooltipVisible: Record<string, boolean> = {};
	let tooltipTargetElements: Record<string, HTMLElement | null> = {};

	/**
	 * Toggle the section collapsed state
	 */
	function toggleCollapse() {
		budgetUIStore.toggleSection(section.id);
	}

	/**
	 * Handle keyboard navigation on section name
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleCollapse();
		}
	}

	/**
	 * Handle click on a section cell to expand inline transactions
	 */
	function handleCellClick(month: MonthString) {
		const categoryIds = section.children.map((c) => c.id);
		dispatch('sectionExpand', {
			categoryIds,
			month,
			sectionName: section.name
		});
	}

	/**
	 * Handle keyboard on a section cell
	 */
	function handleCellKeydown(event: KeyboardEvent, month: MonthString) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleCellClick(month);
		}
	}

	/**
	 * Show tooltip for a section cell
	 */
	function showTooltip(month: string, element: HTMLElement) {
		tooltipTargetElements[month] = element;
		tooltipVisible = { ...tooltipVisible, [month]: true };
	}

	/**
	 * Hide tooltip for a section cell
	 */
	function hideTooltip(month: string) {
		tooltipVisible = { ...tooltipVisible, [month]: false };
	}
</script>

<div
	class="section-header"
	class:collapsed={isCollapsed}
	role="row"
	data-testid="section-header"
	data-section-id={section.id}
>
	<!-- Section name cell (sticky) -->
	<button
		type="button"
		class="section-name"
		role="rowheader"
		aria-expanded={!isCollapsed}
		aria-controls="section-{section.id}-content"
		on:click={toggleCollapse}
		on:keydown={handleKeydown}
	>
		<span class="collapse-indicator" aria-hidden="true">
			{isCollapsed ? '▶' : '▼'}
		</span>
		<span class="section-title">{section.name}</span>
	</button>

	<!-- Section totals for each month -->
	<div class="section-cells">
		{#each months as month (month)}
			{@const monthTotals = totals.get(month) || { budgetedCents: 0, actualCents: 0, remainingCents: 0 }}
			{@const statusClass = getSectionStatusClass(monthTotals)}
			{@const diffCents = monthTotals.budgetedCents - Math.abs(monthTotals.actualCents)}
			<div
				class="section-cell {statusClass}"
				class:current-month={month === currentMonth}
				role="cell"
				tabindex="0"
				data-testid="section-cell"
				data-month={month}
				on:click={() => handleCellClick(month)}
				on:keydown={(e) => handleCellKeydown(e, month)}
				use:tooltip={{
					onShow: (el) => showTooltip(month, el),
					onHide: () => hideTooltip(month),
					showDelay: 200,
					hideDelay: 200
				}}
			>
				<span class="cell-actual">
					{formatCentsCurrency(monthTotals.actualCents)}
				</span>
				<span class="cell-budgeted">
					{formatCentsCurrency(monthTotals.budgetedCents)}
				</span>
			</div>

			<Tooltip visible={tooltipVisible[month] || false} targetElement={tooltipTargetElements[month] || null}>
				<div class="section-tooltip" data-testid="section-cell-tooltip" role="presentation">
					<div class="tooltip-title">{section.name} — {month}</div>
					<div class="tooltip-row">
						<span class="tooltip-label">Actual:</span>
						<span class="tooltip-value">{formatCentsCurrency(monthTotals.actualCents)}</span>
					</div>
					<div class="tooltip-row">
						<span class="tooltip-label">Budget:</span>
						<span class="tooltip-value">{formatCentsCurrency(monthTotals.budgetedCents)}</span>
					</div>
					<div class="tooltip-row">
						<span class="tooltip-label">Difference:</span>
						{#if diffCents > 0}
							<span class="tooltip-value difference-positive">
								+{formatCentsCurrency(diffCents)} remaining
							</span>
						{:else if diffCents < 0}
							<span class="tooltip-value difference-negative">
								{formatCentsCurrency(diffCents)} over
							</span>
						{:else}
							<span class="tooltip-value difference-neutral">
								On budget
							</span>
						{/if}
					</div>
				</div>
			</Tooltip>
		{/each}
	</div>

	<!-- 12M totals column for section -->
	{#if totals12M}
		<TotalsColumn totals={totals12M} isSectionHeader={true} />
	{/if}
</div>

<style>
	.section-header {
		display: flex;
		min-height: 48px;
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.section-name {
		min-width: 200px;
		width: 200px;
		padding: 12px;
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--bg-secondary, #f9fafb);
		border: none;
		border-right: 1px solid var(--border-color, #e5e7eb);
		position: sticky;
		left: 0;
		z-index: 10;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
	}

	.section-name:hover {
		background: var(--bg-tertiary, #f3f4f6);
	}

	.section-name:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: -2px;
	}

	.collapse-indicator {
		font-size: 0.625rem;
		color: var(--text-secondary, #6b7280);
		transition: transform 200ms ease-in-out;
	}

	.collapsed .collapse-indicator {
		color: var(--text-tertiary, #9ca3af);
	}

	.section-title {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-cells {
		display: flex;
		flex: 1;
	}

	.section-cell {
		min-width: 120px;
		width: 120px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		border-right: 1px solid var(--border-color, #e5e7eb);
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.section-cell:hover {
		background: var(--bg-tertiary, #f3f4f6);
	}

	.section-cell:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: -2px;
	}

	.section-cell.current-month {
		background: var(--bg-highlight, #eff6ff);
	}

	.cell-actual {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.cell-budgeted {
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

	/* Tooltip styles */
	.section-tooltip {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tooltip-title {
		font-weight: 600;
		font-size: 0.8125rem;
		margin-bottom: 4px;
		color: var(--text-tooltip-primary, #f9fafb);
	}

	.tooltip-row {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.tooltip-label {
		color: var(--text-tooltip-secondary, #9ca3af);
	}

	.tooltip-value {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.difference-positive {
		color: var(--color-success, #10b981);
	}

	.difference-negative {
		color: var(--color-danger, #ef4444);
	}

	.difference-neutral {
		color: var(--text-tooltip-secondary, #9ca3af);
	}

	/* Dark mode */
	:global(.dark) .section-header {
		--bg-secondary: #1a1a1a;
		--bg-tertiary: #262626;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--text-tertiary: #6b7280;
		--bg-highlight: #1e3a5f;
	}
</style>
