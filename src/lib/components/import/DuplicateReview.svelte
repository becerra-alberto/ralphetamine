<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DuplicateMatch } from '$lib/utils/duplicateDetection';
	import { formatCentsCurrency } from '$lib/utils/currency';

	export let duplicates: DuplicateMatch[];
	export let testId: string = 'duplicate-review';

	const dispatch = createEventDispatcher<{
		toggle: { importIndex: number; include: boolean };
	}>();

	function handleToggle(dup: DuplicateMatch) {
		dispatch('toggle', {
			importIndex: dup.importIndex,
			include: !dup.include
		});
	}

	function formatAmount(cents: number): string {
		return formatCentsCurrency(cents);
	}
</script>

<div class="duplicate-review" data-testid={testId}>
	<h3 class="review-title" data-testid="{testId}-title">
		Review {duplicates.length} potential duplicate{duplicates.length === 1 ? '' : 's'}
	</h3>

	{#each duplicates as dup, idx}
		<div
			class="duplicate-card"
			class:included={dup.include}
			data-testid="{testId}-item-{idx}"
		>
			<div class="duplicate-header">
				<label class="duplicate-checkbox">
					<input
						type="checkbox"
						checked={dup.include}
						on:change={() => handleToggle(dup)}
						data-testid="{testId}-item-{idx}-checkbox"
					/>
					<span class="checkbox-label">
						{dup.include ? 'Import this transaction' : 'Skip this transaction'}
					</span>
				</label>
				<span class="confidence-badge" class:exact={dup.confidence === 'exact'} data-testid="{testId}-item-{idx}-confidence">
					{dup.confidence === 'exact' ? 'Exact match' : 'Likely match'}
				</span>
			</div>

			<div class="comparison">
				<div class="comparison-col">
					<span class="col-label">Import</span>
					<div class="tx-detail">
						<span class="tx-date">{dup.imported.date}</span>
						<span class="tx-payee">{dup.imported.payee}</span>
						<span class="tx-amount">{formatAmount(dup.imported.amountCents)}</span>
					</div>
				</div>
				<div class="comparison-divider">
					<span class="vs-text">vs</span>
				</div>
				<div class="comparison-col">
					<span class="col-label">Existing</span>
					<div class="tx-detail">
						<span class="tx-date">{dup.existing.date}</span>
						<span class="tx-payee">{dup.existing.payee}</span>
						<span class="tx-amount">{formatAmount(dup.existing.amountCents)}</span>
					</div>
				</div>
			</div>

			<p class="duplicate-hint">These look like the same transaction</p>
		</div>
	{/each}
</div>

<style>
	.duplicate-review {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.review-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.duplicate-card {
		padding: 12px;
		border: 1px solid var(--color-warning, #f59e0b);
		border-radius: 8px;
		background: rgba(245, 158, 11, 0.04);
	}

	.duplicate-card.included {
		border-color: var(--accent, #4f46e5);
		background: rgba(79, 70, 229, 0.04);
	}

	.duplicate-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}

	.duplicate-checkbox {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	.duplicate-checkbox input {
		width: 16px;
		height: 16px;
		accent-color: var(--accent, #4f46e5);
	}

	.checkbox-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.confidence-badge {
		font-size: 0.6875rem;
		padding: 2px 8px;
		border-radius: 10px;
		background: rgba(245, 158, 11, 0.15);
		color: var(--color-warning, #d97706);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.confidence-badge.exact {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-danger, #ef4444);
	}

	.comparison {
		display: flex;
		align-items: stretch;
		gap: 8px;
	}

	.comparison-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.col-label {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		font-weight: 600;
	}

	.comparison-divider {
		display: flex;
		align-items: center;
		padding: 0 4px;
	}

	.vs-text {
		font-size: 0.6875rem;
		color: var(--text-secondary, #9ca3af);
		font-weight: 500;
	}

	.tx-detail {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 8px;
		background: var(--bg-primary, #ffffff);
		border-radius: 6px;
		border: 1px solid var(--border-color, #e5e7eb);
	}

	.tx-date {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.tx-payee {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.tx-amount {
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary, #111827);
	}

	.duplicate-hint {
		margin: 8px 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary, #9ca3af);
		font-style: italic;
	}

	/* Dark mode */
	:global(.dark) .review-title {
		color: #f9fafb;
	}

	:global(.dark) .checkbox-label {
		color: #f9fafb;
	}

	:global(.dark) .tx-detail {
		background: #0f0f0f;
		border-color: #374151;
	}

	:global(.dark) .tx-payee,
	:global(.dark) .tx-amount {
		color: #f9fafb;
	}
</style>
