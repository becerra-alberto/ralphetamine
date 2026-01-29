<script context="module" lang="ts">
	/**
	 * Minimal transaction data for display in expansion panel
	 */
	export interface MiniTransaction {
		id: string;
		date: string; // ISO date
		payee: string;
		amountCents: number;
	}
</script>

<script lang="ts">
	import { formatCentsCurrency } from '$lib/utils/currency';

	export let transactions: MiniTransaction[] = [];
	export let maxItems: number = 10;

	/**
	 * Format date as DD MMM (e.g., "15 Jan")
	 * Handles YYYY-MM-DD format without timezone issues
	 */
	function formatDate(isoDate: string): string {
		// Parse date parts directly to avoid timezone issues
		const [year, month, day] = isoDate.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		const dayNum = date.getDate();
		const monthName = date.toLocaleDateString('en-US', { month: 'short' });
		return `${dayNum} ${monthName}`;
	}

	// Sort by date descending and limit to maxItems
	// Use string comparison for YYYY-MM-DD format (lexicographic sort works correctly)
	$: sortedTransactions = [...transactions]
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, maxItems);
</script>

<div class="transaction-mini-list" data-testid="transaction-mini-list">
	{#if sortedTransactions.length === 0}
		<div class="empty-state" data-testid="empty-state">
			No transactions for this month
		</div>
	{:else}
		<ul class="transaction-list" role="list">
			{#each sortedTransactions as transaction (transaction.id)}
				<li class="transaction-item" data-testid="transaction-item">
					<span class="transaction-date" data-testid="transaction-date">
						{formatDate(transaction.date)}
					</span>
					<span class="transaction-payee" data-testid="transaction-payee" title={transaction.payee}>
						{transaction.payee}
					</span>
					<span class="transaction-amount" data-testid="transaction-amount">
						{formatCentsCurrency(transaction.amountCents)}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.transaction-mini-list {
		font-variant-numeric: tabular-nums;
	}

	.empty-state {
		padding: 16px;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		text-align: center;
		font-style: italic;
	}

	.transaction-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.transaction-item {
		display: grid;
		grid-template-columns: 60px 1fr auto;
		gap: 12px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		align-items: center;
	}

	.transaction-item:last-child {
		border-bottom: none;
	}

	.transaction-item:hover {
		background: var(--bg-hover, #f9fafb);
	}

	.transaction-date {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		white-space: nowrap;
	}

	.transaction-payee {
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.transaction-amount {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
		white-space: nowrap;
		text-align: right;
	}

	/* Dark mode */
	:global(.dark) .transaction-mini-list {
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--bg-hover: #1a1a1a;
	}
</style>
