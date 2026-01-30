<script lang="ts">
	import type { Trailing12MTotals } from '$lib/utils/budgetCalculations';
	import { get12MDifferenceClass } from '$lib/utils/budgetCalculations';
	import { formatCentsCurrency } from '$lib/types/budget';
	import { formatBudgetAmount } from '$lib/utils/budgetFormatting';

	export let totals: Trailing12MTotals;
	export let isHeader: boolean = false;
	export let isSectionHeader: boolean = false;
	export let isGrandTotal: boolean = false;

	$: differenceClass = get12MDifferenceClass(totals.differenceCents);
	$: avgActualCents = Math.round(totals.actualCents / 12);
	$: avgBudgetedCents = Math.round(totals.budgetedCents / 12);
	$: avgDifferenceCents = Math.round(totals.differenceCents / 12);
	$: avgDifferenceClass = get12MDifferenceClass(avgDifferenceCents);
</script>

<div
	class="totals-cell"
	class:header-cell={isHeader}
	class:section-cell={isSectionHeader}
	class:grand-total-cell={isGrandTotal}
	role="cell"
	data-testid="totals-cell"
>
	{#if isHeader}
		<span class="header-label">Trailing 12M</span>
		<span class="header-label avg-label" data-testid="avg-header-label">Avg/mo</span>
	{:else}
		<span class="totals-actual" data-testid="totals-actual">
			{formatCentsCurrency(totals.actualCents)}
		</span>
		<span class="totals-budgeted" data-testid="totals-budgeted">
			{formatCentsCurrency(totals.budgetedCents)}
		</span>
		<span class="totals-difference {differenceClass}" data-testid="totals-difference">
			{totals.differenceCents >= 0 ? '+' : ''}{formatCentsCurrency(totals.differenceCents)}
		</span>
		<span class="avg-divider"></span>
		<span class="avg-actual" data-testid="avg-actual">
			{formatBudgetAmount(avgActualCents)}
		</span>
		<span class="avg-budgeted" data-testid="avg-budgeted">
			{formatBudgetAmount(avgBudgetedCents)}
		</span>
		<span class="avg-difference {avgDifferenceClass}" data-testid="avg-difference">
			{avgDifferenceCents >= 0 ? '+' : ''}{formatBudgetAmount(avgDifferenceCents)}
		</span>
	{/if}
</div>

<style>
	.totals-cell {
		min-width: 140px;
		width: 140px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		background: var(--bg-totals, rgba(79, 70, 229, 0.05));
		border-left: 2px solid var(--color-accent, #4f46e5);
		font-variant-numeric: tabular-nums;
	}

	.header-cell {
		font-weight: 600;
		color: var(--text-primary, #111827);
		background: var(--bg-secondary, #f9fafb);
		align-items: center;
		justify-content: center;
	}

	.header-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-accent, #4f46e5);
	}

	.section-cell {
		background: var(--bg-totals-section, rgba(79, 70, 229, 0.08));
	}

	.grand-total-cell {
		background: var(--bg-totals-grand, rgba(79, 70, 229, 0.12));
		font-weight: 600;
	}

	.totals-actual {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.totals-budgeted {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.totals-difference {
		font-size: 0.6875rem;
		font-weight: 500;
	}

	.avg-divider {
		width: 100%;
		height: 1px;
		background: var(--border-color, #e5e7eb);
		margin: 2px 0;
	}

	.avg-label {
		margin-top: 2px;
		font-size: 0.625rem;
		opacity: 0.7;
	}

	.avg-actual {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.avg-budgeted {
		font-size: 0.625rem;
		color: var(--text-secondary, #6b7280);
	}

	.avg-difference {
		font-size: 0.625rem;
		font-weight: 500;
	}

	.difference-positive {
		color: var(--color-success, #10b981);
	}

	.difference-negative {
		color: var(--color-danger, #ef4444);
	}

	.difference-neutral {
		color: var(--text-secondary, #6b7280);
	}

	/* Dark mode */
	:global(.dark) .totals-cell {
		--bg-totals: rgba(79, 70, 229, 0.1);
		--bg-totals-section: rgba(79, 70, 229, 0.15);
		--bg-totals-grand: rgba(79, 70, 229, 0.2);
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
	}
</style>
