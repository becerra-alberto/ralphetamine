<script lang="ts">
	import type { PreviewItem } from '$lib/types/ui';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import { formatMonthDisplay } from '$lib/utils/dates';

	export let items: PreviewItem[] = [];
	export let totalAffected: number = 0;
	export let isLoading: boolean = false;
	export let maxDisplay: number = 5;

	$: displayItems = items.slice(0, maxDisplay);
	$: hasMore = items.length > maxDisplay;
	$: remainingCount = items.length - maxDisplay;

	function formatDifference(current: number, newValue: number): string {
		const diff = newValue - current;
		if (diff === 0) return 'No change';
		const sign = diff > 0 ? '+' : '';
		return `${sign}${formatCentsCurrency(diff)}`;
	}

	function getDifferenceClass(current: number, newValue: number): string {
		const diff = newValue - current;
		if (diff > 0) return 'diff-increase';
		if (diff < 0) return 'diff-decrease';
		return 'diff-neutral';
	}
</script>

<div class="preview-panel" data-testid="adjustment-preview">
	<div class="preview-header">
		<h3 class="preview-title">Preview Changes</h3>
		<span class="preview-count" data-testid="preview-count">
			{totalAffected} cell{totalAffected !== 1 ? 's' : ''} affected
		</span>
	</div>

	{#if isLoading}
		<div class="preview-loading" data-testid="preview-loading">
			<span class="loading-spinner"></span>
			<span>Calculating preview...</span>
		</div>
	{:else if displayItems.length === 0}
		<div class="preview-empty" data-testid="preview-empty">
			<p>Select categories and date range to preview changes.</p>
		</div>
	{:else}
		<div class="preview-list" data-testid="preview-list">
			<div class="preview-header-row">
				<span class="col-category">Category / Month</span>
				<span class="col-current">Current</span>
				<span class="col-new">New</span>
				<span class="col-diff">Change</span>
			</div>

			{#each displayItems as item (item.categoryId + ':' + item.month)}
				<div class="preview-row" data-testid="preview-row">
					<div class="col-category">
						<span class="category-name">{item.categoryName}</span>
						<span class="month-label">{formatMonthDisplay(item.month)}</span>
					</div>
					<span class="col-current">{formatCentsCurrency(item.currentCents)}</span>
					<span class="col-new">{formatCentsCurrency(item.newCents)}</span>
					<span class="col-diff {getDifferenceClass(item.currentCents, item.newCents)}">
						{formatDifference(item.currentCents, item.newCents)}
					</span>
				</div>
			{/each}

			{#if hasMore}
				<div class="preview-more" data-testid="preview-more">
					...and {remainingCount} more
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.preview-panel {
		background: var(--bg-secondary, #f8f9fa);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		padding: 16px;
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.preview-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.preview-count {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		background: var(--bg-badge, #e5e7eb);
		padding: 2px 8px;
		border-radius: 9999px;
	}

	.preview-loading {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		padding: 12px 0;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color, #e5e7eb);
		border-top-color: var(--color-accent, #4f46e5);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.preview-empty {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		padding: 12px 0;
		text-align: center;
	}

	.preview-empty p {
		margin: 0;
	}

	.preview-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.preview-header-row {
		display: grid;
		grid-template-columns: 1fr 80px 80px 80px;
		gap: 8px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		text-transform: uppercase;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.preview-row {
		display: grid;
		grid-template-columns: 1fr 80px 80px 80px;
		gap: 8px;
		font-size: 0.875rem;
		padding: 8px 0;
		border-bottom: 1px solid var(--border-light, #f3f4f6);
	}

	.preview-row:last-child {
		border-bottom: none;
	}

	.col-category {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.category-name {
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.month-label {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.col-current,
	.col-new,
	.col-diff {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.col-current {
		color: var(--text-secondary, #6b7280);
	}

	.col-new {
		color: var(--text-primary, #111827);
		font-weight: 500;
	}

	.diff-increase {
		color: var(--color-success, #10b981);
	}

	.diff-decrease {
		color: var(--color-danger, #ef4444);
	}

	.diff-neutral {
		color: var(--text-secondary, #6b7280);
	}

	.preview-more {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		padding: 8px 0;
		text-align: center;
		font-style: italic;
	}

	/* Dark mode */
	:global(.dark) .preview-panel {
		--bg-secondary: #1f1f1f;
		--border-color: #2d2d2d;
		--border-light: #252525;
		--bg-badge: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
	}
</style>
