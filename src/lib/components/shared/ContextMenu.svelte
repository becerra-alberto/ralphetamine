<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { MenuItem } from '$lib/types/ui';

	export let visible: boolean = false;
	export let x: number = 0;
	export let y: number = 0;
	export let items: MenuItem[] = [];

	const dispatch = createEventDispatcher<{
		close: void;
		select: { id: string };
	}>();

	let menuElement: HTMLElement | null = null;
	let highlightedIndex: number = -1;
	let adjustedX: number = 0;
	let adjustedY: number = 0;

	// Filter out divider-only items for keyboard navigation
	$: selectableItems = items.filter((item) => !item.divider && !item.disabled);
	$: selectableIndices = items
		.map((item, index) => (!item.divider && !item.disabled ? index : -1))
		.filter((i) => i !== -1);

	// Calculate adjusted position to keep menu in viewport
	$: if (visible && menuElement) {
		adjustPosition();
	}

	function adjustPosition() {
		if (!menuElement) {
			adjustedX = x;
			adjustedY = y;
			return;
		}

		const rect = menuElement.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const padding = 8;

		// Adjust horizontal position
		if (x + rect.width > viewportWidth - padding) {
			adjustedX = Math.max(padding, viewportWidth - rect.width - padding);
		} else {
			adjustedX = x;
		}

		// Adjust vertical position
		if (y + rect.height > viewportHeight - padding) {
			adjustedY = Math.max(padding, viewportHeight - rect.height - padding);
		} else {
			adjustedY = y;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!visible) return;

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				event.stopPropagation();
				close();
				break;
			case 'ArrowDown':
				event.preventDefault();
				event.stopPropagation();
				navigateDown();
				break;
			case 'ArrowUp':
				event.preventDefault();
				event.stopPropagation();
				navigateUp();
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				event.stopPropagation();
				selectHighlighted();
				break;
		}
	}

	function navigateDown() {
		if (selectableIndices.length === 0) return;

		const currentSelectableIndex = selectableIndices.indexOf(highlightedIndex);
		if (currentSelectableIndex === -1 || currentSelectableIndex === selectableIndices.length - 1) {
			highlightedIndex = selectableIndices[0];
		} else {
			highlightedIndex = selectableIndices[currentSelectableIndex + 1];
		}
	}

	function navigateUp() {
		if (selectableIndices.length === 0) return;

		const currentSelectableIndex = selectableIndices.indexOf(highlightedIndex);
		if (currentSelectableIndex === -1 || currentSelectableIndex === 0) {
			highlightedIndex = selectableIndices[selectableIndices.length - 1];
		} else {
			highlightedIndex = selectableIndices[currentSelectableIndex - 1];
		}
	}

	function selectHighlighted() {
		if (highlightedIndex >= 0 && highlightedIndex < items.length) {
			const item = items[highlightedIndex];
			if (!item.divider && !item.disabled) {
				selectItem(item.id);
			}
		}
	}

	function selectItem(id: string) {
		dispatch('select', { id });
		close();
	}

	function close() {
		dispatch('close');
	}

	function handleClickOutside(event: MouseEvent) {
		if (visible && menuElement && !menuElement.contains(event.target as Node)) {
			close();
		}
	}

	function handleItemClick(item: MenuItem) {
		if (!item.divider && !item.disabled) {
			selectItem(item.id);
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside, true);
		document.addEventListener('keydown', handleKeydown);
		// Reset highlight when opening
		highlightedIndex = -1;
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside, true);
		document.removeEventListener('keydown', handleKeydown);
	});

	// Focus menu when it becomes visible
	$: if (visible && menuElement) {
		menuElement.focus();
	}
</script>

{#if visible}
	<div
		bind:this={menuElement}
		class="context-menu"
		style="left: {adjustedX}px; top: {adjustedY}px;"
		role="menu"
		tabindex="-1"
		data-testid="context-menu"
		transition:fade={{ duration: 100 }}
	>
		{#each items as item, index}
			{#if item.divider}
				<div class="menu-divider" role="separator" data-testid="menu-divider"></div>
			{:else}
				<button
					class="menu-item"
					class:highlighted={highlightedIndex === index}
					class:disabled={item.disabled}
					role="menuitem"
					tabindex="-1"
					disabled={item.disabled}
					data-testid="menu-item-{item.id}"
					on:click={() => handleItemClick(item)}
					on:mouseenter={() => (highlightedIndex = index)}
				>
					{#if item.icon}
						<span class="menu-icon">{item.icon}</span>
					{/if}
					<span class="menu-label">{item.label}</span>
				</button>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: 1100;
		background: var(--bg-menu, #ffffff);
		border: 1px solid var(--border-menu, #e5e7eb);
		border-radius: 8px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		min-width: 180px;
		padding: 4px 0;
		outline: none;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 100ms ease;
	}

	.menu-item:hover,
	.menu-item.highlighted {
		background: var(--bg-hover, #f3f4f6);
	}

	.menu-item.disabled {
		color: var(--text-disabled, #9ca3af);
		cursor: not-allowed;
	}

	.menu-item.disabled:hover {
		background: none;
	}

	.menu-icon {
		width: 16px;
		text-align: center;
	}

	.menu-label {
		flex: 1;
	}

	.menu-divider {
		height: 1px;
		margin: 4px 8px;
		background: var(--border-menu, #e5e7eb);
	}

	/* Dark mode */
	:global(.dark) .context-menu {
		--bg-menu: #1a1a1a;
		--border-menu: #2d2d2d;
		--text-primary: #f9fafb;
		--text-disabled: #6b7280;
		--bg-hover: #2d2d2d;
	}
</style>
