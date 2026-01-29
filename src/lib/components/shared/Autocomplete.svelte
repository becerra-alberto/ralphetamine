<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import type { AutocompleteItem } from '$lib/types/ui';

	export let value = '';
	export let items: AutocompleteItem[] = [];
	export let placeholder = '';
	export let label = '';
	export let minChars = 2;
	export let maxItems = 10;
	export let debounceMs = 150;
	export let noMatchesText = 'No matches - press Enter to use as new value';
	export let hasError = false;
	export let testId = 'autocomplete';

	const dispatch = createEventDispatcher<{
		input: string;
		select: AutocompleteItem;
		enter: string;
	}>();

	let isOpen = false;
	let highlightedIndex = -1;
	let inputEl: HTMLInputElement;
	let listEl: HTMLUListElement;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$: visibleItems = items.slice(0, maxItems);
	$: showNoMatches = isOpen && value.length >= minChars && items.length === 0;

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (value.length >= minChars) {
				dispatch('input', value);
				isOpen = true;
				highlightedIndex = -1;
			} else {
				isOpen = false;
			}
		}, debounceMs);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen && event.key !== 'Escape') {
			if (event.key === 'Enter') {
				dispatch('enter', value);
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen && value.length >= minChars) {
					isOpen = true;
					highlightedIndex = 0;
				} else if (visibleItems.length > 0) {
					highlightedIndex = (highlightedIndex + 1) % visibleItems.length;
					scrollToHighlighted();
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (visibleItems.length > 0) {
					highlightedIndex = highlightedIndex <= 0 ? visibleItems.length - 1 : highlightedIndex - 1;
					scrollToHighlighted();
				}
				break;
			case 'Enter':
				event.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < visibleItems.length) {
					selectItem(visibleItems[highlightedIndex]);
				} else {
					dispatch('enter', value);
					close();
				}
				break;
			case 'Escape':
				event.preventDefault();
				close();
				break;
		}
	}

	function selectItem(item: AutocompleteItem) {
		value = item.value;
		dispatch('select', item);
		close();
	}

	function handleItemClick(item: AutocompleteItem) {
		selectItem(item);
	}

	function handleItemMouseenter(index: number) {
		highlightedIndex = index;
	}

	function close() {
		isOpen = false;
		highlightedIndex = -1;
	}

	function scrollToHighlighted() {
		if (listEl && highlightedIndex >= 0) {
			const items = listEl.querySelectorAll('[role="option"]');
			if (items[highlightedIndex] && typeof items[highlightedIndex].scrollIntoView === 'function') {
				items[highlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}
	}

	function handleBlur(event: FocusEvent) {
		const related = event.relatedTarget as HTMLElement | null;
		if (related && listEl?.contains(related)) {
			return;
		}
		// Delay close to allow click events to fire
		setTimeout(() => {
			close();
		}, 150);
	}

	function handleFocus() {
		if (value.length >= minChars && items.length > 0) {
			isOpen = true;
		}
	}

	export function focus() {
		inputEl?.focus();
	}

	export function getInputElement(): HTMLInputElement | undefined {
		return inputEl;
	}

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});
</script>

<div class="autocomplete" data-testid={testId}>
	<input
		bind:this={inputEl}
		bind:value
		type="text"
		class="autocomplete-input"
		class:error={hasError}
		{placeholder}
		aria-label={label}
		aria-expanded={isOpen}
		aria-autocomplete="list"
		aria-controls="{testId}-listbox"
		aria-activedescendant={highlightedIndex >= 0 ? `${testId}-option-${highlightedIndex}` : undefined}
		role="combobox"
		data-testid="{testId}-input"
		on:input={handleInput}
		on:keydown={handleKeydown}
		on:blur={handleBlur}
		on:focus={handleFocus}
	/>

	{#if isOpen && (visibleItems.length > 0 || showNoMatches)}
		<ul
			bind:this={listEl}
			class="autocomplete-dropdown"
			role="listbox"
			id="{testId}-listbox"
			data-testid="{testId}-dropdown"
			tabindex="-1"
		>
			{#if visibleItems.length > 0}
				{#each visibleItems as item, index}
					<li
						role="option"
						id="{testId}-option-{index}"
						class="autocomplete-item"
						class:highlighted={index === highlightedIndex}
						aria-selected={index === highlightedIndex}
						data-testid="{testId}-option-{index}"
						on:mousedown|preventDefault={() => handleItemClick(item)}
						on:mouseenter={() => handleItemMouseenter(index)}
					>
						<span class="item-label">{item.label}</span>
						{#if item.detail}
							<span class="item-detail">{item.detail}</span>
						{/if}
					</li>
				{/each}
			{:else if showNoMatches}
				<li class="autocomplete-no-matches" data-testid="{testId}-no-matches">
					{noMatchesText}
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.autocomplete {
		position: relative;
		width: 100%;
	}

	.autocomplete-input {
		height: 34px;
		padding: 0 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s ease;
		width: 100%;
		box-sizing: border-box;
	}

	.autocomplete-input:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.autocomplete-input.error {
		border-color: var(--color-danger, #ef4444);
	}

	.autocomplete-input.error:focus {
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
	}

	.autocomplete-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin: 2px 0 0 0;
		padding: 4px 0;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		list-style: none;
		max-height: 240px;
		overflow-y: auto;
		z-index: 50;
	}

	.autocomplete-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 10px;
		cursor: pointer;
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
		transition: background-color 0.1s ease;
	}

	.autocomplete-item:hover,
	.autocomplete-item.highlighted {
		background: var(--bg-hover, #f3f4f6);
	}

	.item-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-detail {
		flex-shrink: 0;
		margin-left: 8px;
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.autocomplete-no-matches {
		padding: 8px 10px;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
		font-style: italic;
	}

	/* Dark mode */
	:global(.dark) .autocomplete-dropdown {
		background: var(--bg-primary, #1a1a1a);
		border-color: #2d2d2d;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	:global(.dark) .autocomplete-item:hover,
	:global(.dark) .autocomplete-item.highlighted {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .autocomplete-input {
		background: var(--bg-primary, #1a1a1a);
		color: var(--text-primary, #f9fafb);
		border-color: #2d2d2d;
	}
</style>
