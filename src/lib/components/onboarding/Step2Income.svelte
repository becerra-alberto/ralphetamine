<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let monthlyIncomeCents = 0;
	export let testId = 'step2-income';

	const dispatch = createEventDispatcher<{
		setIncome: { incomeCents: number };
		next: void;
		back: void;
	}>();

	const PRESETS = [
		{ label: '€2,000', cents: 200000 },
		{ label: '€3,500', cents: 350000 },
		{ label: '€5,000', cents: 500000 },
		{ label: '€7,500', cents: 750000 }
	];

	let inputValue = monthlyIncomeCents > 0 ? (monthlyIncomeCents / 100).toFixed(2) : '';
	let error = '';

	function handlePreset(cents: number) {
		inputValue = (cents / 100).toFixed(2);
		error = '';
		dispatch('setIncome', { incomeCents: cents });
	}

	function handleInputChange() {
		const cleaned = inputValue.replace(/[^0-9.]/g, '');
		const parsed = parseFloat(cleaned);
		if (isNaN(parsed) || parsed <= 0) {
			error = 'Please enter a valid amount greater than 0';
			return;
		}
		error = '';
		dispatch('setIncome', { incomeCents: Math.round(parsed * 100) });
	}

	function handleNext() {
		handleInputChange();
		if (!error && inputValue) {
			dispatch('next');
		} else if (!inputValue) {
			error = 'Please enter your monthly income';
		}
	}

	function handleBack() {
		dispatch('back');
	}
</script>

<div class="step2-income" data-testid={testId}>
	<h2 class="step-title" data-testid="{testId}-title">What's your monthly income?</h2>
	<p class="step-subtitle" data-testid="{testId}-subtitle">
		An estimate helps us suggest budgets
	</p>

	<div class="income-input-wrapper">
		<span class="currency-symbol">€</span>
		<input
			type="text"
			inputmode="decimal"
			bind:value={inputValue}
			on:input={handleInputChange}
			placeholder="0.00"
			class="income-input"
			data-testid="{testId}-input"
		/>
	</div>

	{#if error}
		<span class="error-message" data-testid="{testId}-error">{error}</span>
	{/if}

	<div class="presets" data-testid="{testId}-presets">
		{#each PRESETS as preset}
			<button
				class="preset-btn"
				class:active={inputValue === (preset.cents / 100).toFixed(2)}
				on:click={() => handlePreset(preset.cents)}
				data-testid="{testId}-preset-{preset.cents}"
			>
				{preset.label}
			</button>
		{/each}
	</div>

	<div class="step-actions">
		<button class="btn-back" on:click={handleBack} data-testid="{testId}-back">Back</button>
		<button class="btn-next" on:click={handleNext} data-testid="{testId}-next">Next</button>
	</div>
</div>

<style>
	.step2-income {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.step-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		text-align: center;
		margin: 0;
	}

	.step-subtitle {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		text-align: center;
		margin: 0 0 8px 0;
	}

	.income-input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		max-width: 280px;
	}

	.currency-symbol {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.income-input {
		flex: 1;
		font-size: 1.5rem;
		font-weight: 600;
		padding: 12px 16px;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 10px;
		text-align: center;
		font-variant-numeric: tabular-nums;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.income-input:focus {
		border-color: var(--accent, #4f46e5);
	}

	.error-message {
		font-size: 0.8125rem;
		color: var(--danger, #ef4444);
	}

	.presets {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.preset-btn {
		padding: 8px 16px;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preset-btn:hover {
		border-color: var(--accent, #4f46e5);
	}

	.preset-btn.active {
		border-color: var(--accent, #4f46e5);
		background: var(--accent-bg, #f5f3ff);
		color: var(--accent, #4f46e5);
	}

	.step-actions {
		display: flex;
		gap: 12px;
		margin-top: 16px;
	}

	.btn-back {
		padding: 12px 32px;
		background: none;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-back:hover {
		border-color: var(--text-secondary, #6b7280);
	}

	.btn-next {
		padding: 12px 48px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-next:hover {
		background: var(--accent-hover, #4338ca);
	}

	:global(.dark) .step-title,
	:global(.dark) .currency-symbol {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .income-input {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .preset-btn {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .preset-btn.active {
		background: #1e1b4b;
		color: var(--accent, #818cf8);
	}

	:global(.dark) .btn-back {
		border-color: #2d2d2d;
		color: #9ca3af;
	}
</style>
