<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let importedCount: number = 0;
	export let skippedCount: number = 0;
	export let uncategorizedCount: number = 0;
	export let testId: string = 'import-complete';

	const dispatch = createEventDispatcher<{
		categorizeNow: void;
		done: void;
	}>();
</script>

<div class="import-complete" data-testid={testId}>
	<div class="success-icon">
		<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
			<circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2" />
			<path d="M15 24l6 6 12-12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</div>

	<h3 class="complete-title" data-testid="{testId}-title">
		Imported {importedCount} transaction{importedCount === 1 ? '' : 's'}
	</h3>

	{#if skippedCount > 0}
		<p class="skipped-text" data-testid="{testId}-skipped">
			{skippedCount} duplicate{skippedCount === 1 ? '' : 's'} skipped
		</p>
	{/if}

	{#if uncategorizedCount > 0}
		<p class="uncategorized-text" data-testid="{testId}-uncategorized">
			{uncategorizedCount} transaction{uncategorizedCount === 1 ? '' : 's'} need{uncategorizedCount === 1 ? 's' : ''} categorization
		</p>
	{/if}

	<div class="complete-actions">
		{#if uncategorizedCount > 0}
			<button
				class="btn-categorize"
				data-testid="{testId}-categorize-btn"
				on:click={() => dispatch('categorizeNow')}
			>
				Categorize now
			</button>
		{/if}
		<button
			class="btn-done"
			class:btn-done--primary={uncategorizedCount === 0}
			data-testid="{testId}-done-btn"
			on:click={() => dispatch('done')}
		>
			Done
		</button>
	</div>
</div>

<style>
	.import-complete {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px;
		text-align: center;
		gap: 8px;
	}

	.success-icon {
		color: var(--color-success, #10b981);
		margin-bottom: 4px;
	}

	.complete-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.skipped-text {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary, #9ca3af);
	}

	.uncategorized-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-warning, #f59e0b);
		font-weight: 500;
	}

	.complete-actions {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}

	.btn-categorize {
		padding: 8px 20px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-categorize:hover {
		opacity: 0.9;
	}

	.btn-done {
		padding: 8px 20px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.btn-done--primary {
		background: var(--accent, #4f46e5);
		color: white;
		border-color: var(--accent, #4f46e5);
	}

	.btn-done:hover {
		opacity: 0.9;
	}

	/* Dark mode */
	:global(.dark) .complete-title {
		color: #f9fafb;
	}

	:global(.dark) .btn-done:not(.btn-done--primary) {
		border-color: #374151;
		color: #f9fafb;
	}
</style>
