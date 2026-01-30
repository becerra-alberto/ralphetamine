<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import Modal from '$lib/components/shared/Modal.svelte';
	import MonthPicker from '$lib/components/shared/MonthPicker.svelte';
	import AdjustmentPreview from './AdjustmentPreview.svelte';
	import type { PreviewItem } from '$lib/types/ui';
	import type { Category } from '$lib/types/category';
	import type { MonthString, BudgetInput } from '$lib/types/budget';
	import { getCurrentMonth, getNextMonth, getMonthRange } from '$lib/types/budget';
	import { groupCategoriesBySections, type CategorySection } from '$lib/utils/categoryGroups';
	import { budgetStore, createCellKey } from '$lib/stores/budget';
	import { setBudgetsBatch, getBudgetsForCategory } from '$lib/api/budgets';
	import { toastStore } from '$lib/stores/toast';
	import { get } from 'svelte/store';

	export let open: boolean = false;
	export let categories: Category[] = [];

	const dispatch = createEventDispatcher<{
		close: void;
		applied: { count: number };
	}>();

	// Operations
	type OperationType = 'set-amount' | 'increase-percent' | 'decrease-percent' | 'copy-previous';
	const operations: { id: OperationType; label: string }[] = [
		{ id: 'set-amount', label: 'Set amount' },
		{ id: 'increase-percent', label: 'Increase by %' },
		{ id: 'decrease-percent', label: 'Decrease by %' },
		{ id: 'copy-previous', label: 'Copy from previous period' }
	];

	// Date range presets
	const presets = [
		{ id: '3m', label: 'Next 3 months', months: 3 },
		{ id: '6m', label: 'Next 6 months', months: 6 },
		{ id: '12m', label: 'Next 12 months', months: 12 }
	];

	// State
	let selectedCategories: Set<string> = new Set();
	let selectedOperation: OperationType = 'set-amount';
	let amountValue: string = '';
	let percentValue: string = '';
	let startMonth: MonthString = getCurrentMonth();
	let endMonth: MonthString = '';
	let isCustomRange: boolean = false;
	let isLoading: boolean = false;
	let isCalculatingPreview: boolean = false;

	// Preview data
	let previewItems: PreviewItem[] = [];
	let totalAffected: number = 0;

	// Flatten the category tree into a flat list of all categories
	function flattenCategories(cats: Category[]): Category[] {
		const result: Category[] = [];
		for (const cat of cats) {
			result.push(cat);
			if ((cat as any).children && (cat as any).children.length > 0) {
				result.push(...flattenCategories((cat as any).children));
			}
		}
		return result;
	}

	// Computed
	$: flatCategories = flattenCategories(categories);
	$: sections = groupCategoriesBySections(flatCategories);
	$: selectableCategories = flatCategories.filter((c) => c.parentId !== null);

	// Maximum range: 24 months
	const MAX_MONTHS = 24;
	$: maxEndMonth = calculateMaxEndMonth(startMonth);

	function calculateMaxEndMonth(start: MonthString): MonthString {
		let result = start;
		for (let i = 0; i < MAX_MONTHS - 1; i++) {
			result = getNextMonth(result);
		}
		return result;
	}

	// Initialize end month
	onMount(() => {
		setPresetRange('3m');
	});

	function setPresetRange(presetId: string) {
		const preset = presets.find((p) => p.id === presetId);
		if (preset) {
			startMonth = getCurrentMonth();
			endMonth = startMonth;
			for (let i = 1; i < preset.months; i++) {
				endMonth = getNextMonth(endMonth);
			}
			isCustomRange = false;
		}
	}

	// Per-section selection state (all reactive via $:)
	$: allCategoriesSelected = selectableCategories.length > 0 && selectedCategories.size === selectableCategories.length;
	$: totalSelectedCount = selectedCategories.size;
	$: totalSelectableCount = selectableCategories.length;

	// Reactive per-section state map — recomputed when selectedCategories or sections change
	interface SectionState {
		selectedCount: number;
		totalCount: number;
		allSelected: boolean;
		indeterminate: boolean;
	}
	$: sectionStates = new Map<string, SectionState>(
		sections.map((section) => {
			const selectedCount = section.children.filter((c) => selectedCategories.has(c.id)).length;
			const totalCount = section.children.length;
			return [
				section.id,
				{
					selectedCount,
					totalCount,
					allSelected: totalCount > 0 && selectedCount === totalCount,
					indeterminate: selectedCount > 0 && selectedCount < totalCount
				}
			];
		})
	);

	function toggleCategory(categoryId: string) {
		const newSet = new Set(selectedCategories);
		if (newSet.has(categoryId)) {
			newSet.delete(categoryId);
		} else {
			newSet.add(categoryId);
		}
		selectedCategories = newSet;
	}

	function toggleAllCategories() {
		if (allCategoriesSelected) {
			selectedCategories = new Set();
		} else {
			selectedCategories = new Set(selectableCategories.map((c) => c.id));
		}
	}

	function toggleSection(section: CategorySection) {
		const newSet = new Set(selectedCategories);
		const state = sectionStates.get(section.id);
		const allSelected = state?.allSelected ?? false;
		for (const child of section.children) {
			if (allSelected) {
				newSet.delete(child.id);
			} else {
				newSet.add(child.id);
			}
		}
		selectedCategories = newSet;
	}

	// Svelte action to set the indeterminate DOM property (not settable via attribute)
	function indeterminate(node: HTMLInputElement, value: boolean) {
		node.indeterminate = value;
		return {
			update(newValue: boolean) {
				node.indeterminate = newValue;
			}
		};
	}

	function handleStartMonthChange() {
		// Ensure end month is not before start month
		if (endMonth < startMonth) {
			endMonth = startMonth;
		}
		// Ensure end month is within max range
		if (endMonth > maxEndMonth) {
			endMonth = maxEndMonth;
		}
		isCustomRange = true;
	}

	function handleEndMonthChange() {
		isCustomRange = true;
	}

	// Debounced preview: replace the synchronous reactive chain with debounced calculation.
	// This reactive statement reads form inputs and schedules a debounced preview update.
	// It does NOT write back to any form state, preventing the re-render cascade.
	let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	const PREVIEW_DEBOUNCE_MS = 300;

	$: {
		// Read all form dependencies to trigger on any change
		const _cats = selectedCategories.size;
		const _start = startMonth;
		const _end = endMonth;
		const _op = selectedOperation;
		const _amt = amountValue;
		const _pct = percentValue;

		// Clear any pending debounce
		if (previewDebounceTimer) {
			clearTimeout(previewDebounceTimer);
		}

		// Schedule debounced preview calculation
		previewDebounceTimer = setTimeout(() => {
			previewDebounceTimer = null;
			if (selectedCategories.size > 0 && startMonth && endMonth) {
				calculatePreview();
			} else {
				previewItems = [];
				totalAffected = 0;
			}
		}, PREVIEW_DEBOUNCE_MS);
	}

	onDestroy(() => {
		if (previewDebounceTimer) {
			clearTimeout(previewDebounceTimer);
		}
	});

	function calculatePreview() {
		isCalculatingPreview = true;

		try {
			const months = getMonthRange(startMonth, endMonth);
			const items: PreviewItem[] = [];
			const state = get(budgetStore);

			for (const categoryId of selectedCategories) {
				const category = flatCategories.find((c) => c.id === categoryId);
				if (!category) continue;

				for (const month of months) {
					const key = createCellKey(categoryId, month);
					const currentBudget = state.budgets.get(key);
					const currentCents = currentBudget?.amountCents ?? 0;

					let newCents = calculateNewAmount(currentCents, month);

					items.push({
						categoryId,
						categoryName: category.name,
						month,
						currentCents,
						newCents
					});
				}
			}

			previewItems = items;
			totalAffected = items.length;
		} catch (error) {
			console.error('Error calculating preview:', error);
		} finally {
			isCalculatingPreview = false;
		}
	}

	function calculateNewAmount(currentCents: number, month: MonthString): number {
		const parsedAmount = parseFloat(amountValue) || 0;
		const parsedPercent = parseFloat(percentValue) || 0;

		switch (selectedOperation) {
			case 'set-amount':
				return Math.round(parsedAmount * 100);

			case 'increase-percent':
				return Math.round(currentCents + (currentCents * parsedPercent) / 100);

			case 'decrease-percent':
				return Math.max(0, Math.round(currentCents - (currentCents * parsedPercent) / 100));

			case 'copy-previous': {
				// Get previous month's budget
				const state = get(budgetStore);
				const prevMonth = getPreviousMonth(month);
				const selectedCat = Array.from(selectedCategories)[0]; // Use first selected for now
				if (selectedCat) {
					const prevKey = createCellKey(selectedCat, prevMonth);
					const prevBudget = state.budgets.get(prevKey);
					return prevBudget?.amountCents ?? currentCents;
				}
				return currentCents;
			}

			default:
				return currentCents;
		}
	}

	function getPreviousMonth(month: MonthString): MonthString {
		const [year, m] = month.split('-').map(Number);
		if (m === 1) {
			return `${year - 1}-12`;
		}
		return `${year}-${String(m - 1).padStart(2, '0')}`;
	}

	async function handleApply() {
		if (selectedCategories.size === 0 || !startMonth || !endMonth) return;

		isLoading = true;

		try {
			const budgets: BudgetInput[] = previewItems.map((item) => ({
				categoryId: item.categoryId,
				month: item.month,
				amountCents: item.newCents
			}));

			const count = await setBudgetsBatch(budgets);

			// Update store with new budgets
			const newBudgets: Array<{
				categoryId: string;
				month: MonthString;
				amountCents: number;
				note: string | null;
				createdAt: string;
				updatedAt: string;
			}> = budgets.map((b) => ({
				categoryId: b.categoryId,
				month: b.month,
				amountCents: b.amountCents,
				note: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}));

			// Get current budgets and merge
			const state = get(budgetStore);
			const currentBudgets = Array.from(state.budgets.values());
			const mergedBudgets = [...currentBudgets];

			// Update or add new budgets
			for (const newBudget of newBudgets) {
				const existingIndex = mergedBudgets.findIndex(
					(b) => b.categoryId === newBudget.categoryId && b.month === newBudget.month
				);
				if (existingIndex >= 0) {
					mergedBudgets[existingIndex] = newBudget;
				} else {
					mergedBudgets.push(newBudget);
				}
			}

			budgetStore.setBudgets(mergedBudgets);

			toastStore.success(`Updated ${count} budget cell${count !== 1 ? 's' : ''}`);

			dispatch('applied', { count });
			dispatch('close');
		} catch (error) {
			console.error('Error applying batch adjustment:', error);
			toastStore.error('Failed to apply budget adjustments');
		} finally {
			isLoading = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	function handleCancel() {
		dispatch('close');
	}

	// Reset state only when modal transitions from closed to open
	let prevOpen = false;

	function resetModalState() {
		selectedCategories = new Set();
		selectedOperation = 'set-amount';
		amountValue = '';
		percentValue = '';
		setPresetRange('3m');
		previewItems = [];
		totalAffected = 0;
	}

	// Watch for open state change — safe now that reactive preview chain is removed
	$: if (open && !prevOpen) {
		resetModalState();
	}
	// Track open state separately to avoid compound reactive updates
	$: prevOpen = open;
</script>

<Modal {open} title="Adjust Budgets" on:close={handleClose}>
	<div class="adjustment-form" data-testid="budget-adjustment-modal">
		<!-- Category Selection -->
		<section class="form-section">
			<div class="category-header">
				<h3 class="section-title">Categories</h3>
				<span class="global-count" data-testid="global-category-count">
					{totalSelectedCount} of {totalSelectableCount} selected
				</span>
			</div>

			<label class="checkbox-row all-categories" data-testid="select-all-categories">
				<input
					type="checkbox"
					checked={allCategoriesSelected}
					use:indeterminate={totalSelectedCount > 0 && !allCategoriesSelected}
					on:change={toggleAllCategories}
				/>
				<span>All categories</span>
			</label>

			<div class="category-list" data-testid="category-list">
				{#each sections as section}
					<div class="category-section" data-testid="section-{section.name.toLowerCase()}">
						<label class="section-header-row" data-testid="section-header-{section.name.toLowerCase()}">
							<input
								type="checkbox"
								checked={sectionStates.get(section.id)?.allSelected ?? false}
								use:indeterminate={sectionStates.get(section.id)?.indeterminate ?? false}
								on:change={() => toggleSection(section)}
							/>
							<span class="section-name">{section.name}</span>
							<span class="section-count" data-testid="section-count-{section.name.toLowerCase()}">
								{sectionStates.get(section.id)?.selectedCount ?? 0} of {sectionStates.get(section.id)?.totalCount ?? 0} selected
							</span>
						</label>
						<div class="section-categories">
							{#each section.children as category}
								<label class="category-chip" data-testid="category-{category.id}" class:selected={selectedCategories.has(category.id)}>
									<input
										type="checkbox"
										checked={selectedCategories.has(category.id)}
										on:change={() => toggleCategory(category.id)}
									/>
									<span>{category.name}</span>
								</label>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Date Range Selection -->
		<section class="form-section">
			<h3 class="section-title">Date Range</h3>

			<div class="preset-buttons" data-testid="date-presets">
				{#each presets as preset}
					<button
						type="button"
						class="preset-button"
						class:active={!isCustomRange &&
							endMonth ===
								(() => {
									let end = startMonth;
									for (let i = 1; i < preset.months; i++) end = getNextMonth(end);
									return end;
								})()}
						data-testid="preset-{preset.id}"
						on:click={() => setPresetRange(preset.id)}
					>
						{preset.label}
					</button>
				{/each}
			</div>

			<div class="date-range-pickers">
				<MonthPicker
					bind:value={startMonth}
					label="Start"
					id="batch-start"
					on:change={handleStartMonthChange}
				/>
				<span class="range-separator">to</span>
				<MonthPicker
					bind:value={endMonth}
					label="End"
					id="batch-end"
					minMonth={startMonth}
					maxMonth={maxEndMonth}
					on:change={handleEndMonthChange}
				/>
			</div>

			{#if isCustomRange}
				<p class="range-info" data-testid="range-info">
					Maximum range: 24 months
				</p>
			{/if}
		</section>

		<!-- Operation Selection -->
		<section class="form-section">
			<h3 class="section-title">Operation</h3>

			<div class="operation-select" data-testid="operation-select">
				<select bind:value={selectedOperation}>
					{#each operations as op}
						<option value={op.id}>{op.label}</option>
					{/each}
				</select>
			</div>

			<div class="value-input" data-testid="value-input">
				{#if selectedOperation === 'set-amount'}
					<label class="input-label">
						Amount
						<div class="currency-input">
							<span class="currency-symbol">$</span>
							<input
								type="number"
								bind:value={amountValue}
								placeholder="0.00"
								min="0"
								step="0.01"
								data-testid="amount-input"
							/>
						</div>
					</label>
				{:else if selectedOperation === 'increase-percent' || selectedOperation === 'decrease-percent'}
					<label class="input-label">
						Percentage
						<div class="percent-input">
							<input
								type="number"
								bind:value={percentValue}
								placeholder="0"
								min="0"
								max="100"
								step="1"
								data-testid="percent-input"
							/>
							<span class="percent-symbol">%</span>
						</div>
					</label>
				{:else if selectedOperation === 'copy-previous'}
					<p class="operation-info">
						Budget values from the month before each selected month will be copied.
					</p>
				{/if}
			</div>
		</section>

		<!-- Preview Panel -->
		<section class="form-section">
			<AdjustmentPreview
				items={previewItems}
				{totalAffected}
				isLoading={isCalculatingPreview}
			/>
		</section>
	</div>

	<svelte:fragment slot="footer">
		<button
			type="button"
			class="btn btn-secondary"
			data-testid="cancel-button"
			on:click={handleCancel}
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-primary"
			disabled={isLoading || selectedCategories.size === 0 || totalAffected === 0}
			data-testid="apply-button"
			on:click={handleApply}
		>
			{#if isLoading}
				<span class="loading-spinner"></span>
				Applying...
			{:else}
				Apply
			{/if}
		</button>
	</svelte:fragment>
</Modal>

<style>
	.adjustment-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	/* Category Selection */
	.category-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.global-count {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.checkbox-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
		cursor: pointer;
	}

	.checkbox-row input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.all-categories {
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.category-list {
		max-height: 240px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-right: 4px;
	}

	.category-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.section-header-row {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 0.8125rem;
	}

	.section-header-row input[type='checkbox'] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.section-name {
		font-weight: 600;
		color: var(--text-primary, #111827);
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.03em;
	}

	.section-count {
		font-size: 0.6875rem;
		color: var(--text-secondary, #6b7280);
		margin-left: auto;
	}

	.section-categories {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding-left: 24px;
	}

	.category-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
		background: var(--bg-secondary, #f8f9fa);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 4px;
		cursor: pointer;
		transition:
			background 100ms ease,
			border-color 100ms ease;
	}

	.category-chip:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.category-chip.selected {
		background: var(--color-accent-light, #eef2ff);
		border-color: var(--color-accent, #4f46e5);
	}

	.category-chip input[type='checkbox'] {
		width: 14px;
		height: 14px;
		cursor: pointer;
	}

	/* Date Range */
	.preset-buttons {
		display: flex;
		gap: 8px;
	}

	.preset-button {
		padding: 6px 12px;
		font-size: 0.875rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		cursor: pointer;
		transition:
			background 100ms ease,
			border-color 100ms ease;
	}

	.preset-button:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.preset-button.active {
		background: var(--color-accent, #4f46e5);
		border-color: var(--color-accent, #4f46e5);
		color: #ffffff;
	}

	.date-range-pickers {
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}

	.range-separator {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		padding-bottom: 8px;
	}

	.range-info {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	/* Operation */
	.operation-select select {
		width: 100%;
		padding: 8px 12px;
		font-size: 0.875rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		cursor: pointer;
	}

	.operation-select select:focus {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 1px;
	}

	.value-input {
		margin-top: 8px;
	}

	.input-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.currency-input,
	.percent-input {
		display: flex;
		align-items: center;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		overflow: hidden;
	}

	.currency-symbol,
	.percent-symbol {
		padding: 8px 12px;
		background: var(--bg-secondary, #f8f9fa);
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.currency-input input,
	.percent-input input {
		flex: 1;
		padding: 8px 12px;
		font-size: 0.875rem;
		border: none;
		background: transparent;
		color: var(--text-primary, #111827);
	}

	.currency-input input:focus,
	.percent-input input:focus {
		outline: none;
	}

	.currency-input:focus-within,
	.percent-input:focus-within {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 1px;
	}

	.operation-info {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 8px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 6px;
		cursor: pointer;
		transition:
			background 100ms ease,
			opacity 100ms ease;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-primary, #111827);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--bg-hover, #f3f4f6);
	}

	.btn-primary {
		background: var(--color-accent, #4f46e5);
		border: 1px solid var(--color-accent, #4f46e5);
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-accent-dark, #4338ca);
	}

	.loading-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Dark mode */
	:global(.dark) .adjustment-form {
		--bg-primary: #1a1a1a;
		--bg-secondary: #1f1f1f;
		--bg-hover: #2d2d2d;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--color-accent-light: #1e1b4b;
	}
</style>
