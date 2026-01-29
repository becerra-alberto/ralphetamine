<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let status: 'idle' | 'importing' | 'success' | 'error' = 'idle';
	export let imported: number = 0;
	export let skipped: number = 0;
	export let total: number = 0;
	export let errorMessage: string = '';
	export let testId: string = 'import-progress';

	const dispatch = createEventDispatcher<{
		close: void;
		retry: void;
	}>();

	$: progress = total > 0 ? Math.round((imported / total) * 100) : 0;
</script>

<div class="import-progress" data-testid={testId}>
	{#if status === 'importing'}
		<div class="progress-state" data-testid="{testId}-importing">
			<div class="spinner" data-testid="{testId}-spinner"></div>
			<h3 class="progress-title">Importing transactions...</h3>
			<div class="progress-bar-wrapper">
				<div class="progress-bar" style="width: {progress}%" data-testid="{testId}-bar"></div>
			</div>
			<p class="progress-detail" data-testid="{testId}-detail">
				{imported} of {total} imported
			</p>
		</div>
	{:else if status === 'success'}
		<div class="success-state" data-testid="{testId}-success">
			<div class="success-icon">
				<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
					<circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2" />
					<path d="M13 20l4 4 10-10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</div>
			<h3 class="success-title" data-testid="{testId}-success-title">Import complete!</h3>
			<p class="success-detail" data-testid="{testId}-success-detail">
				Imported {imported} transaction{imported === 1 ? '' : 's'}
				{#if skipped > 0}
					<span class="skipped-info">({skipped} duplicate{skipped === 1 ? '' : 's'} skipped)</span>
				{/if}
			</p>
			<button
				class="btn-done"
				data-testid="{testId}-done"
				on:click={() => dispatch('close')}
			>
				Done
			</button>
		</div>
	{:else if status === 'error'}
		<div class="error-state" data-testid="{testId}-error">
			<div class="error-icon">
				<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
					<circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="2" />
					<path d="M15 15l10 10M25 15l-10 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
				</svg>
			</div>
			<h3 class="error-title" data-testid="{testId}-error-title">Import failed</h3>
			<p class="error-detail" data-testid="{testId}-error-message">{errorMessage}</p>
			<div class="error-actions">
				<button
					class="btn-retry"
					data-testid="{testId}-retry"
					on:click={() => dispatch('retry')}
				>
					Retry
				</button>
				<button
					class="btn-cancel"
					data-testid="{testId}-cancel"
					on:click={() => dispatch('close')}
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.import-progress {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px;
		text-align: center;
	}

	.progress-state,
	.success-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		width: 100%;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-color, #e5e7eb);
		border-top-color: var(--accent, #4f46e5);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.progress-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.progress-bar-wrapper {
		width: 100%;
		height: 6px;
		background: var(--border-color, #e5e7eb);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: var(--accent, #4f46e5);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-detail {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
	}

	.success-icon {
		color: var(--color-success, #10b981);
	}

	.success-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.success-detail {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.skipped-info {
		color: var(--text-secondary, #9ca3af);
	}

	.btn-done {
		margin-top: 8px;
		padding: 8px 24px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-done:hover {
		opacity: 0.9;
	}

	.error-icon {
		color: var(--color-danger, #ef4444);
	}

	.error-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-danger, #ef4444);
	}

	.error-detail {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.error-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.btn-retry {
		padding: 8px 20px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-cancel {
		padding: 8px 20px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		cursor: pointer;
	}

	/* Dark mode */
	:global(.dark) .progress-title,
	:global(.dark) .success-title {
		color: #f9fafb;
	}

	:global(.dark) .spinner {
		border-color: #374151;
		border-top-color: var(--accent, #4f46e5);
	}

	:global(.dark) .progress-bar-wrapper {
		background: #374151;
	}

	:global(.dark) .btn-cancel {
		border-color: #374151;
		color: #f9fafb;
	}
</style>
