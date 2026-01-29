<script lang="ts">
	import { formatCentsCurrency, formatCentsWithSign } from '../../utils/currency';
	import type { MomChangeData } from '../../api/netWorth';

	export let data: MomChangeData | null = null;
	export let testId = 'mom-change';

	$: hasPrevious = data?.hasPrevious ?? false;
	$: changeCents = data?.changeCents ?? 0;
	$: changePercent = data?.changePercent ?? 0;
	$: isPositive = changeCents > 0;
	$: isNegative = changeCents < 0;
	$: isZero = changeCents === 0;

	$: formattedChange = formatCentsWithSign(changeCents);
	$: formattedPercent = changePercent.toFixed(1);
	$: percentSign = changePercent > 0 ? '+' : '';

	$: previousMonth = data?.previousMonth ?? '';
	$: previousNetWorth = data?.previousNetWorthCents != null
		? formatCentsCurrency(data.previousNetWorthCents)
		: '';
	$: currentNetWorth = data != null
		? formatCentsCurrency(data.currentNetWorthCents)
		: '';

	$: formattedPreviousMonth = previousMonth
		? formatMonthLabel(previousMonth)
		: '';

	function formatMonthLabel(month: string): string {
		const [year, m] = month.split('-');
		const date = new Date(Number(year), Number(m) - 1);
		return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
	}

	let showTooltip = false;
</script>

<div class="mom-change-container" data-testid={testId}>
	{#if data === null}
		<!-- No data yet, don't render anything -->
	{:else if !hasPrevious}
		<span class="first-month" data-testid="{testId}-first-month">
			First month - no comparison
		</span>
	{:else}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			class="change-indicator"
			class:positive={isPositive}
			class:negative={isNegative}
			class:neutral={isZero}
			data-testid="{testId}-indicator"
			on:mouseenter={() => showTooltip = true}
			on:mouseleave={() => showTooltip = false}
		>
			{#if isPositive}
				<span class="arrow" data-testid="{testId}-arrow">&#x25B2;</span>
			{:else if isNegative}
				<span class="arrow" data-testid="{testId}-arrow">&#x25BC;</span>
			{/if}
			<span data-testid="{testId}-amount">{formattedChange}</span>
			<span data-testid="{testId}-percent">({percentSign}{formattedPercent}%)</span>
		</span>

		{#if showTooltip}
			<div class="tooltip" data-testid="{testId}-tooltip" role="tooltip">
				<div class="tooltip-row">
					<span class="tooltip-label">Compared to</span>
					<span class="tooltip-value" data-testid="{testId}-tooltip-month">{formattedPreviousMonth}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Previous</span>
					<span class="tooltip-value" data-testid="{testId}-tooltip-previous">{previousNetWorth}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Current</span>
					<span class="tooltip-value" data-testid="{testId}-tooltip-current">{currentNetWorth}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Change</span>
					<span class="tooltip-value" data-testid="{testId}-tooltip-change">{formattedChange} ({percentSign}{formattedPercent}%)</span>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.mom-change-container {
		position: relative;
		display: inline-flex;
		align-items: center;
		margin-top: 4px;
	}

	.first-month {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		font-style: italic;
	}

	.change-indicator {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8125rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		cursor: default;
	}

	.change-indicator.positive {
		color: var(--success, #10b981);
	}

	.change-indicator.negative {
		color: var(--danger, #ef4444);
	}

	.change-indicator.neutral {
		color: var(--text-secondary, #6b7280);
	}

	.arrow {
		font-size: 0.625rem;
		line-height: 1;
	}

	.tooltip {
		position: absolute;
		top: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		padding: 12px 16px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 50;
		min-width: 220px;
		white-space: nowrap;
	}

	.tooltip-row {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 2px 0;
		font-size: 0.75rem;
	}

	.tooltip-label {
		color: var(--text-secondary, #6b7280);
	}

	.tooltip-value {
		font-weight: 600;
		color: var(--text-primary, #111827);
		font-variant-numeric: tabular-nums;
	}

	/* Dark mode */
	:global(.dark) .tooltip {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	:global(.dark) .tooltip-value {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .change-indicator.positive {
		color: #34d399;
	}

	:global(.dark) .change-indicator.negative {
		color: #f87171;
	}
</style>
