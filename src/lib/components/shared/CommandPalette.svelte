<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import CommandList from './CommandList.svelte';
	import type { Command } from '../../stores/commands';
	import { fuzzySearch } from '../../utils/fuzzySearch';

	export let open: boolean = false;
	export let commands: Command[] = [];
	export let testId: string = 'command-palette';

	const dispatch = createEventDispatcher<{
		close: void;
		execute: { command: Command };
	}>();

	let searchQuery: string = '';
	let highlightedIndex: number = 0;
	let inputElement: HTMLInputElement | null = null;
	let paletteElement: HTMLElement | null = null;
	let previousActiveElement: HTMLElement | null = null;

	$: filteredCommands = fuzzySearch(commands, searchQuery, (c) => c.label).map((r) => r.item);

	$: if (searchQuery !== undefined) {
		highlightedIndex = 0;
	}

	$: if (open) {
		previousActiveElement = document.activeElement as HTMLElement;
		searchQuery = '';
		highlightedIndex = 0;
		setTimeout(() => {
			inputElement?.focus();
		}, 0);
	}

	$: if (!open && previousActiveElement) {
		previousActiveElement.focus();
		previousActiveElement = null;
	}

	function handleClose() {
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleSelect(event: CustomEvent<{ command: Command }>) {
		executeCommand(event.detail.command);
	}

	function executeCommand(command: Command) {
		dispatch('execute', { command });
		handleClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				event.stopPropagation();
				handleClose();
				break;
			case 'ArrowDown':
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredCommands.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, 0);
				break;
			case 'Enter':
				event.preventDefault();
				if (filteredCommands.length > 0 && highlightedIndex < filteredCommands.length) {
					executeCommand(filteredCommands[highlightedIndex]);
				}
				break;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<div
		class="palette-backdrop"
		role="presentation"
		data-testid="{testId}-backdrop"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 100 }}
	>
		<div
			bind:this={paletteElement}
			class="palette"
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			data-testid={testId}
			transition:scale={{ duration: 100, start: 0.95 }}
		>
			<div class="palette-search" data-testid="{testId}-search">
				<svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path
						d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
						fill="currentColor"
					/>
				</svg>
				<input
					bind:this={inputElement}
					bind:value={searchQuery}
					type="text"
					class="search-input"
					placeholder="Type a command..."
					data-testid="{testId}-input"
					autocomplete="off"
					spellcheck="false"
				/>
			</div>

			<div class="palette-commands">
				<CommandList
					commands={filteredCommands}
					{highlightedIndex}
					testId="{testId}-list"
					on:select={handleSelect}
				/>
			</div>

			<div class="palette-footer" data-testid="{testId}-footer">
				<span class="footer-hint">
					<kbd>↑↓</kbd> navigate
					<kbd>↵</kbd> select
					<kbd>esc</kbd> close
				</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.palette-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1300;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 20vh;
		background: rgba(0, 0, 0, 0.5);
	}

	.palette {
		background: var(--bg-primary, #ffffff);
		border-radius: 12px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 560px;
		width: 100%;
		overflow: hidden;
	}

	.palette-search {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.search-icon {
		flex-shrink: 0;
		color: var(--text-secondary, #6b7280);
	}

	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		font-size: 1rem;
		font-family: inherit;
		color: var(--text-primary, #111827);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--text-secondary, #6b7280);
	}

	.palette-footer {
		padding: 8px 16px;
		border-top: 1px solid var(--border-color, #e5e7eb);
		text-align: center;
	}

	.footer-hint {
		font-size: 0.6875rem;
		color: var(--text-secondary, #6b7280);
	}

	.footer-hint kbd {
		display: inline-block;
		padding: 1px 4px;
		font-size: 0.625rem;
		font-weight: 600;
		font-family: inherit;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 3px;
		margin: 0 2px;
	}

	/* Dark mode */
	:global(.dark) .palette {
		background: var(--bg-primary, #0f0f0f);
	}

	:global(.dark) .palette-search {
		border-color: #2d2d2d;
	}

	:global(.dark) .search-input {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .palette-footer {
		border-color: #2d2d2d;
	}

	:global(.dark) .footer-hint kbd {
		background: #1a1a1a;
		border-color: #2d2d2d;
	}
</style>
