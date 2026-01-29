<script lang="ts">
	import type { MonthString } from '$lib/types/budget';
	import { formatCentsCurrency } from '$lib/utils/currency';

	export let budgetedCents: number = 0;
	export let actualCents: number = 0;
	export let month: MonthString;
	export let isCurrent: boolean = false;
	export let categoryType: 'expense' | 'income' | 'transfer' = 'expense';

	/**
	 * Get color indicator class based on budget usage
	 * For expenses: over budget is bad (danger)
	 * For income: under target is bad
	 */
	function getStatusClass(): string {
		if (budgetedCents === 0) return '';

		if (categoryType === 'income') {
			// For income, actual >= budget is good
			const percentAchieved = (actualCents / budgetedCents) * 100;
			if (percentAchieved >= 100) return 'status-good';
			if (percentAchieved >= 75) return 'status-warning';
			return 'status-danger';
		} else {
			// For expenses, actual <= budget is good
			const percentUsed = (Math.abs(actualCents) / budgetedCents) * 100;
			if (percentUsed <= 75) return 'status-good';
			if (percentUsed <= 100) return 'status-warning';
			return 'status-danger';
		}
	}

	$: statusClass = getStatusClass();
</script>

<div
	class="budget-cell {statusClass}"
	class:current-month={isCurrent}
	role="cell"
	data-testid="budget-cell"
	data-month={month}
>
	<span class="cell-actual" data-testid="cell-actual">
		{formatCentsCurrency(actualCents)}
	</span>
	<span class="cell-budgeted" data-testid="cell-budgeted">
		{formatCentsCurrency(budgetedCents)}
	</span>
</div>

<style>
	.budget-cell {
		min-width: 100px;
		width: 120px;
		padding: 8px 12px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-end;
		gap: 2px;
		border-right: 1px solid var(--border-color, #e5e7eb);
		font-variant-numeric: tabular-nums;
	}

	.budget-cell.current-month {
		background: var(--bg-highlight, #eff6ff);
	}

	.cell-actual {
		font-size: 0.875rem; /* 14px */
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.cell-budgeted {
		font-size: 0.75rem; /* 12px */
		color: var(--text-secondary, #6b7280);
	}

	/* Status indicators */
	.status-good .cell-actual {
		color: var(--color-success, #10b981);
	}

	.status-warning .cell-actual {
		color: var(--color-warning, #f59e0b);
	}

	.status-danger .cell-actual {
		color: var(--color-danger, #ef4444);
	}

	/* Dark mode */
	:global(.dark) .budget-cell {
		--bg-primary: #0f0f0f;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--bg-highlight: #1e3a5f;
	}
</style>
