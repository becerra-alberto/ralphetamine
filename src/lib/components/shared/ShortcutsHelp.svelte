<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let open: boolean = false;
	export let testId: string = 'shortcuts-help';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	const shortcutGroups = [
		{
			label: 'Navigation',
			shortcuts: [
				{ keys: '⌘1', description: 'Go to Home' },
				{ keys: '⌘2', description: 'Go to Budget' },
				{ keys: '⌘3', description: 'Go to Transactions' },
				{ keys: '⌘4', description: 'Go to Net Worth' },
				{ keys: '⌘U', description: 'Go to Budget' },
				{ keys: '⌘T', description: 'Go to Transactions' },
				{ keys: '⌘W', description: 'Go to Net Worth' }
			]
		},
		{
			label: 'Actions',
			shortcuts: [
				{ keys: '⌘K', description: 'Command palette' },
				{ keys: '⌘N', description: 'New transaction' },
				{ keys: '⌘F', description: 'Focus search' },
				{ keys: '⌘S', description: 'Save changes' },
				{ keys: '⌘⇧B', description: 'Adjust budgets' }
			]
		},
		{
			label: 'General',
			shortcuts: [
				{ keys: 'Esc', description: 'Close modal / Cancel' },
				{ keys: 'Enter', description: 'Confirm / Submit' },
				{ keys: 'Tab', description: 'Next field' },
				{ keys: '⇧Tab', description: 'Previous field' },
				{ keys: '⌘?', description: 'Show this help' }
			]
		}
	];

	function handleClose() {
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			handleClose();
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
		class="help-backdrop"
		role="presentation"
		data-testid="{testId}-backdrop"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 100 }}
	>
		<div
			class="help-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Keyboard shortcuts"
			data-testid={testId}
			transition:scale={{ duration: 100, start: 0.95 }}
		>
			<header class="help-header">
				<h2 class="help-title" data-testid="{testId}-title">Keyboard Shortcuts</h2>
				<button
					class="help-close"
					aria-label="Close shortcuts help"
					data-testid="{testId}-close"
					on:click={handleClose}
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</header>

			<div class="help-body" data-testid="{testId}-body">
				{#each shortcutGroups as group}
					<div class="shortcut-group" data-testid="{testId}-group-{group.label.toLowerCase()}">
						<h3 class="group-label">{group.label}</h3>
						<div class="shortcut-list">
							{#each group.shortcuts as shortcut}
								<div class="shortcut-row">
									<kbd class="shortcut-key">{shortcut.keys}</kbd>
									<span class="shortcut-desc">{shortcut.description}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.help-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1400;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		padding: 16px;
	}

	.help-panel {
		background: var(--bg-primary, #ffffff);
		border-radius: 12px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 480px;
		width: 100%;
		max-height: calc(100vh - 32px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.help-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.help-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.help-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
	}

	.help-close:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.help-body {
		padding: 16px 20px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.group-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0 0 8px;
	}

	.shortcut-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 0;
	}

	.shortcut-key {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 4px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-primary, #111827);
		font-family: inherit;
	}

	.shortcut-desc {
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
	}

	/* Dark mode */
	:global(.dark) .help-panel {
		background: var(--bg-primary, #0f0f0f);
	}

	:global(.dark) .help-header {
		border-color: #2d2d2d;
	}

	:global(.dark) .help-title {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .shortcut-key {
		background: #1a1a1a;
		border-color: #2d2d2d;
		color: #f9fafb;
	}

	:global(.dark) .shortcut-desc {
		color: #f9fafb;
	}
</style>
