<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CommandItem from './CommandItem.svelte';
	import type { Command } from '../../stores/commands';

	export let commands: Command[] = [];
	export let highlightedIndex: number = 0;
	export let testId: string = 'command-list';

	const dispatch = createEventDispatcher<{
		select: { command: Command };
	}>();

	function handleSelect(command: Command) {
		dispatch('select', { command });
	}

	$: navigationCommands = commands.filter((c) => c.group === 'navigation');
	$: actionCommands = commands.filter((c) => c.group === 'action');
</script>

<div class="command-list" data-testid={testId} role="listbox" aria-label="Commands">
	{#if navigationCommands.length > 0}
		<div class="command-group" data-testid="{testId}-navigation">
			<span class="group-label" data-testid="{testId}-navigation-label">Navigation</span>
			{#each navigationCommands as command, i}
				<CommandItem
					label={command.label}
					shortcut={command.shortcut || ''}
					highlighted={commands.indexOf(command) === highlightedIndex}
					testId="{testId}-item-{command.id}"
					on:select={() => handleSelect(command)}
				/>
			{/each}
		</div>
	{/if}

	{#if actionCommands.length > 0}
		<div class="command-group" data-testid="{testId}-actions">
			<span class="group-label" data-testid="{testId}-actions-label">Actions</span>
			{#each actionCommands as command}
				<CommandItem
					label={command.label}
					shortcut={command.shortcut || ''}
					highlighted={commands.indexOf(command) === highlightedIndex}
					testId="{testId}-item-{command.id}"
					on:select={() => handleSelect(command)}
				/>
			{/each}
		</div>
	{/if}

	{#if commands.length === 0}
		<div class="no-results" data-testid="{testId}-empty">
			<p class="no-results-text">No matching commands</p>
		</div>
	{/if}
</div>

<style>
	.command-list {
		display: flex;
		flex-direction: column;
		max-height: 320px;
		overflow-y: auto;
	}

	.command-group {
		display: flex;
		flex-direction: column;
	}

	.command-group + .command-group {
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.group-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		padding: 8px 16px 4px;
	}

	.no-results {
		padding: 24px 16px;
		text-align: center;
	}

	.no-results-text {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	/* Dark mode */
	:global(.dark) .command-group + .command-group {
		border-color: #2d2d2d;
	}
</style>
