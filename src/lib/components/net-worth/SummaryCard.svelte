<script lang="ts">
	import { formatCentsCurrency } from '../../utils/currency';
	import type { CurrencyCode } from '../../utils/currency';

	export let label: string;
	export let amountCents: number;
	export let currency: CurrencyCode = 'EUR';
	export let colorTheme: 'green' | 'red' | 'auto' = 'auto';
	export let isProminent = false;
	export let progressPercent: number | null = null;
	export let testId = 'summary-card';

	$: displayColor =
		colorTheme === 'auto' ? (amountCents >= 0 ? 'green' : 'red') : colorTheme;

	$: formattedAmount = formatCentsCurrency(Math.abs(amountCents), currency);
	$: isNegativeDisplay = amountCents < 0 && colorTheme === 'auto';
</script>

<div
	class="summary-card"
	class:prominent={isProminent}
	class:theme-green={displayColor === 'green'}
	class:theme-red={displayColor === 'red'}
	data-testid={testId}
>
	<span class="card-label" data-testid="{testId}-label">{label}</span>
	<span
		class="card-amount"
		class:amount-negative={isNegativeDisplay}
		data-testid="{testId}-amount"
	>
		{isNegativeDisplay ? '-' : ''}{formattedAmount}
	</span>

	{#if progressPercent !== null}
		<div class="progress-bar" data-testid="{testId}-progress">
			<div
				class="progress-fill"
				style="width: {Math.min(Math.max(progressPercent, 0), 100)}%"
				data-testid="{testId}-progress-fill"
			></div>
		</div>
	{/if}
</div>

<style>
	.summary-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px 20px;
		border-radius: 8px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		flex: 1;
		min-width: 0;
	}

	.summary-card.prominent {
		flex: 1.5;
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
		color: var(--text-primary, #111827);
	}

	.prominent .card-amount {
		font-size: 1.75rem;
	}

	.theme-green .card-amount {
		color: var(--success, #10b981);
	}

	.theme-red .card-amount {
		color: var(--danger, #ef4444);
	}

	.amount-negative {
		color: var(--danger, #ef4444) !important;
	}

	.progress-bar {
		height: 4px;
		background: var(--border-color, #e5e7eb);
		border-radius: 2px;
		overflow: hidden;
		margin-top: 4px;
	}

	.progress-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.theme-green .progress-fill {
		background: var(--success, #10b981);
	}

	.theme-red .progress-fill {
		background: var(--danger, #ef4444);
	}

	/* Dark mode */
	:global(.dark) .summary-card {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
	}

	:global(.dark) .card-amount {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .theme-green .card-amount {
		color: #34d399;
	}

	:global(.dark) .theme-red .card-amount {
		color: #f87171;
	}

	:global(.dark) .progress-bar {
		background: #2d2d2d;
	}
</style>
