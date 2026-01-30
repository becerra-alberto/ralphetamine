<script lang="ts">
	import {
		budgetStore,
		yearGroups,
		currentMonth,
		isEmpty,
		monthlyTotals,
		createCellKey,
		hasUncategorized,
		uncategorizedTotals,
		uncategorizedCount
	} from '$lib/stores/budget';
	import { budgetUIStore } from '$lib/stores/budgetUI';
	import {
		groupCategoriesBySections,
		calculateAllSectionTotals,
		type CategorySection
	} from '$lib/utils/categoryGroups';
	import {
		getTrailing12MRange,
		calculate12MTotals,
		calculateSection12MTotals,
		calculateGrand12MTotals,
		calculateUncategorized12MTotals
	} from '$lib/utils/budgetCalculations';
	import { getTransactions } from '$lib/api/transactions';
	import { setBudget, setFutureMonthsBudget, increaseFutureMonthsBudget } from '$lib/api/budgets';
	import { toastStore } from '$lib/stores/toast';
	import type { MiniTransaction } from './TransactionMiniList.svelte';
	import MonthHeader from './MonthHeader.svelte';
	import YearHeader from './YearHeader.svelte';
	import CategoryRow from './CategoryRow.svelte';
	import SectionHeader from './SectionHeader.svelte';
	import TotalsColumn from './TotalsColumn.svelte';
	import UncategorizedRow from './UncategorizedRow.svelte';
	import CellExpansion from './CellExpansion.svelte';
	import { formatCentsCurrency } from '$lib/types/budget';
	import type { BudgetCell, UncategorizedData } from '$lib/stores/budget';
	import type { MonthString } from '$lib/types/budget';

	// Cell expansion state
	let expandedCellKey: string | null = null;
	let expansionTransactions: MiniTransaction[] = [];
	let expansionTotalCount: number = 0;
	let isExpansionLoading: boolean = false;

	// Section expansion state
	let expandedSectionKey: string | null = null; // "sectionId:month"
	let sectionExpansionTransactions: MiniTransaction[] = [];
	let sectionExpansionTotalCount: number = 0;
	let isSectionExpansionLoading: boolean = false;
	let expandedSectionName: string = '';

	// Row refs for Tab navigation - keyed by category ID
	let rowRefs: Record<string, CategoryRow> = {};
	// Pending edit state for Tab navigation
	let pendingEdit: { categoryId: string; month: MonthString } | null = null;

	/**
	 * Create a unique key for cell expansion
	 */
	function getExpansionCellKey(categoryId: string, month: MonthString): string {
		return `${categoryId}:${month}`;
	}

	/**
	 * Handle cell expand event
	 */
	async function handleCellExpand(event: CustomEvent<{ categoryId: string; month: MonthString }>) {
		const { categoryId, month } = event.detail;
		const newKey = getExpansionCellKey(categoryId, month);

		// If clicking the same cell, close it
		if (expandedCellKey === newKey) {
			closeExpansion();
			return;
		}

		// Close any section expansion
		closeSectionExpansion();

		// Set loading state and new key
		expandedCellKey = newKey;
		isExpansionLoading = true;
		expansionTransactions = [];
		expansionTotalCount = 0;

		try {
			// Fetch transactions for this category and month
			const startDate = `${month}-01`;
			const [year, m] = month.split('-').map(Number);
			const lastDay = new Date(year, m, 0).getDate();
			const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

			const transactions = await getTransactions({
				categoryId,
				startDate,
				endDate
			});

			// Store total count before slicing
			expansionTotalCount = transactions.length;

			// Map to MiniTransaction format
			expansionTransactions = transactions.map((t) => ({
				id: t.id,
				date: t.date,
				payee: t.payee,
				amountCents: t.amountCents
			}));
		} catch (error) {
			console.error('Failed to fetch transactions for cell expansion:', error);
			expansionTransactions = [];
			expansionTotalCount = 0;
		} finally {
			isExpansionLoading = false;
		}
	}

	/**
	 * Close the expansion panel
	 */
	function closeExpansion() {
		expandedCellKey = null;
		expansionTransactions = [];
		expansionTotalCount = 0;
		isExpansionLoading = false;
	}

	/**
	 * Handle section cell expand event
	 * Fetches transactions for all categories in the section for the given month
	 */
	async function handleSectionCellExpand(event: CustomEvent<{ categoryIds: string[]; month: MonthString; sectionName: string }>) {
		const { categoryIds, month, sectionName } = event.detail;

		// Find the section by matching children
		const section = sections.find((s) =>
			s.children.length > 0 && s.children.some((c) => categoryIds.includes(c.id))
		);
		const sectionId = section?.id ?? sectionName;
		const newKey = `${sectionId}:${month}`;

		// If clicking the same section cell, close it
		if (expandedSectionKey === newKey) {
			closeSectionExpansion();
			return;
		}

		// Close any existing cell expansion
		closeExpansion();

		// Set loading state
		expandedSectionKey = newKey;
		expandedSectionName = sectionName;
		isSectionExpansionLoading = true;
		sectionExpansionTransactions = [];
		sectionExpansionTotalCount = 0;

		try {
			const startDate = `${month}-01`;
			const [year, m] = month.split('-').map(Number);
			const lastDay = new Date(year, m, 0).getDate();
			const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

			const transactions = await getTransactions({
				categoryIds,
				startDate,
				endDate
			});

			sectionExpansionTotalCount = transactions.length;
			sectionExpansionTransactions = transactions.map((t) => ({
				id: t.id,
				date: t.date,
				payee: t.payee,
				amountCents: t.amountCents
			}));
		} catch (error) {
			console.error('Failed to fetch transactions for section expansion:', error);
			sectionExpansionTransactions = [];
			sectionExpansionTotalCount = 0;
		} finally {
			isSectionExpansionLoading = false;
		}
	}

	/**
	 * Close the section expansion panel
	 */
	function closeSectionExpansion() {
		expandedSectionKey = null;
		sectionExpansionTransactions = [];
		sectionExpansionTotalCount = 0;
		isSectionExpansionLoading = false;
		expandedSectionName = '';
	}

	/**
	 * Get the month from a section expansion key
	 */
	function getSectionExpansionMonth(key: string | null): MonthString | null {
		if (!key) return null;
		const parts = key.split(':');
		return parts[parts.length - 1] as MonthString;
	}

	/**
	 * Handle click outside expansion to close it
	 */
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		// Don't close if clicking inside the expansion panel or on a budget cell or section cell
		if (
			target.closest('[data-testid="cell-expansion"]') ||
			target.closest('[data-testid="budget-cell"]') ||
			target.closest('[data-testid="section-cell"]')
		) {
			return;
		}
		if (expandedCellKey) {
			closeExpansion();
		}
		if (expandedSectionKey) {
			closeSectionExpansion();
		}
	}

	/**
	 * Handle budget change from inline editing
	 * Persists the change to the database and updates the store
	 */
	async function handleBudgetChange(event: CustomEvent<{ categoryId: string; month: MonthString; amountCents: number }>) {
		const { categoryId, month, amountCents } = event.detail;

		try {
			// Save to database
			const savedBudget = await setBudget({
				categoryId,
				month,
				amountCents
			});

			// Update the store with the new budget
			budgetStore.updateBudget(categoryId, month, savedBudget);
		} catch (error) {
			console.error('Failed to save budget:', error);
			// Could show an error toast here
		}
	}

	// Get reactive values from stores
	$: months = $budgetStore.months;
	$: isLoading = $budgetStore.isLoading;
	$: error = $budgetStore.error;
	$: years = $yearGroups;
	$: totals = $monthlyTotals;
	$: current = $currentMonth;
	$: empty = $isEmpty;
	$: collapsedSections = $budgetUIStore.collapsedSections;
	$: showUncategorized = $hasUncategorized;
	$: uncategorizedData = $uncategorizedTotals;
	$: totalUncategorizedCount = $uncategorizedCount;

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
	 * Takes collapsed set as parameter to ensure Svelte reactivity
	 */
	function isSectionExpanded(section: CategorySection, collapsed: Set<string>): boolean {
		return !collapsed.has(section.id);
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

	// Calculate trailing 12M range from the end of the visible months
	$: trailing12MMonths = months.length > 0 ? getTrailing12MRange(months[months.length - 1]) : [];

	// Extended cells map that includes trailing 12M months (may extend beyond visible)
	$: extended12MCellsMap = createExtended12MCellsMap($budgetStore.budgets, $budgetStore.actuals, trailing12MMonths);

	/**
	 * Create an extended cells map for 12M calculations
	 * This includes months that might be outside the visible range
	 */
	function createExtended12MCellsMap(
		budgets: Map<string, { amountCents: number }>,
		actuals: Map<string, number>,
		trailing12M: MonthString[]
	): Map<string, BudgetCell> {
		const map = new Map<string, BudgetCell>();
		const allCategories = $budgetStore.categories;

		allCategories.forEach((category) => {
			trailing12M.forEach((month) => {
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
	 * Get 12M totals for a category
	 */
	function getCategory12MTotals(categoryId: string) {
		return calculate12MTotals(categoryId, trailing12MMonths, extended12MCellsMap);
	}

	/**
	 * Get 12M totals for a section
	 */
	function getSection12MTotals(section: CategorySection) {
		const categoryIds = section.children.map((c) => c.id);
		return calculateSection12MTotals(categoryIds, trailing12MMonths, extended12MCellsMap);
	}

	/**
	 * Get grand 12M totals (all categories)
	 */
	$: grand12MTotals = calculateGrand12MTotals(
		$budgetStore.categories.map((c) => c.id),
		trailing12MMonths,
		extended12MCellsMap
	);

	/**
	 * Get uncategorized 12M totals
	 */
	$: uncategorized12MTotals = calculateUncategorized12MTotals(trailing12MMonths, uncategorizedData);

	/**
	 * Convert uncategorized data to monthly totals format for UncategorizedRow
	 */
	function getUncategorizedMonthlyTotals(): Map<MonthString, { totalCents: number; transactionCount: number }> {
		const result = new Map<MonthString, { totalCents: number; transactionCount: number }>();
		uncategorizedData.forEach((data, month) => {
			result.set(month, { totalCents: data.totalCents, transactionCount: data.transactionCount });
		});
		return result;
	}

	$: uncategorizedMonthlyTotals = getUncategorizedMonthlyTotals();

	// Build flat list of navigable categories (respects collapsed sections)
	$: navigableCategories = buildNavigableCategoryList(sections, hasSections, $budgetStore.categories, collapsedSections);

	/**
	 * Build a flat list of category IDs in display order, skipping collapsed sections
	 */
	function buildNavigableCategoryList(
		sectionList: CategorySection[],
		useSections: boolean,
		allCategories: typeof $budgetStore.categories,
		collapsed: Set<string>
	): string[] {
		if (!useSections) {
			return allCategories.map((c) => c.id);
		}

		const result: string[] = [];
		for (const section of sectionList) {
			if (!collapsed.has(section.id)) {
				for (const child of section.children) {
					result.push(child.id);
				}
			}
		}
		return result;
	}

	/**
	 * Handle Tab/Shift+Tab navigation from a cell
	 * Calculates the next cell position and triggers editing on that cell
	 */
	function handleCellNavigate(event: CustomEvent<{ categoryId: string; month: MonthString; direction: 'next' | 'prev'; monthIndex: number; rowIndex: number }>) {
		const { categoryId, month, direction, monthIndex } = event.detail;

		// Find current category index in the navigable list
		const categoryIndex = navigableCategories.indexOf(categoryId);
		if (categoryIndex === -1) return;

		let nextCategoryIndex = categoryIndex;
		let nextMonthIndex = monthIndex;

		if (direction === 'next') {
			// Tab: move to next month
			nextMonthIndex = monthIndex + 1;

			// If past last month, wrap to first month of next category
			if (nextMonthIndex >= months.length) {
				nextMonthIndex = 0;
				nextCategoryIndex = categoryIndex + 1;

				// If past last category, wrap to first category
				if (nextCategoryIndex >= navigableCategories.length) {
					nextCategoryIndex = 0;
				}
			}
		} else {
			// Shift+Tab: move to previous month
			nextMonthIndex = monthIndex - 1;

			// If before first month, wrap to last month of previous category
			if (nextMonthIndex < 0) {
				nextMonthIndex = months.length - 1;
				nextCategoryIndex = categoryIndex - 1;

				// If before first category, wrap to last category
				if (nextCategoryIndex < 0) {
					nextCategoryIndex = navigableCategories.length - 1;
				}
			}
		}

		// Get the target category and month
		const targetCategoryId = navigableCategories[nextCategoryIndex];
		const targetMonth = months[nextMonthIndex];

		// Trigger editing on the target cell via CategoryRow
		const targetRow = rowRefs[targetCategoryId];
		if (targetRow) {
			targetRow.startEditingMonth(targetMonth);
		}
	}

	/**
	 * Helper to calculate future months from a starting month
	 */
	function getFutureMonths(startMonth: MonthString, count: number): MonthString[] {
		const result: MonthString[] = [];
		let currentMonth = startMonth;

		for (let i = 0; i < count; i++) {
			result.push(currentMonth);
			const [year, m] = currentMonth.split('-').map(Number);
			if (m === 12) {
				currentMonth = `${year + 1}-01`;
			} else {
				currentMonth = `${year}-${String(m + 1).padStart(2, '0')}`;
			}
		}

		return result;
	}

	/**
	 * Handle "Set for all future months" from context menu
	 */
	async function handleSetFutureMonths(event: CustomEvent<{ categoryId: string; month: MonthString; amountCents: number }>) {
		const { categoryId, month, amountCents } = event.detail;

		try {
			const updatedCount = await setFutureMonthsBudget(categoryId, month, amountCents, 12);
			toastStore.success(`Updated ${updatedCount} months`);

			// Optimistically update the budget store with new values
			const futureMonths = getFutureMonths(month, 12);
			const now = new Date().toISOString();
			futureMonths.forEach((m) => {
				budgetStore.updateBudget(categoryId, m, {
					categoryId,
					month: m,
					amountCents,
					note: null,
					createdAt: now,
					updatedAt: now
				});
			});
		} catch (error) {
			console.error('Failed to set future months:', error);
			toastStore.error('Failed to update budgets');
		}
	}

	/**
	 * Handle "Increase future months by %" from context menu
	 */
	async function handleIncreaseFutureMonths(event: CustomEvent<{ categoryId: string; month: MonthString; percentage: number }>) {
		const { categoryId, month, percentage } = event.detail;

		// Get the current budget value for this cell
		const cellKey = createCellKey(categoryId, month);
		const cell = cellsMap.get(cellKey);
		const baseCents = cell?.budgetedCents ?? 0;

		if (baseCents === 0) {
			toastStore.warning('Cannot increase: current budget is €0.00');
			return;
		}

		// Calculate new amount
		const increaseCents = Math.round((baseCents * percentage) / 100);
		const newAmountCents = baseCents + increaseCents;

		try {
			const updatedCount = await increaseFutureMonthsBudget(categoryId, month, baseCents, percentage, 12);
			toastStore.success(`Increased ${updatedCount} months by ${percentage}%`);

			// Optimistically update the budget store with new values
			const futureMonths = getFutureMonths(month, 12);
			const now = new Date().toISOString();
			futureMonths.forEach((m) => {
				budgetStore.updateBudget(categoryId, m, {
					categoryId,
					month: m,
					amountCents: newAmountCents,
					note: null,
					createdAt: now,
					updatedAt: now
				});
			});
		} catch (error) {
			console.error('Failed to increase future months:', error);
			toastStore.error('Failed to update budgets');
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

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

				<!-- 12M header spacer -->
				<div class="totals-header-spacer"></div>
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
				<!-- 12M totals header -->
				<TotalsColumn
					totals={{ actualCents: 0, budgetedCents: 0, differenceCents: 0, percentUsed: 0 }}
					isHeader={true}
				/>
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
						{@const isExpanded = isSectionExpanded(section, collapsedSections)}
						{@const sectionTotals = getSectionTotals(section)}
						{@const section12MTotals = getSection12MTotals(section)}

						<SectionHeader
							{section}
							{months}
							currentMonth={current}
							totals={sectionTotals}
							totals12M={section12MTotals}
							isCollapsed={!isExpanded}
							on:sectionExpand={handleSectionCellExpand}
						/>

						{#if expandedSectionKey && expandedSectionKey.startsWith(section.id + ':')}
							{@const sectionMonth = getSectionExpansionMonth(expandedSectionKey)}
							{#if sectionMonth}
								<CellExpansion
									categoryId={section.id}
									categoryName="{expandedSectionName} (all categories)"
									month={sectionMonth}
									transactions={sectionExpansionTransactions}
									totalCount={sectionExpansionTotalCount}
									isLoading={isSectionExpansionLoading}
									on:close={closeSectionExpansion}
								/>
							{/if}
						{/if}

						{#if isExpanded}
							<div
								class="section-content"
								id="section-{section.id}-content"
								data-testid="section-content"
								data-section-id={section.id}
							>
								{#each section.children as childCategory, rowIdx (childCategory.id)}
									{@const category12MTotals = getCategory12MTotals(childCategory.id)}
									<CategoryRow
										bind:this={rowRefs[childCategory.id]}
										category={childCategory}
										cells={getCategoryCells(childCategory.id)}
										{months}
										currentMonth={current}
										totals12M={category12MTotals}
										rowIndex={rowIdx}
										{expandedCellKey}
										{expansionTransactions}
										{expansionTotalCount}
										{isExpansionLoading}
										on:expand={handleCellExpand}
										on:closeExpansion={closeExpansion}
										on:budgetChange={handleBudgetChange}
										on:navigate={handleCellNavigate}
										on:setFutureMonths={handleSetFutureMonths}
										on:increaseFutureMonths={handleIncreaseFutureMonths}
									/>
								{/each}
							</div>
						{/if}
					{/each}
				{:else}
					<!-- Fallback: render flat category list when no sections exist -->
					{#each $budgetStore.categories as category, rowIdx (category.id)}
						{@const category12MTotals = getCategory12MTotals(category.id)}
						<CategoryRow
							bind:this={rowRefs[category.id]}
							{category}
							cells={getCategoryCells(category.id)}
							{months}
							currentMonth={current}
							totals12M={category12MTotals}
							rowIndex={rowIdx}
							{expandedCellKey}
							{expansionTransactions}
							{expansionTotalCount}
							{isExpansionLoading}
							on:expand={handleCellExpand}
							on:closeExpansion={closeExpansion}
							on:budgetChange={handleBudgetChange}
							on:navigate={handleCellNavigate}
							on:setFutureMonths={handleSetFutureMonths}
							on:increaseFutureMonths={handleIncreaseFutureMonths}
						/>
					{/each}
				{/if}

				<!-- Uncategorized transactions row (shown at bottom when there are uncategorized transactions) -->
				{#if showUncategorized}
					<UncategorizedRow
						{months}
						currentMonth={current}
						monthlyTotals={uncategorizedMonthlyTotals}
						totalTransactionCount={totalUncategorizedCount}
						totals12M={uncategorized12MTotals}
					/>
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
					<!-- 12M grand total -->
					<TotalsColumn
						totals={grand12MTotals}
						isGrandTotal={true}
					/>
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

	.totals-header-spacer {
		min-width: 140px;
		width: 140px;
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		border-left: 2px solid var(--color-accent, #4f46e5);
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
