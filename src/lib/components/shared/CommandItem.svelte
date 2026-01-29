<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let label: string;
	export let shortcut: string = '';
	export let highlighted: boolean = false;
	export let testId: string = 'command-item';

	const dispatch = createEventDispatcher<{
		select: void;
	}>();

	function handleClick() {
		dispatch('select');
	}
</script>

<button
	class="command-item"
	class:highlighted
	data-testid={testId}
	on:click={handleClick}
	role="option"
	aria-selected={highlighted}
>
	<span class="command-label" data-testid="{testId}-label">{label}</span>
	{#if shortcut}
		<kbd class="command-shortcut" data-testid="{testId}-shortcut">{shortcut}</kbd>
	{/if}
</button>

<style>
	.command-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 10px 16px;
		border: none;
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.1s ease;
		text-align: left;
	}

	.command-item:hover,
	.command-item.highlighted {
		background: var(--accent, #4f46e5);
	}

	.command-item:hover .command-label,
	.command-item.highlighted .command-label {
		color: white;
	}

	.command-item:hover .command-shortcut,
	.command-item.highlighted .command-shortcut {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.command-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.command-shortcut {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-secondary, #6b7280);
		font-family: inherit;
	}

	/* Dark mode */
	:global(.dark) .command-label {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .command-shortcut {
		background: #0f0f0f;
		border-color: #2d2d2d;
		color: #9ca3af;
	}
</style>
