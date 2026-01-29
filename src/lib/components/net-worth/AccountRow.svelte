<script lang="ts">
	import { formatCentsCurrency } from '$lib/utils/currency';
	import type { CurrencyCode } from '$lib/utils/currency';
	import type { AccountWithBalance } from '$lib/api/netWorth';

	export let account: AccountWithBalance;
	export let showAbsoluteBalance = false;
	export let testId = 'account-row';

	$: currency = (account.currency || 'EUR') as CurrencyCode;
	$: isNonEur = currency !== 'EUR';
	$: displayCents = showAbsoluteBalance ? Math.abs(account.balanceCents) : account.balanceCents;
	$: formattedBalance = formatCentsCurrency(displayCents, currency);
</script>

<div class="account-row" data-testid={testId}>
	<div class="account-info">
		<span class="account-name" data-testid="{testId}-name">{account.name}</span>
		{#if account.institution}
			<span class="account-institution" data-testid="{testId}-institution">{account.institution}</span>
		{/if}
	</div>
	<div class="account-balance">
		<span class="balance-amount" data-testid="{testId}-balance">{formattedBalance}</span>
		{#if isNonEur}
			<span class="currency-badge" data-testid="{testId}-currency">{currency}</span>
		{/if}
	</div>
</div>

<style>
	.account-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-color, #f3f4f6);
	}

	.account-row:last-child {
		border-bottom: none;
	}

	.account-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.account-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.account-institution {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.account-balance {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.balance-amount {
		font-size: 0.875rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary, #111827);
	}

	.currency-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		background: var(--bg-tertiary, #f3f4f6);
		padding: 1px 4px;
		border-radius: 3px;
		text-transform: uppercase;
	}

	:global(.dark) .account-name {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .balance-amount {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .account-row {
		border-color: #2d2d2d;
	}

	:global(.dark) .currency-badge {
		background: #2d2d2d;
		color: #9ca3af;
	}
</style>
