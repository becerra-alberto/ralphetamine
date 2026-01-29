<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';
	import Chip from './Chip.svelte';

	export let value: string[] = [];
	export let availableTags: string[] = [];
	export let placeholder = 'Add tags...';
	export let testId = 'tag-select';

	const PREDEFINED_TAGS = ['Personal', 'Business', 'Recurring', 'Tax-Deductible'];

	const dispatch = createEventDispatcher<{
		change: { tags: string[] };
	}>();

	let isOpen = false;
	let newTagInput = '';
	let highlightedIndex = -1;
	let inputEl: HTMLInputElement;
	let containerEl: HTMLDivElement;
	let listEl: HTMLUListElement;

	// Merge predefined + available tags, deduplicate (case-insensitive)
	$: allTags = mergeAndDeduplicate(PREDEFINED_TAGS, availableTags);

	// Filter displayed tags by search input (but show all when no input)
	$: displayTags = newTagInput.trim()
		? allTags.filter((t) => t.toLowerCase().includes(newTagInput.trim().toLowerCase()))
		: allTags;

	function mergeAndDeduplicate(predefined: string[], custom: string[]): string[] {
		const seen = new Map<string, string>();
		for (const tag of predefined) {
			seen.set(tag.toLowerCase(), tag);
		}
		for (const tag of custom) {
			if (!seen.has(tag.toLowerCase())) {
				seen.set(tag.toLowerCase(), tag);
			}
		}
		return Array.from(seen.values());
	}

	function isSelected(tag: string): boolean {
		return value.some((v) => v.toLowerCase() === tag.toLowerCase());
	}

	function toggleTag(tag: string) {
		if (isSelected(tag)) {
			value = value.filter((t) => t.toLowerCase() !== tag.toLowerCase());
		} else {
			value = [...value, tag];
		}
		dispatch('change', { tags: value });
	}

	function removeTag(tag: string) {
		value = value.filter((t) => t.toLowerCase() !== tag.toLowerCase());
		dispatch('change', { tags: value });
	}

	function createTag() {
		const trimmed = newTagInput.trim();
		if (!trimmed) return;
		if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
			newTagInput = '';
			return;
		}
		value = [...value, trimmed];
		// Add to available if not already there
		if (!allTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
			availableTags = [...availableTags, trimmed];
		}
		newTagInput = '';
		highlightedIndex = -1;
		dispatch('change', { tags: value });
	}

	function open() {
		isOpen = true;
		highlightedIndex = -1;
		tick().then(() => {
			inputEl?.focus();
		});
	}

	function close() {
		isOpen = false;
		newTagInput = '';
		highlightedIndex = -1;
	}

	function handleTriggerClick() {
		if (isOpen) {
			close();
		} else {
			open();
		}
	}

	function handleTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!isOpen) {
				open();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					open();
				} else if (displayTags.length > 0) {
					highlightedIndex = Math.min(highlightedIndex + 1, displayTags.length - 1);
					scrollToHighlighted();
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (displayTags.length > 0 && highlightedIndex > 0) {
					highlightedIndex--;
					scrollToHighlighted();
				}
				break;
			case ' ':
				if (highlightedIndex >= 0 && highlightedIndex < displayTags.length) {
					event.preventDefault();
					toggleTag(displayTags[highlightedIndex]);
				}
				// Allow space in new tag input when not navigating
				break;
			case 'Enter':
				event.preventDefault();
				if (!isOpen) {
					open();
				} else if (highlightedIndex >= 0 && highlightedIndex < displayTags.length) {
					toggleTag(displayTags[highlightedIndex]);
				} else if (newTagInput.trim()) {
					createTag();
				}
				break;
			case 'Escape':
				event.preventDefault();
				close();
				break;
			case 'Backspace':
				if (!newTagInput && value.length > 0) {
					const lastTag = value[value.length - 1];
					removeTag(lastTag);
				}
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

	function handleChipRemove(event: CustomEvent<{ label: string }>) {
		removeTag(event.detail.label);
	}

	function scrollToHighlighted() {
		if (listEl && highlightedIndex >= 0) {
			const items = listEl.querySelectorAll('[data-tag-option]');
			if (items?.[highlightedIndex]) {
				items[highlightedIndex]?.scrollIntoView?.({ block: 'nearest' });
			}
		}
	}

	function handleItemMouseenter(idx: number) {
		highlightedIndex = idx;
	}

	export function focus() {
		if (isOpen) {
			inputEl?.focus();
		} else {
			open();
		}
	}

	export function getTags(): string[] {
		return value;
	}

	export function setTags(tags: string[]) {
		value = tags;
	}

	export function serializeTags(): string {
		return JSON.stringify(value);
	}
</script>

<div
	class="tag-select"
	bind:this={containerEl}
	data-testid={testId}
>
	<!-- Trigger area with chips -->
	<div
		class="tag-trigger"
		data-testid="{testId}-trigger"
		role="combobox"
		tabindex={isOpen ? -1 : 0}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-controls="{testId}-listbox"
		aria-label="Tags"
		on:click={handleTriggerClick}
		on:keydown={handleTriggerKeydown}
	>
		{#if value.length > 0}
			<div class="chips" data-testid="{testId}-chips">
				{#each value as tag}
					<Chip
						label={tag}
						testId="{testId}-chip-{tag.toLowerCase().replace(/\s+/g, '-')}"
						on:remove={handleChipRemove}
					/>
				{/each}
			</div>
		{:else if !isOpen}
			<span class="placeholder" data-testid="{testId}-placeholder">{placeholder}</span>
		{/if}

		{#if isOpen}
			<input
				bind:this={inputEl}
				bind:value={newTagInput}
				type="text"
				class="tag-input"
				placeholder={value.length > 0 ? 'Type to add...' : placeholder}
				data-testid="{testId}-input"
				aria-label="Type to filter or create tags"
				on:keydown={handleKeydown}
				on:blur={handleBlur}
			/>
		{/if}

		<svg class="chevron" class:open={isOpen} xmlns="http://www.w3.org/2000/svg" width="12"
			height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
			stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="m6 9 6 6 6-6" />
		</svg>
	</div>

	<!-- Dropdown panel -->
	{#if isOpen}
		<div class="dropdown-panel" data-testid="{testId}-panel">
			<!-- Tag checkbox list -->
			<ul
				bind:this={listEl}
				class="tag-list"
				role="listbox"
				data-testid="{testId}-listbox"
				aria-multiselectable="true"
				tabindex="-1"
			>
				{#each displayTags as tag, idx}
					<li
						class="tag-option"
						class:highlighted={idx === highlightedIndex}
						class:selected={isSelected(tag)}
						role="option"
						aria-selected={isSelected(tag)}
						data-tag-option
						data-testid="{testId}-option-{tag.toLowerCase().replace(/\s+/g, '-')}"
						on:mousedown|preventDefault={() => toggleTag(tag)}
						on:mouseenter={() => handleItemMouseenter(idx)}
					>
						<span class="checkbox" class:checked={isSelected(tag)} data-testid="{testId}-checkbox-{tag.toLowerCase().replace(/\s+/g, '-')}">
							{#if isSelected(tag)}
								<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
									fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
									stroke-linejoin="round" aria-hidden="true">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
						</span>
						<span class="tag-name">{tag}</span>
					</li>
				{/each}

				{#if displayTags.length === 0 && newTagInput.trim()}
					<li
						class="create-option"
						role="option"
						aria-selected="false"
						data-testid="{testId}-create"
						on:mousedown|preventDefault={createTag}
					>
						Create "<strong>{newTagInput.trim()}</strong>"
					</li>
				{:else if displayTags.length === 0}
					<li class="no-tags" data-testid="{testId}-no-tags">
						No tags available
					</li>
				{/if}
			</ul>
		</div>
	{/if}
</div>

<style>
	.tag-select {
		position: relative;
		width: 100%;
	}

	.tag-trigger {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 3px;
		min-height: 34px;
		padding: 2px 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s ease;
		box-sizing: border-box;
	}

	.tag-trigger:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		flex: 1;
		min-width: 0;
		align-items: center;
	}

	.placeholder {
		flex: 1;
		color: var(--text-secondary, #9ca3af);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tag-input {
		flex: 1;
		min-width: 60px;
		border: none;
		outline: none;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		padding: 2px 0;
	}

	.chevron {
		flex-shrink: 0;
		transition: transform 0.15s ease;
		color: var(--text-secondary, #6b7280);
		align-self: center;
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

	.tag-list {
		list-style: none;
		margin: 0;
		padding: 4px 0;
		max-height: 200px;
		overflow-y: auto;
	}

	.tag-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
		cursor: pointer;
		transition: background-color 0.1s ease;
	}

	.tag-option:hover,
	.tag-option.highlighted {
		background: var(--bg-hover, #f3f4f6);
	}

	.tag-option.selected {
		font-weight: 500;
	}

	.checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: 1.5px solid var(--border-color, #d1d5db);
		border-radius: 3px;
		background: var(--bg-primary, #ffffff);
		flex-shrink: 0;
		transition: background-color 0.1s ease, border-color 0.1s ease;
	}

	.checkbox.checked {
		background: var(--accent, #4f46e5);
		border-color: var(--accent, #4f46e5);
		color: white;
	}

	.tag-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.create-option {
		padding: 8px 10px;
		font-size: 0.8125rem;
		color: var(--accent, #4f46e5);
		cursor: pointer;
		transition: background-color 0.1s ease;
	}

	.create-option:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.no-tags {
		padding: 12px 10px;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
		font-style: italic;
		text-align: center;
	}

	/* Dark mode */
	:global(.dark) .tag-trigger {
		background: var(--bg-primary, #1a1a1a);
		color: var(--text-primary, #f9fafb);
		border-color: #2d2d2d;
	}

	:global(.dark) .tag-input {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .dropdown-panel {
		background: var(--bg-primary, #1a1a1a);
		border-color: #2d2d2d;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	:global(.dark) .tag-option:hover,
	:global(.dark) .tag-option.highlighted {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .checkbox {
		background: var(--bg-secondary, #252525);
		border-color: #3d3d3d;
	}

	:global(.dark) .checkbox.checked {
		background: var(--accent, #4f46e5);
		border-color: var(--accent, #4f46e5);
	}

	:global(.dark) .create-option:hover {
		background: rgba(255, 255, 255, 0.06);
	}
</style>
