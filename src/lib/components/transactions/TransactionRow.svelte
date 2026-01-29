<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Transaction } from '$lib/types/transaction';
	import { formatCentsCurrency } from '$lib/utils/currency';

	export let transaction: Transaction;
	export let categoryName: string | null = null;
	export let accountName: string = 'Unknown';
	export let isExpanded: boolean = false;

	const dispatch = createEventDispatcher<{
		click: { id: string };
		expand: { id: string };
	}>();

	$: isInflow = transaction.amountCents > 0;
	$: isOutflow = transaction.amountCents < 0;

	$: outflowDisplay = isOutflow
		? formatCentsCurrency(Math.abs(transaction.amountCents))
		: '-';
	$: inflowDisplay = isInflow
		? formatCentsCurrency(transaction.amountCents)
		: '-';

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function handleClick() {
		dispatch('click', { id: transaction.id });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			dispatch('expand', { id: transaction.id });
		}
	}
</script>

<tr
	class="transaction-row"
	class:expanded={isExpanded}
	data-testid="transaction-row"
	data-id={transaction.id}
	tabindex="0"
	on:click={handleClick}
	on:keydown={handleKeydown}
>
	<td class="cell cell-date" data-testid="cell-date">
		{formatDate(transaction.date)}
	</td>
	<td class="cell cell-payee" data-testid="cell-payee">
		{transaction.payee}
	</td>
	<td class="cell cell-category" data-testid="cell-category">
		{categoryName || '-'}
	</td>
	<td class="cell cell-memo" data-testid="cell-memo">
		{transaction.memo || '-'}
	</td>
	<td class="cell cell-outflow" class:has-value={isOutflow} data-testid="cell-outflow">
		{outflowDisplay}
	</td>
	<td class="cell cell-inflow" class:has-value={isInflow && transaction.amountCents !== 0} data-testid="cell-inflow">
		{inflowDisplay}
	</td>
	<td class="cell cell-account" data-testid="cell-account">
		{accountName}
	</td>
	<td class="cell cell-tags" data-testid="cell-tags">
		{#if transaction.tags && transaction.tags.length > 0}
			<div class="tags-container">
				{#each transaction.tags as tag}
					<span class="tag-chip" data-testid="tag-chip">{tag}</span>
				{/each}
			</div>
		{:else}
			-
		{/if}
	</td>
</tr>

{#if isExpanded}
	<tr class="expansion-row" data-testid="expansion-row">
		<td colspan="8">
			<div class="expansion-content">
				<div class="expansion-section">
					<h4>Edit Transaction</h4>
					<p class="text-secondary">Transaction editing form will be available here.</p>
				</div>
			</div>
		</td>
	</tr>
{/if}

<style>
	.transaction-row {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.transaction-row:hover {
		background: var(--bg-hover, #f9fafb);
	}

	.transaction-row:focus-visible {
		outline: 2px solid var(--accent, #4f46e5);
		outline-offset: -2px;
	}

	.transaction-row.expanded {
		background: var(--bg-expanded, #e0e7ff);
		border-left: 3px solid var(--color-accent, #4f46e5);
	}

	.cell {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		vertical-align: middle;
	}

	.cell-date {
		font-feature-settings: 'tnum' 1;
		white-space: nowrap;
	}

	.cell-payee {
		font-weight: 500;
	}

	.cell-category,
	.cell-memo {
		color: var(--text-secondary, #6b7280);
	}

	.cell-outflow,
	.cell-inflow {
		text-align: right;
		font-feature-settings: 'tnum' 1;
		font-weight: 500;
	}

	.cell-outflow.has-value {
		color: var(--danger, #ef4444);
	}

	.cell-inflow.has-value {
		color: var(--success, #10b981);
	}

	.cell-account {
		color: var(--text-secondary, #6b7280);
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--accent-light, #eef2ff);
		color: var(--accent, #4f46e5);
		border-radius: 9999px;
		white-space: nowrap;
	}

	.expansion-row {
		background: var(--bg-secondary, #f8f9fa);
	}

	.expansion-content {
		padding: 16px 24px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.expansion-section h4 {
		margin: 0 0 8px 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.text-secondary {
		margin: 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	:global(.dark) .transaction-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(.dark) .transaction-row.expanded {
		background: var(--bg-secondary, #1a1a1a);
	}

	:global(.dark) .cell {
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--border-color: #2d2d2d;
	}

	:global(.dark) .tag-chip {
		background: rgba(79, 70, 229, 0.2);
		color: #a5b4fc;
	}

	:global(.dark) .expansion-row {
		background: var(--bg-secondary, #1a1a1a);
	}
</style>
