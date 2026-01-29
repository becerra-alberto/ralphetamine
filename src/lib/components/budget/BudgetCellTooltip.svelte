<script lang="ts">
	import { formatCentsCurrency } from '$lib/utils/currency';

	export let actualCents: number;
	export let budgetCents: number;
	export let categoryId: string;
	export let month: string;

	// Calculate difference (positive = under budget, negative = over)
	$: differenceCents = budgetCents - Math.abs(actualCents);
	$: isUnderBudget = differenceCents > 0;
	$: isOverBudget = differenceCents < 0;
	$: isOnBudget = differenceCents === 0;

	// Calculate usage percentage
	$: usagePercent = budgetCents > 0 ? ((Math.abs(actualCents) / budgetCents) * 100).toFixed(1) : null;

	// Transaction link URL
	$: transactionUrl = `/transactions?category=${categoryId}&month=${month}`;
</script>

<div class="budget-tooltip" data-testid="budget-cell-tooltip">
	<div class="tooltip-row">
		<span class="tooltip-label">Actual:</span>
		<span class="tooltip-value">{formatCentsCurrency(actualCents)}</span>
	</div>

	<div class="tooltip-row">
		<span class="tooltip-label">Budget:</span>
		<span class="tooltip-value">{formatCentsCurrency(budgetCents)}</span>
	</div>

	<div class="tooltip-row">
		<span class="tooltip-label">Difference:</span>
		{#if isUnderBudget}
			<span class="tooltip-value difference-positive" data-testid="difference-positive">
				+{formatCentsCurrency(differenceCents)} remaining
			</span>
		{:else if isOverBudget}
			<span class="tooltip-value difference-negative" data-testid="difference-negative">
				{formatCentsCurrency(differenceCents)} over
			</span>
		{:else}
			<span class="tooltip-value difference-neutral" data-testid="difference-neutral">
				On budget
			</span>
		{/if}
	</div>

	<div class="tooltip-row">
		<span class="tooltip-label">Usage:</span>
		<span class="tooltip-value">
			{#if usagePercent !== null}
				{usagePercent}%
			{:else}
				N/A
			{/if}
		</span>
	</div>

	<a href={transactionUrl} class="view-transactions" data-testid="view-transactions-link">
		View transactions →
	</a>
</div>

<style>
	.budget-tooltip {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tooltip-row {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.tooltip-label {
		color: var(--text-tooltip-secondary, #9ca3af);
	}

	.tooltip-value {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}

	.difference-positive {
		color: var(--color-success, #10b981);
	}

	.difference-negative {
		color: var(--color-danger, #ef4444);
	}

	.difference-neutral {
		color: var(--text-tooltip-secondary, #9ca3af);
	}

	.view-transactions {
		display: block;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--border-tooltip, rgba(255, 255, 255, 0.1));
		color: var(--color-accent, #4f46e5);
		text-decoration: none;
		font-weight: 500;
	}

	.view-transactions:hover {
		text-decoration: underline;
	}

	/* Light mode */
	:global(.light) .view-transactions {
		color: var(--color-accent, #4f46e5);
	}

	:global(.light) .tooltip-label {
		color: var(--text-secondary, #6b7280);
	}
</style>
