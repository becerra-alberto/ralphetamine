<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import type { CurrencyCode } from '$lib/utils/currency';
	import type { AccountWithBalance } from '$lib/api/netWorth';
	import BalanceEdit from './BalanceEdit.svelte';

	export let account: AccountWithBalance;
	export let showAbsoluteBalance = false;
	export let editable = false;
	export let testId = 'account-row';

	const dispatch = createEventDispatcher<{
		balanceSave: { accountId: string; newBalanceCents: number };
	}>();

	$: currency = (account.currency || 'EUR') as CurrencyCode;
	$: isNonEur = currency !== 'EUR';
	$: displayCents = showAbsoluteBalance ? Math.abs(account.balanceCents) : account.balanceCents;
	$: formattedBalance = formatCentsCurrency(displayCents, currency);

	function formatLastUpdated(dateStr: string | null | undefined): string | null {
		if (!dateStr) return null;
		try {
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) return null;
			const day = date.getDate();
			const month = date.toLocaleString('en-US', { month: 'short' });
			const year = date.getFullYear();
			return `Updated: ${day} ${month} ${year}`;
		} catch {
			return null;
		}
	}

	$: lastUpdatedText = formatLastUpdated(account.lastBalanceUpdate);

	function handleBalanceSave(event: CustomEvent<{ newBalanceCents: number }>) {
		dispatch('balanceSave', {
			accountId: account.id,
			newBalanceCents: event.detail.newBalanceCents
		});
	}
</script>

<div class="account-row" data-testid={testId}>
	<div class="account-info">
		<span class="account-name" data-testid="{testId}-name">{account.name}</span>
		{#if account.institution}
			<span class="account-institution" data-testid="{testId}-institution">{account.institution}</span>
		{/if}
	</div>
	<div class="account-balance-col">
		<div class="account-balance">
			{#if editable}
				<BalanceEdit
					balanceCents={account.balanceCents}
					testId="{testId}-edit"
					on:save={handleBalanceSave}
				>
					<span class="balance-amount" data-testid="{testId}-balance">{formattedBalance}</span>
				</BalanceEdit>
			{:else}
				<span class="balance-amount" data-testid="{testId}-balance">{formattedBalance}</span>
			{/if}
			{#if isNonEur}
				<span class="currency-badge" data-testid="{testId}-currency">{currency}</span>
			{/if}
		</div>
		{#if lastUpdatedText}
			<span class="last-updated" data-testid="{testId}-updated">{lastUpdatedText}</span>
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

	.account-balance-col {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
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

	.last-updated {
		font-size: 0.6875rem;
		color: var(--text-secondary, #9ca3af);
		font-style: italic;
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

	:global(.dark) .last-updated {
		color: #6b7280;
	}
</style>
