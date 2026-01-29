<script lang="ts">
	import {
		budgetStore,
		yearGroups,
		currentMonth,
		isEmpty,
		monthlyTotals,
		createCellKey
	} from '$lib/stores/budget';
	import { budgetUIStore } from '$lib/stores/budgetUI';
	import {
		groupCategoriesBySections,
		calculateAllSectionTotals,
		type CategorySection
	} from '$lib/utils/categoryGroups';
	import MonthHeader from './MonthHeader.svelte';
	import YearHeader from './YearHeader.svelte';
	import CategoryRow from './CategoryRow.svelte';
	import SectionHeader from './SectionHeader.svelte';
	import { formatCentsCurrency } from '$lib/types/budget';
	import type { BudgetCell } from '$lib/stores/budget';
	import type { MonthString } from '$lib/types/budget';

	// Get reactive values from stores
	$: months = $budgetStore.months;
	$: isLoading = $budgetStore.isLoading;
	$: error = $budgetStore.error;
	$: years = $yearGroups;
	$: totals = $monthlyTotals;
	$: current = $currentMonth;
	$: empty = $isEmpty;
	$: collapsedSections = $budgetUIStore.collapsedSections;

	// Group categories into sections
	$: sections = groupCategoriesBySections($budgetStore.categories);

	// Check if we have sections (categories with parentId=null matching section names)
	$: hasSections = sections.length > 0;

	// Create a Map of cells for efficient lookup
	$: cellsMap = createCellsMap($budgetStore.budgets, $budgetStore.actuals, months);

	/**
	 * Create a Map of BudgetCell for efficient lookup
	 */
	function createCellsMap(
		budgets: Map<string, { amountCents: number }>,
		actuals: Map<string, number>,
		monthList: MonthString[]
	): Map<string, BudgetCell> {
		const map = new Map<string, BudgetCell>();
		const allCategories = $budgetStore.categories;

		allCategories.forEach((category) => {
			monthList.forEach((month) => {
				const key = createCellKey(category.id, month);
				const budget = budgets.get(key);
				const actualCents = actuals.get(key) ?? 0;
				const budgetedCents = budget?.amountCents ?? 0;

				map.set(key, {
					categoryId: category.id,
					month,
					budgetedCents,
					actualCents,
					remainingCents: budgetedCents - Math.abs(actualCents)
				});
			});
		});

		return map;
	}

	/**
	 * Check if a section is expanded
	 */
	function isSectionExpanded(section: CategorySection): boolean {
		return !collapsedSections.has(section.id);
	}

	/**
	 * Get cells for a category
	 */
	function getCategoryCells(categoryId: string): Map<MonthString, BudgetCell> {
		const cells = new Map<MonthString, BudgetCell>();
		months.forEach((month) => {
			const key = createCellKey(categoryId, month);
			const cell = cellsMap.get(key);
			if (cell) {
				cells.set(month, cell);
			}
		});
		return cells;
	}

	/**
	 * Get section totals for all months
	 */
	function getSectionTotals(section: CategorySection) {
		return calculateAllSectionTotals(section, months, cellsMap);
	}
</script>

<div class="budget-grid-container" role="region" aria-label="Budget Grid">
	{#if isLoading}
		<div class="loading-state">
			<span>Loading budget data...</span>
		</div>
	{:else if error}
		<div class="error-state" role="alert">
			<span>{error}</span>
		</div>
	{:else}
		<div class="budget-grid" role="table" aria-label="Budget spreadsheet">
			<!-- Header section with year and month headers -->
			<div class="grid-header">
				<!-- Empty corner cell for category column -->
				<div class="corner-cell" role="columnheader" aria-label="Categories">
					Category
				</div>

				<!-- Year headers spanning their months -->
				<div class="year-headers">
					{#each years as yearGroup (yearGroup.year)}
						<YearHeader
							year={yearGroup.year}
							monthCount={yearGroup.months.length}
						/>
					{/each}
				</div>
			</div>

			<!-- Month headers row -->
			<div class="month-headers-row">
				<div class="category-column-header"></div>
				<div class="month-headers">
					{#each months as month (month)}
						<MonthHeader
							{month}
							isCurrent={month === current}
						/>
					{/each}
				</div>
			</div>

			<!-- Data rows -->
			<div class="grid-body">
				{#if empty}
					<div class="empty-state">
						<div class="empty-state-content">
							<p>No budget categories yet.</p>
							<p class="empty-state-hint">Add your first budget category to get started.</p>
						</div>
					</div>
				{:else if hasSections}
					<!-- Render sections with collapsible children -->
					{#each sections as section (section.id)}
						{@const isExpanded = isSectionExpanded(section)}
						{@const sectionTotals = getSectionTotals(section)}

						<SectionHeader
							{section}
							{months}
							currentMonth={current}
							totals={sectionTotals}
							isCollapsed={!isExpanded}
						/>

						{#if isExpanded}
							<div
								class="section-content"
								id="section-{section.id}-content"
								data-testid="section-content"
								data-section-id={section.id}
							>
								{#each section.children as childCategory (childCategory.id)}
									<CategoryRow
										category={childCategory}
										cells={getCategoryCells(childCategory.id)}
										{months}
										currentMonth={current}
									/>
								{/each}
							</div>
						{/if}
					{/each}
				{:else}
					<!-- Fallback: render flat category list when no sections exist -->
					{#each $budgetStore.categories as category (category.id)}
						<CategoryRow
							{category}
							cells={getCategoryCells(category.id)}
							{months}
							currentMonth={current}
						/>
					{/each}
				{/if}
			</div>

			<!-- Footer totals row -->
			{#if !empty}
				<div class="grid-footer">
					<div class="total-label" role="rowheader">
						Total
					</div>
					<div class="total-cells">
						{#each months as month (month)}
							{@const monthTotal = totals.get(month)}
							<div
								class="total-cell"
								class:current-month={month === current}
								role="cell"
							>
								<span class="total-actual">
									{formatCentsCurrency(monthTotal?.actual ?? 0)}
								</span>
								<span class="total-budgeted">
									{formatCentsCurrency(monthTotal?.budgeted ?? 0)}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.budget-grid-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.loading-state,
	.error-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-secondary, #6b7280);
	}

	.error-state {
		color: var(--color-danger, #ef4444);
	}

	.budget-grid {
		display: flex;
		flex-direction: column;
		overflow: auto;
		font-family: var(--font-family, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
		font-variant-numeric: tabular-nums;
	}

	.grid-header {
		display: flex;
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--bg-primary, #ffffff);
	}

	.corner-cell {
		min-width: 200px;
		width: 200px;
		padding: 12px;
		font-weight: 600;
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		border-right: 1px solid var(--border-color, #e5e7eb);
		position: sticky;
		left: 0;
		z-index: 30;
	}

	.year-headers {
		display: flex;
		flex: 1;
	}

	.month-headers-row {
		display: flex;
		position: sticky;
		top: 44px;
		z-index: 20;
		background: var(--bg-primary, #ffffff);
	}

	.category-column-header {
		min-width: 200px;
		width: 200px;
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		border-right: 1px solid var(--border-color, #e5e7eb);
		position: sticky;
		left: 0;
		z-index: 30;
	}

	.month-headers {
		display: flex;
		flex: 1;
	}

	.grid-body {
		flex: 1;
	}

	.section-content {
		overflow: hidden;
		animation: expand 200ms ease-out;
	}

	@keyframes expand {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		color: var(--text-secondary, #6b7280);
		text-align: center;
	}

	.empty-state-content {
		padding: 24px;
	}

	.empty-state-hint {
		font-size: 0.875rem;
		margin-top: 8px;
		color: var(--text-tertiary, #9ca3af);
	}

	.grid-footer {
		display: flex;
		position: sticky;
		bottom: 0;
		background: var(--bg-secondary, #f9fafb);
		border-top: 2px solid var(--border-color, #e5e7eb);
		z-index: 10;
	}

	.total-label {
		min-width: 200px;
		width: 200px;
		padding: 12px;
		font-weight: 600;
		background: var(--bg-secondary, #f9fafb);
		border-right: 1px solid var(--border-color, #e5e7eb);
		position: sticky;
		left: 0;
		z-index: 20;
	}

	.total-cells {
		display: flex;
		flex: 1;
	}

	.total-cell {
		min-width: 120px;
		width: 120px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		border-right: 1px solid var(--border-color, #e5e7eb);
		font-weight: 600;
	}

	.total-cell.current-month {
		background: var(--bg-highlight, #eff6ff);
	}

	.total-actual {
		color: var(--text-primary, #111827);
	}

	.total-budgeted {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	/* Dark mode support */
	:global(.dark) .budget-grid-container {
		--bg-primary: #0f0f0f;
		--bg-secondary: #1a1a1a;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--text-tertiary: #6b7280;
		--bg-highlight: #1e3a5f;
	}
</style>
