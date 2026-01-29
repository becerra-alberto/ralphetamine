<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let testId = 'quick-shortcuts';

	const dispatch = createEventDispatcher<{
		navigate: { path: string };
	}>();

	const shortcuts = [
		{ key: '⌘T', label: 'Transactions', path: '/transactions' },
		{ key: '⌘U', label: 'Budget', path: '/budget' },
		{ key: '⌘W', label: 'Net Worth', path: '/net-worth' }
	];

	function handleClick(path: string) {
		dispatch('navigate', { path });
	}
</script>

<div class="quick-shortcuts" data-testid={testId}>
	<span class="shortcuts-label" data-testid="{testId}-label">Quick shortcuts</span>
	<div class="shortcuts-list">
		{#each shortcuts as shortcut}
			<button
				class="shortcut-item"
				data-testid="{testId}-item-{shortcut.path.slice(1)}"
				on:click={() => handleClick(shortcut.path)}
			>
				<kbd class="shortcut-key">{shortcut.key}</kbd>
				<span class="shortcut-name">{shortcut.label}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.quick-shortcuts {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.shortcuts-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
	}

	.shortcuts-list {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.shortcut-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 8px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease;
		font-family: inherit;
	}

	.shortcut-item:hover {
		background: var(--accent, #4f46e5);
		border-color: var(--accent, #4f46e5);
	}

	.shortcut-item:hover .shortcut-key,
	.shortcut-item:hover .shortcut-name {
		color: white;
	}

	.shortcut-key {
		font-size: 0.75rem;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-primary, #111827);
		font-family: inherit;
	}

	.shortcut-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	/* Dark mode */
	:global(.dark) .shortcut-item {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
	}

	:global(.dark) .shortcut-key {
		background: var(--bg-primary, #0f0f0f);
		border-color: #2d2d2d;
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .shortcut-name {
		color: var(--text-primary, #f9fafb);
	}
</style>
