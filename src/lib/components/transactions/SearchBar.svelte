<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';

	export let value: string = '';
	export let totalCount: number = 0;
	export let filteredCount: number = 0;
	export let placeholder: string = 'Search transactions...';
	export let minChars: number = 2;
	export let debounceMs: number = 150;

	const dispatch = createEventDispatcher<{
		search: { query: string };
		clear: void;
	}>();

	let inputElement: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Show count when filtering is active (query >= minChars)
	$: isFiltering = value.length >= minChars;
	$: showClearButton = value.length > 0;

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;

		// Clear any existing debounce timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Only emit search if query meets minimum length
		if (value.length >= minChars) {
			debounceTimer = setTimeout(() => {
				dispatch('search', { query: value });
			}, debounceMs);
		} else if (value.length === 0) {
			// Immediately clear when input is empty
			dispatch('clear');
		}
	}

	function handleClear() {
		value = '';
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		dispatch('clear');
		inputElement?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && value.length > 0) {
			event.preventDefault();
			handleClear();
		}
	}

	// Handle Cmd+F shortcut
	function handleGlobalKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
			event.preventDefault();
			focus();
		}
	}

	export function focus() {
		inputElement?.focus();
		inputElement?.select();
	}

	onMount(() => {
		document.addEventListener('keydown', handleGlobalKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleGlobalKeydown);
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	});
</script>

<div class="search-bar" data-testid="search-bar">
	<div class="search-input-wrapper">
		<svg
			class="search-icon"
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.35-4.35"></path>
		</svg>

		<input
			bind:this={inputElement}
			type="text"
			class="search-input"
			{placeholder}
			{value}
			on:input={handleInput}
			on:keydown={handleKeydown}
			aria-label="Search transactions"
			data-testid="search-input"
		/>

		{#if showClearButton}
			<button
				type="button"
				class="clear-button"
				on:click={handleClear}
				aria-label="Clear search"
				data-testid="search-clear-button"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18"></path>
					<path d="m6 6 12 12"></path>
				</svg>
			</button>
		{/if}
	</div>

	{#if isFiltering}
		<span class="search-count" data-testid="search-count">
			Showing {filteredCount} of {totalCount} transactions
		</span>
	{/if}
</div>

<style>
	.search-bar {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 280px;
	}

	.search-icon {
		position: absolute;
		left: 10px;
		color: var(--text-secondary, #6b7280);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		height: 36px;
		padding: 0 32px 0 36px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.search-input::placeholder {
		color: var(--text-tertiary, #9ca3af);
	}

	.search-input:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}

	.clear-button {
		position: absolute;
		right: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.clear-button:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.clear-button:focus {
		outline: 2px solid var(--accent, #4f46e5);
		outline-offset: 1px;
	}

	.search-count {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		white-space: nowrap;
	}

	/* Dark mode */
	:global(.dark) .search-input {
		background: var(--bg-secondary, #1a1a1a);
		border-color: var(--border-color, #374151);
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .search-input:focus {
		border-color: var(--accent, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
	}

	:global(.dark) .clear-button:hover {
		background: var(--bg-hover, #374151);
	}
</style>
