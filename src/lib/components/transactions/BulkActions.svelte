<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { CategoryNode } from '$lib/types/ui';
	import type { PayeePattern } from '$lib/utils/payeePatterns';

	export let selectedCount: number = 0;
	export let totalCount: number = 0;
	export let categorizedCount: number = 0;
	export let categories: CategoryNode[] = [];
	export let patterns: PayeePattern[] = [];
	export let testId: string = 'bulk-actions';

	const dispatch = createEventDispatcher<{
		selectAll: void;
		clearSelection: void;
		assignCategory: { categoryId: string };
		applyPattern: { pattern: PayeePattern };
		done: void;
	}>();

	let showCategoryDropdown = false;
	let selectedCategoryId = '';

	$: hasSelection = selectedCount > 0;
	$: allSelected = selectedCount === totalCount && totalCount > 0;
	$: remaining = totalCount - categorizedCount;
	$: progressPercent = totalCount > 0 ? Math.round((categorizedCount / totalCount) * 100) : 0;
	$: isComplete = remaining === 0 && totalCount > 0;

	$: flatCategories = flattenCategories(categories);

	function flattenCategories(nodes: CategoryNode[]): { id: string; name: string; indent: boolean }[] {
		const result: { id: string; name: string; indent: boolean }[] = [];
		for (const node of nodes) {
			if (node.children && node.children.length > 0) {
				// Parent header - not selectable
				for (const child of node.children) {
					result.push({ id: child.id, name: child.name, indent: true });
				}
			} else {
				result.push({ id: node.id, name: node.name, indent: false });
			}
		}
		return result;
	}

	function handleSelectAll() {
		if (allSelected) {
			dispatch('clearSelection');
		} else {
			dispatch('selectAll');
		}
	}

	function handleApplyCategory() {
		if (selectedCategoryId) {
			dispatch('assignCategory', { categoryId: selectedCategoryId });
			selectedCategoryId = '';
			showCategoryDropdown = false;
		}
	}

	function handleApplyPattern(pattern: PayeePattern) {
		dispatch('applyPattern', { pattern });
	}
</script>

<div class="bulk-actions" data-testid={testId}>
	<!-- Progress Tracking -->
	<div class="progress-section" data-testid="{testId}-progress">
		<div class="progress-text">
			{#if isComplete}
				<span class="progress-complete" data-testid="{testId}-complete">All done!</span>
			{:else}
				<span data-testid="{testId}-progress-text">{categorizedCount} of {totalCount} categorized</span>
			{/if}
		</div>
		<div class="progress-bar-wrapper">
			<div
				class="progress-bar"
				style="width: {progressPercent}%"
				data-testid="{testId}-progress-bar"
			></div>
		</div>
	</div>

	<!-- Selection Controls -->
	<div class="selection-row">
		<label class="select-all-label" data-testid="{testId}-select-all">
			<input
				type="checkbox"
				checked={allSelected}
				indeterminate={selectedCount > 0 && !allSelected}
				on:change={handleSelectAll}
			/>
			<span>{allSelected ? 'Deselect all' : 'Select all'}</span>
		</label>
		{#if selectedCount > 0}
			<span class="selection-count" data-testid="{testId}-selection-count">
				{selectedCount} selected
			</span>
		{/if}
	</div>

	<!-- Category Assignment -->
	{#if hasSelection}
		<div class="category-assign" data-testid="{testId}-category-assign">
			<select
				bind:value={selectedCategoryId}
				class="category-select"
				data-testid="{testId}-category-select"
			>
				<option value="">Choose category...</option>
				{#each flatCategories as cat}
					<option value={cat.id}>{cat.indent ? '  ' : ''}{cat.name}</option>
				{/each}
			</select>
			<button
				class="btn-apply"
				disabled={!selectedCategoryId}
				data-testid="{testId}-apply-btn"
				on:click={handleApplyCategory}
			>
				Apply to {selectedCount} selected
			</button>
		</div>
	{/if}

	<!-- Pattern Suggestions -->
	{#if patterns.length > 0}
		<div class="pattern-suggestions" data-testid="{testId}-patterns">
			<h4 class="patterns-title">Quick patterns</h4>
			{#each patterns as pattern, idx}
				{#if pattern.suggestedCategoryId}
					<button
						class="pattern-btn"
						data-testid="{testId}-pattern-{idx}"
						on:click={() => handleApplyPattern(pattern)}
					>
						Categorize all '{pattern.payee}' as {pattern.suggestedCategoryName}?
						<span class="pattern-count">({pattern.count})</span>
					</button>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Done Button -->
	{#if isComplete}
		<button
			class="btn-done"
			data-testid="{testId}-done-btn"
			on:click={() => dispatch('done')}
		>
			Done
		</button>
	{/if}
</div>

<style>
	.bulk-actions {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px 16px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
	}

	.progress-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.progress-text {
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
		font-weight: 500;
	}

	.progress-complete {
		color: var(--color-success, #10b981);
		font-weight: 600;
	}

	.progress-bar-wrapper {
		height: 4px;
		background: var(--border-color, #e5e7eb);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: var(--accent, #4f46e5);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.selection-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.select-all-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
		cursor: pointer;
	}

	.select-all-label input {
		width: 16px;
		height: 16px;
		accent-color: var(--accent, #4f46e5);
	}

	.selection-count {
		font-size: 0.75rem;
		color: var(--accent, #4f46e5);
		font-weight: 600;
	}

	.category-assign {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.category-select {
		flex: 1;
		padding: 6px 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		font-size: 0.8125rem;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
	}

	.btn-apply {
		padding: 6px 12px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-apply:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-apply:hover:not(:disabled) {
		opacity: 0.9;
	}

	.pattern-suggestions {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.patterns-title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.pattern-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 12px;
		background: rgba(79, 70, 229, 0.06);
		border: 1px solid rgba(79, 70, 229, 0.2);
		border-radius: 6px;
		color: var(--accent, #4f46e5);
		font-size: 0.8125rem;
		cursor: pointer;
		text-align: left;
	}

	.pattern-btn:hover {
		background: rgba(79, 70, 229, 0.12);
	}

	.pattern-count {
		color: var(--text-secondary, #9ca3af);
		font-size: 0.75rem;
	}

	.btn-done {
		align-self: center;
		padding: 8px 24px;
		background: var(--color-success, #10b981);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-done:hover {
		opacity: 0.9;
	}

	/* Dark mode */
	:global(.dark) .bulk-actions {
		background: #1a1a1a;
		border-color: #374151;
	}

	:global(.dark) .select-all-label {
		color: #f9fafb;
	}

	:global(.dark) .category-select {
		background: #0f0f0f;
		border-color: #374151;
		color: #f9fafb;
	}
</style>
