<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import TransactionMiniList, { type MiniTransaction } from './TransactionMiniList.svelte';

	export let categoryId: string;
	export let categoryName: string;
	export let month: string; // YYYY-MM
	export let transactions: MiniTransaction[] = [];
	export let totalCount: number = 0;
	export let isLoading: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	const MAX_DISPLAY = 10;
	$: hasMore = totalCount > MAX_DISPLAY;
	$: displayedTransactions = transactions.slice(0, MAX_DISPLAY);

	/**
	 * Format month for display (e.g., "January 2025")
	 */
	function formatMonth(monthStr: string): string {
		const [year, month] = monthStr.split('-');
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}

	/**
	 * Navigate to transactions view with filters
	 */
	function handleViewAll() {
		goto(`/transactions?category=${categoryId}&month=${month}`);
	}

	/**
	 * Handle close action
	 */
	function handleClose() {
		dispatch('close');
	}

	/**
	 * Handle keyboard events
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			handleClose();
		}
	}

	// Focus trap reference
	let panelElement: HTMLElement;
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="cell-expansion"
	data-testid="cell-expansion"
	role="region"
	aria-label="Transaction details for {categoryName} in {formatMonth(month)}"
	tabindex="-1"
	bind:this={panelElement}
	transition:slide={{ duration: 200 }}
>
	<!-- Header -->
	<div class="expansion-header">
		<div class="header-info">
			<span class="category-label">{categoryName}</span>
			<span class="month-label">{formatMonth(month)}</span>
		</div>
		<button
			class="close-button"
			on:click={handleClose}
			aria-label="Close expansion"
			data-testid="close-button"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M4 4l8 8M12 4l-8 8" />
			</svg>
		</button>
	</div>

	<!-- Content -->
	<div class="expansion-content">
		{#if isLoading}
			<div class="loading-state" data-testid="loading-state">
				Loading transactions...
			</div>
		{:else}
			<TransactionMiniList transactions={displayedTransactions} maxItems={MAX_DISPLAY} />

			{#if hasMore}
				<div class="view-all-container">
					<button
						class="view-all-link"
						on:click={handleViewAll}
						data-testid="view-all-link"
					>
						View all {totalCount} transactions →
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.cell-expansion {
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		margin: 8px 16px 16px 200px; /* Left margin matches category column width */
		overflow: hidden;
	}

	.expansion-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.category-label {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
	}

	.month-label {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: 4px;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		transition: background 150ms ease, color 150ms ease;
	}

	.close-button:hover {
		background: var(--bg-hover, #e5e7eb);
		color: var(--text-primary, #111827);
	}

	.close-button:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 2px;
	}

	.expansion-content {
		max-height: 400px;
		overflow-y: auto;
	}

	.loading-state {
		padding: 24px;
		text-align: center;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.view-all-container {
		padding: 12px 16px;
		border-top: 1px solid var(--border-color, #e5e7eb);
		background: var(--bg-secondary, #f9fafb);
	}

	.view-all-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border: none;
		background: none;
		padding: 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-accent, #4f46e5);
		cursor: pointer;
		transition: color 150ms ease;
	}

	.view-all-link:hover {
		color: var(--color-accent-hover, #4338ca);
		text-decoration: underline;
	}

	.view-all-link:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 2px;
	}

	/* Dark mode */
	:global(.dark) .cell-expansion {
		--bg-primary: #0f0f0f;
		--bg-secondary: #1a1a1a;
		--bg-hover: #2d2d2d;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--color-accent: #818cf8;
		--color-accent-hover: #a5b4fc;
	}
</style>
