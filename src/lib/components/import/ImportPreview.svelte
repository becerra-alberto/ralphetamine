<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PreviewTransaction } from '$lib/utils/columnDetection';
	import type { DuplicateCheckResult, ImportSummary } from '$lib/utils/duplicateDetection';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import DuplicateReview from './DuplicateReview.svelte';

	export let transactions: PreviewTransaction[];
	export let summary: ImportSummary;
	export let duplicateResult: DuplicateCheckResult;
	export let testId: string = 'import-preview';

	const dispatch = createEventDispatcher<{
		duplicateOptionChange: { option: 'skip' | 'import-all' | 'review' };
		duplicateToggle: { importIndex: number; include: boolean };
		import: void;
	}>();

	let duplicateOption: 'skip' | 'import-all' | 'review' = 'skip';
	let maxVisible = 10;

	$: visibleTransactions = transactions.slice(0, maxVisible);
	$: hasMore = transactions.length > maxVisible;
	$: hasDuplicates = duplicateResult.duplicates.length > 0;
	$: duplicateIndices = new Set(duplicateResult.duplicates.map((d) => d.importIndex));

	function handleDuplicateOptionChange(option: 'skip' | 'import-all' | 'review') {
		duplicateOption = option;
		dispatch('duplicateOptionChange', { option });
	}

	function handleDuplicateToggle(event: CustomEvent<{ importIndex: number; include: boolean }>) {
		dispatch('duplicateToggle', event.detail);
	}

	function handleShowMore() {
		maxVisible += 10;
	}

	function formatAmount(cents: number): string {
		return formatCentsCurrency(cents);
	}
</script>

<div class="import-preview" data-testid={testId}>
	<div class="step-intro">
		<h2 class="step-title" data-testid="{testId}-title">Review Import</h2>
		<p class="step-subtitle" data-testid="{testId}-subtitle">Check your transactions before importing</p>
	</div>

	<!-- Summary -->
	<div class="import-summary" data-testid="{testId}-summary">
		<div class="summary-item">
			<span class="summary-label">Total transactions</span>
			<span class="summary-value" data-testid="{testId}-total">{summary.totalTransactions}</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Potential duplicates</span>
			<span class="summary-value" class:has-duplicates={summary.duplicatesFound > 0} data-testid="{testId}-duplicates">
				{summary.duplicatesFound}
			</span>
		</div>
		{#if summary.dateRange}
			<div class="summary-item">
				<span class="summary-label">Date range</span>
				<span class="summary-value" data-testid="{testId}-date-range">
					{summary.dateRange.earliest} to {summary.dateRange.latest}
				</span>
			</div>
		{/if}
		<div class="summary-item">
			<span class="summary-label">To import</span>
			<span class="summary-value summary-import-count" data-testid="{testId}-to-import">{summary.toImport}</span>
		</div>
	</div>

	<!-- Duplicate Options -->
	{#if hasDuplicates}
		<div class="duplicate-options" data-testid="{testId}-duplicate-options">
			<h3 class="options-title">Duplicate handling</h3>
			<label class="option-label" data-testid="{testId}-option-skip">
				<input
					type="radio"
					name="duplicate-option"
					value="skip"
					checked={duplicateOption === 'skip'}
					on:change={() => handleDuplicateOptionChange('skip')}
				/>
				<span>Skip duplicates <span class="option-hint">(default)</span></span>
			</label>
			<label class="option-label" data-testid="{testId}-option-import-all">
				<input
					type="radio"
					name="duplicate-option"
					value="import-all"
					on:change={() => handleDuplicateOptionChange('import-all')}
				/>
				<span>Import all (including potential duplicates)</span>
			</label>
			<label class="option-label" data-testid="{testId}-option-review">
				<input
					type="radio"
					name="duplicate-option"
					value="review"
					on:change={() => handleDuplicateOptionChange('review')}
				/>
				<span>Review each duplicate</span>
			</label>
		</div>
	{/if}

	<!-- Duplicate Review (when "review" option selected) -->
	{#if hasDuplicates && duplicateOption === 'review'}
		<DuplicateReview
			duplicates={duplicateResult.duplicates}
			testId="{testId}-duplicate-review"
			on:toggle={handleDuplicateToggle}
		/>
	{/if}

	<!-- Transaction Preview Table -->
	<div class="preview-section">
		<h3 class="section-title" data-testid="{testId}-table-title">
			Showing {Math.min(maxVisible, transactions.length)} of {transactions.length} transactions
		</h3>
		<div class="table-wrapper">
			<table class="preview-table" data-testid="{testId}-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Payee</th>
						<th class="amount-header">Amount</th>
						<th>Category</th>
					</tr>
				</thead>
				<tbody>
					{#each visibleTransactions as tx, idx}
						<tr
							class:is-duplicate={duplicateIndices.has(idx)}
							data-testid="{testId}-row-{idx}"
						>
							<td>{tx.date}</td>
							<td class="payee-cell">{tx.payee}</td>
							<td
								class="amount-cell"
								class:amount-positive={tx.amountCents > 0}
								class:amount-negative={tx.amountCents < 0}
							>
								{formatAmount(tx.amountCents)}
							</td>
							<td class="category-cell">{tx.category || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if hasMore}
			<button
				class="show-more"
				data-testid="{testId}-show-more"
				on:click={handleShowMore}
			>
				Show more
			</button>
		{/if}
	</div>
</div>

<style>
	.import-preview {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.step-intro {
		text-align: center;
	}

	.step-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.step-subtitle {
		margin: 4px 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.import-summary {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding: 12px;
		background: var(--bg-secondary, #f9fafb);
		border-radius: 8px;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.summary-label {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.summary-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.summary-value.has-duplicates {
		color: var(--color-warning, #f59e0b);
	}

	.summary-import-count {
		color: var(--accent, #4f46e5);
	}

	.duplicate-options {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
	}

	.options-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.option-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8125rem;
		color: var(--text-primary, #111827);
		cursor: pointer;
	}

	.option-hint {
		color: var(--text-secondary, #6b7280);
		font-size: 0.75rem;
	}

	.preview-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
	}

	.table-wrapper {
		overflow-x: auto;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		max-height: 300px;
		overflow-y: auto;
	}

	.preview-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.preview-table th {
		padding: 8px 12px;
		text-align: left;
		background: var(--bg-secondary, #f9fafb);
		color: var(--text-secondary, #6b7280);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		white-space: nowrap;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.preview-table td {
		padding: 8px 12px;
		color: var(--text-primary, #111827);
		border-bottom: 1px solid var(--border-color, #f3f4f6);
	}

	.preview-table tbody tr:last-child td {
		border-bottom: none;
	}

	.preview-table tr.is-duplicate {
		background: rgba(245, 158, 11, 0.06);
	}

	.payee-cell {
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.amount-header {
		text-align: right;
	}

	.amount-cell {
		text-align: right;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.amount-positive {
		color: var(--color-success, #10b981);
	}

	.amount-negative {
		color: var(--color-danger, #ef4444);
	}

	.category-cell {
		color: var(--text-secondary, #6b7280);
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.show-more {
		align-self: center;
		padding: 6px 16px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.show-more:hover {
		background: var(--bg-secondary, #f9fafb);
	}

	/* Dark mode */
	:global(.dark) .step-title,
	:global(.dark) .options-title {
		color: #f9fafb;
	}

	:global(.dark) .import-summary {
		background: #1a1a1a;
	}

	:global(.dark) .summary-value {
		color: #f9fafb;
	}

	:global(.dark) .duplicate-options {
		border-color: #374151;
	}

	:global(.dark) .option-label {
		color: #f9fafb;
	}

	:global(.dark) .table-wrapper {
		border-color: #374151;
	}

	:global(.dark) .preview-table th {
		background: #1a1a1a;
		border-color: #374151;
		color: #9ca3af;
	}

	:global(.dark) .preview-table td {
		color: #f9fafb;
		border-color: #2d2d2d;
	}

	:global(.dark) .show-more {
		border-color: #374151;
		color: #f9fafb;
	}
</style>
