<script lang="ts">
	import type { MonthString } from '$lib/types/budget';
	import type { CategorySection, SectionTotals } from '$lib/utils/categoryGroups';
	import { getSectionStatusClass } from '$lib/utils/categoryGroups';
	import { formatCentsCurrency } from '$lib/types/budget';
	import { budgetUIStore } from '$lib/stores/budgetUI';
	import { get } from 'svelte/store';

	export let section: CategorySection;
	export let months: MonthString[];
	export let currentMonth: MonthString;
	export let totals: Map<MonthString, SectionTotals>;
	export let isCollapsed: boolean;

	/**
	 * Toggle the section collapsed state
	 */
	function toggleCollapse() {
		budgetUIStore.toggleSection(section.id);
	}

	/**
	 * Handle keyboard navigation
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleCollapse();
		}
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
			<div
				class="section-cell {statusClass}"
				class:current-month={month === currentMonth}
				role="cell"
				data-month={month}
			>
				<span class="cell-budgeted">
					{formatCentsCurrency(monthTotals.budgetedCents)}
				</span>
				<span class="cell-actual">
					{formatCentsCurrency(monthTotals.actualCents)}
				</span>
			</div>
		{/each}
	</div>
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
	}

	.section-cell.current-month {
		background: var(--bg-highlight, #eff6ff);
	}

	.cell-budgeted {
		font-size: 0.875rem;
		font-weight: 600;
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
