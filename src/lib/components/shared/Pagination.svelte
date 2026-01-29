<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let currentPage: number = 1;
	export let totalPages: number = 1;
	export let totalItems: number = 0;
	export let itemsPerPage: number = 50;

	const dispatch = createEventDispatcher<{
		pageChange: { page: number };
	}>();

	$: startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
	$: endItem = Math.min(currentPage * itemsPerPage, totalItems);

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			dispatch('pageChange', { page });
		}
	}

	function handlePrevious() {
		goToPage(currentPage - 1);
	}

	function handleNext() {
		goToPage(currentPage + 1);
	}

	function handleKeydown(event: KeyboardEvent, action: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			action();
		}
	}
</script>

<nav class="pagination" aria-label="Pagination" data-testid="pagination">
	<div class="pagination-info" data-testid="pagination-info">
		{#if totalItems === 0}
			No items
		{:else}
			Showing {startItem} - {endItem} of {totalItems}
		{/if}
	</div>

	<div class="pagination-controls">
		<button
			class="pagination-btn"
			type="button"
			disabled={currentPage <= 1}
			aria-label="Previous page"
			data-testid="pagination-prev"
			on:click={handlePrevious}
			on:keydown={(e) => handleKeydown(e, handlePrevious)}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
		</button>

		<span class="page-indicator" data-testid="page-indicator">
			Page {currentPage} of {totalPages}
		</span>

		<button
			class="pagination-btn"
			type="button"
			disabled={currentPage >= totalPages}
			aria-label="Next page"
			data-testid="pagination-next"
			on:click={handleNext}
			on:keydown={(e) => handleKeydown(e, handleNext)}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="9 18 15 12 9 6"></polyline>
			</svg>
		</button>
	</div>
</nav>

<style>
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-top: 1px solid var(--border-color, #e5e7eb);
		background: var(--bg-secondary, #f9fafb);
	}

	.pagination-info {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pagination-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		color: var(--text-primary, #111827);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pagination-btn:hover:not(:disabled) {
		background: var(--bg-hover, #f3f4f6);
		border-color: var(--border-hover, #d1d5db);
	}

	.pagination-btn:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 2px;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-indicator {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		min-width: 100px;
		text-align: center;
	}

	:global(.dark) .pagination {
		--bg-primary: #0f0f0f;
		--bg-secondary: #1a1a1a;
		--bg-hover: #252525;
		--border-color: #2d2d2d;
		--border-hover: #3d3d3d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
	}
</style>
