<script lang="ts">
	import { formatCentsCurrency } from '../../utils/currency';

	export let incomeCents: number = 0;
	export let expensesCents: number = 0;
	export let testId = 'summary-cards';

	$: balanceCents = incomeCents - expensesCents;
	$: hasTransactions = incomeCents > 0 || expensesCents > 0;
	$: balanceIsPositive = balanceCents >= 0;
</script>

<div class="summary-cards" data-testid={testId}>
	<!-- Income Card -->
	<div class="card card-income" data-testid="{testId}-income">
		<span class="card-label" data-testid="{testId}-income-label">Income this month</span>
		<span class="card-amount income-amount" data-testid="{testId}-income-amount">
			{formatCentsCurrency(incomeCents)}
		</span>
	</div>

	<!-- Expenses Card -->
	<div class="card card-expenses" data-testid="{testId}-expenses">
		<span class="card-label" data-testid="{testId}-expenses-label">Expenses this month</span>
		<span class="card-amount expenses-amount" data-testid="{testId}-expenses-amount">
			{formatCentsCurrency(expensesCents)}
		</span>
	</div>

	<!-- Balance Card -->
	<div
		class="card card-balance"
		class:balance-positive={balanceIsPositive}
		class:balance-negative={!balanceIsPositive}
		data-testid="{testId}-balance"
	>
		<span class="card-label" data-testid="{testId}-balance-label">Balance</span>
		<span class="card-amount balance-amount" data-testid="{testId}-balance-amount">
			{formatCentsCurrency(Math.abs(balanceCents))}
		</span>
	</div>

	{#if !hasTransactions}
		<div class="empty-prompt" data-testid="{testId}-empty">
			<p class="empty-text">Add your first transaction</p>
			<a href="/transactions" class="empty-link" data-testid="{testId}-empty-link">
				Go to Transactions
			</a>
		</div>
	{/if}
</div>

<style>
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 20px;
		border-radius: 8px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
	}

	.card-balance {
		padding: 20px 24px;
	}

	.card-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
	}

	.card-amount {
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.income-amount {
		color: var(--success, #10b981);
	}

	.expenses-amount {
		color: var(--danger, #ef4444);
	}

	.card-balance .card-amount {
		font-size: 1.75rem;
	}

	.balance-positive .balance-amount {
		color: var(--success, #10b981);
	}

	.balance-negative .balance-amount {
		color: var(--danger, #ef4444);
	}

	.empty-prompt {
		grid-column: 1 / -1;
		text-align: center;
		padding: 16px;
	}

	.empty-text {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		margin-bottom: 8px;
	}

	.empty-link {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--accent, #4f46e5);
		text-decoration: none;
	}

	.empty-link:hover {
		text-decoration: underline;
	}

	/* Dark mode */
	:global(.dark) .card {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
	}

	:global(.dark) .income-amount {
		color: #34d399;
	}

	:global(.dark) .expenses-amount {
		color: #f87171;
	}

	:global(.dark) .balance-positive .balance-amount {
		color: #34d399;
	}

	:global(.dark) .balance-negative .balance-amount {
		color: #f87171;
	}
</style>
