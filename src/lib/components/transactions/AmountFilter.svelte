<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let minAmount: number | null = null;
	export let maxAmount: number | null = null;

	const dispatch = createEventDispatcher<{
		change: { min: number | null; max: number | null };
	}>();

	// Display values in dollars (user-facing), store values in cents (internal)
	let minDisplay: string = minAmount !== null ? (minAmount / 100).toFixed(2) : '';
	let maxDisplay: string = maxAmount !== null ? (maxAmount / 100).toFixed(2) : '';

	$: validationError =
		minAmount !== null && maxAmount !== null && minAmount > maxAmount
			? 'Min must be less than or equal to max'
			: null;

	function handleMinChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.trim();
		if (value === '') {
			minAmount = null;
			minDisplay = '';
		} else {
			const parsed = parseFloat(value);
			if (!isNaN(parsed)) {
				minAmount = Math.round(parsed * 100);
				minDisplay = value;
			}
		}
		dispatch('change', { min: minAmount, max: maxAmount });
	}

	function handleMaxChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.trim();
		if (value === '') {
			maxAmount = null;
			maxDisplay = '';
		} else {
			const parsed = parseFloat(value);
			if (!isNaN(parsed)) {
				maxAmount = Math.round(parsed * 100);
				maxDisplay = value;
			}
		}
		dispatch('change', { min: minAmount, max: maxAmount });
	}
</script>

<div class="filter-section" data-testid="amount-filter">
	<h4 class="filter-label">Amount Range</h4>

	<div class="amount-inputs">
		<label class="amount-field">
			<span class="amount-label">Min</span>
			<div class="input-wrapper">
				<span class="currency-prefix">$</span>
				<input
					type="text"
					inputmode="decimal"
					value={minDisplay}
					on:change={handleMinChange}
					placeholder="0.00"
					class="amount-input"
					data-testid="amount-min"
					aria-label="Minimum amount"
				/>
			</div>
		</label>
		<span class="amount-separator">&ndash;</span>
		<label class="amount-field">
			<span class="amount-label">Max</span>
			<div class="input-wrapper">
				<span class="currency-prefix">$</span>
				<input
					type="text"
					inputmode="decimal"
					value={maxDisplay}
					on:change={handleMaxChange}
					placeholder="0.00"
					class="amount-input"
					data-testid="amount-max"
					aria-label="Maximum amount"
				/>
			</div>
		</label>
	</div>

	{#if validationError}
		<p class="validation-error" data-testid="amount-validation-error" role="alert">
			{validationError}
		</p>
	{/if}
</div>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	.amount-inputs {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}

	.amount-field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.amount-label {
		font-size: 0.7rem;
		color: var(--text-secondary, #6b7280);
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.currency-prefix {
		position: absolute;
		left: 8px;
		font-size: 0.8rem;
		color: var(--text-secondary, #6b7280);
		pointer-events: none;
	}

	.amount-input {
		width: 100%;
		height: 32px;
		padding: 0 8px 0 22px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	.amount-input:focus {
		outline: none;
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
	}

	.amount-separator {
		color: var(--text-tertiary, #9ca3af);
		padding-bottom: 6px;
	}

	.validation-error {
		font-size: 0.75rem;
		color: var(--color-danger, #ef4444);
		margin: 0;
	}

	:global(.dark) .amount-input {
		background: var(--bg-secondary, #1a1a1a);
		border-color: var(--border-color, #374151);
		color: var(--text-primary, #f9fafb);
	}
</style>
