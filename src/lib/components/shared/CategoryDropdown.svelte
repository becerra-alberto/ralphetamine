<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import type { CategoryNode } from '$lib/types/ui';
	import {
		flattenCategoryTree,
		filterCategoryTree,
		getSelectableItems,
		type CategoryDropdownItem
	} from '$lib/utils/categoryGroups';

	export let categories: CategoryNode[] = [];
	export let value: string | null = null;
	export let placeholder = 'Select category';
	export let testId = 'category-dropdown';

	const dispatch = createEventDispatcher<{
		select: { categoryId: string | null; categoryName: string };
		clear: void;
	}>();

	let isOpen = false;
	let searchQuery = '';
	let highlightedIndex = -1;
	let inputEl: HTMLInputElement;
	let listEl: HTMLUListElement;
	let containerEl: HTMLDivElement;

	// Compute display items based on search
	$: allItems = searchQuery
		? filterCategoryTree(categories, searchQuery)
		: flattenCategoryTree(categories);
	$: selectableItems = getSelectableItems(allItems);

	// Find selected category name for display
	$: selectedName = findCategoryName(value, categories);

	function findCategoryName(id: string | null, cats: CategoryNode[]): string {
		if (!id) return '';
		for (const parent of cats) {
			if (parent.id === id) return parent.name;
			for (const child of parent.children) {
				if (child.id === id) return child.name;
			}
		}
		return '';
	}

	function getSelectableIndex(item: CategoryDropdownItem): number {
		return selectableItems.indexOf(item);
	}

	function open() {
		isOpen = true;
		searchQuery = '';
		highlightedIndex = -1;
		tick().then(() => {
			inputEl?.focus();
		});
	}

	function close() {
		isOpen = false;
		searchQuery = '';
		highlightedIndex = -1;
	}

	function toggle() {
		if (isOpen) {
			close();
		} else {
			open();
		}
	}

	function selectItem(item: CategoryDropdownItem) {
		if (item.isHeader) return;
		dispatch('select', { categoryId: item.id, categoryName: item.name });
		close();
	}

	function selectUncategorized() {
		dispatch('select', { categoryId: null, categoryName: '' });
		close();
	}

	function handleClear(event: MouseEvent | KeyboardEvent) {
		event.stopPropagation();
		dispatch('clear');
		dispatch('select', { categoryId: null, categoryName: '' });
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					open();
				} else if (selectableItems.length > 0) {
					// -1 = "Uncategorized" option
					if (highlightedIndex === -1) {
						highlightedIndex = 0;
					} else if (highlightedIndex < selectableItems.length - 1) {
						highlightedIndex++;
					}
					scrollToHighlighted();
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (selectableItems.length > 0 && highlightedIndex > -1) {
					highlightedIndex--;
					scrollToHighlighted();
				}
				break;
			case 'Enter':
				event.preventDefault();
				if (!isOpen) {
					open();
				} else if (highlightedIndex === -1) {
					selectUncategorized();
				} else if (highlightedIndex >= 0 && highlightedIndex < selectableItems.length) {
					selectItem(selectableItems[highlightedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				close();
				break;
		}
	}

	function handleBlur(event: FocusEvent) {
		const related = event.relatedTarget as HTMLElement | null;
		if (related && containerEl?.contains(related)) {
			return;
		}
		setTimeout(() => {
			close();
		}, 150);
	}

	function scrollToHighlighted() {
		if (listEl && highlightedIndex >= 0) {
			const items = listEl.querySelectorAll('[data-selectable="true"]');
			if (items[highlightedIndex] && typeof items[highlightedIndex].scrollIntoView === 'function') {
				items[highlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}
	}

	function handleItemMouseenter(selectableIdx: number) {
		highlightedIndex = selectableIdx;
	}

	// Export focus method for external access
	export function focus() {
		if (isOpen) {
			inputEl?.focus();
		} else {
			open();
		}
	}
</script>

<div
	class="category-dropdown"
	bind:this={containerEl}
	data-testid={testId}
>
	<!-- Trigger button -->
	<button
		type="button"
		class="dropdown-trigger"
		data-testid="{testId}-trigger"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-label="Category"
		on:click={toggle}
		on:keydown={handleKeydown}
	>
		{#if value && selectedName}
			<span class="selected-value" data-testid="{testId}-selected">
				{selectedName}
			</span>
			<span
				role="button"
				class="clear-btn"
				data-testid="{testId}-clear"
				aria-label="Clear category"
				on:click={handleClear}
				on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(e); }}
				tabindex="-1"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
					fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
					stroke-linejoin="round" aria-hidden="true">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</span>
		{:else}
			<span class="placeholder">{placeholder}</span>
		{/if}
		<svg class="chevron" class:open={isOpen} xmlns="http://www.w3.org/2000/svg" width="12"
			height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
			stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	<!-- Dropdown -->
	{#if isOpen}
		<div class="dropdown-panel" data-testid="{testId}-panel">
			<!-- Search input -->
			<div class="search-container">
				<input
					bind:this={inputEl}
					bind:value={searchQuery}
					type="text"
					class="search-input"
					placeholder="Search categories..."
					data-testid="{testId}-search"
					aria-label="Search categories"
					on:keydown={handleKeydown}
					on:blur={handleBlur}
				/>
			</div>

			<!-- Category list -->
			<ul
				bind:this={listEl}
				class="category-list"
				role="listbox"
				data-testid="{testId}-listbox"
				tabindex="-1"
			>
				<!-- Uncategorized option at top -->
				<li
					class="category-item uncategorized-option"
					class:highlighted={highlightedIndex === -1 && isOpen}
					role="option"
					aria-selected={value === null || value === ''}
					data-testid="{testId}-uncategorized"
					on:mousedown|preventDefault={selectUncategorized}
					on:mouseenter={() => { highlightedIndex = -1; }}
				>
					<span class="item-name">Uncategorized</span>
				</li>

				{#each allItems as item, idx}
					{#if item.isHeader}
						<!-- Section header (non-selectable) -->
						<li
							class="section-header"
							data-testid="{testId}-header-{item.id}"
							role="presentation"
						>
							<span class="header-name">{item.name}</span>
						</li>
					{:else}
						<!-- Selectable child category -->
						{@const selectableIdx = getSelectableIndex(item)}
						<li
							class="category-item"
							class:highlighted={selectableIdx === highlightedIndex}
							role="option"
							aria-selected={item.id === value}
							data-selectable="true"
							data-testid="{testId}-item-{item.id}"
							on:mousedown|preventDefault={() => selectItem(item)}
							on:mouseenter={() => handleItemMouseenter(selectableIdx)}
						>
							{#if item.color}
								<span
									class="color-dot"
									style="background-color: {item.color}"
									data-testid="{testId}-color-{item.id}"
								></span>
							{/if}
							{#if item.icon}
								<span class="item-icon" data-testid="{testId}-icon-{item.id}">{item.icon}</span>
							{/if}
							<span class="item-name">{item.name}</span>
						</li>
					{/if}
				{/each}

				{#if allItems.length === 0}
					<li class="no-results" data-testid="{testId}-no-results">
						No categories found
					</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>

<style>
	.category-dropdown {
		position: relative;
		width: 100%;
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		width: 100%;
		height: 34px;
		padding: 0 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s ease;
		gap: 4px;
		text-align: left;
		box-sizing: border-box;
	}

	.dropdown-trigger:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.selected-value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.placeholder {
		flex: 1;
		color: var(--text-secondary, #9ca3af);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		border: none;
		border-radius: 2px;
		background: transparent;
		color: var(--text-secondary, #9ca3af);
		cursor: pointer;
		flex-shrink: 0;
	}

	.clear-btn:hover {
		color: var(--text-primary, #111827);
		background: var(--bg-hover, #f3f4f6);
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.15s ease;
		color: var(--text-secondary, #6b7280);
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown-panel {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin: 2px 0 0 0;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 50;
		overflow: hidden;
	}

	.search-container {
		padding: 6px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.search-input {
		width: 100%;
		height: 28px;
		padding: 0 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-secondary, #f9fafb);
		color: var(--text-primary, #111827);
		font-size: 0.75rem;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: var(--accent, #4f46e5);
	}

	.category-list {
		list-style: none;
		margin: 0;
		padding: 4px 0;
		max-height: 240px;
		overflow-y: auto;
	}

	.section-header {
		padding: 6px 10px 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-secondary, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: default;
		user-select: none;
		background: var(--bg-secondary, #f9fafb);
	}

	.category-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px 6px 24px;
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
		cursor: pointer;
		transition: background-color 0.1s ease;
	}

	.category-item:hover,
	.category-item.highlighted {
		background: var(--bg-hover, #f3f4f6);
	}

	.category-item.uncategorized-option {
		padding-left: 10px;
		font-style: italic;
		color: var(--text-secondary, #6b7280);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.item-icon {
		flex-shrink: 0;
		font-size: 0.875rem;
	}

	.item-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.no-results {
		padding: 12px 10px;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
		font-style: italic;
		text-align: center;
	}

	/* Dark mode */
	:global(.dark) .dropdown-trigger {
		background: var(--bg-primary, #1a1a1a);
		color: var(--text-primary, #f9fafb);
		border-color: #2d2d2d;
	}

	:global(.dark) .dropdown-panel {
		background: var(--bg-primary, #1a1a1a);
		border-color: #2d2d2d;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	:global(.dark) .search-input {
		background: var(--bg-secondary, #252525);
		color: var(--text-primary, #f9fafb);
		border-color: #2d2d2d;
	}

	:global(.dark) .section-header {
		background: var(--bg-secondary, #252525);
	}

	:global(.dark) .category-item:hover,
	:global(.dark) .category-item.highlighted {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .clear-btn:hover {
		color: var(--text-primary, #f9fafb);
		background: rgba(255, 255, 255, 0.1);
	}
</style>
