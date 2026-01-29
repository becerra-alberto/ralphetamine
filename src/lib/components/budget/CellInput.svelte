<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { getCurrencySymbol, amountToCents, centsToAmount } from '$lib/utils/currency';

	/**
	 * Current budget value in cents
	 */
	export let valueCents: number = 0;

	/**
	 * Whether the input is in error state
	 */
	export let hasError: boolean = false;

	const dispatch = createEventDispatcher<{
		save: { valueCents: number };
		cancel: void;
		navigate: { direction: 'next' | 'prev'; valueCents: number };
	}>();

	// Convert cents to display value
	let displayValue: string = centsToAmount(valueCents).toFixed(2);
	let inputElement: HTMLInputElement;
	let errorMessage: string = '';
	let originalValue: string = displayValue;

	onMount(() => {
		// Focus and select on mount
		if (inputElement) {
			inputElement.focus();
			inputElement.select();
		}
	});

	/**
	 * Validate the input value
	 * Returns { valid: boolean, cents: number, error: string }
	 */
	function validateValue(value: string): { valid: boolean; cents: number; error: string } {
		// Clean the input - remove currency symbols, spaces, commas
		const cleaned = value.replace(/[€$,\s]/g, '');

		// Check for empty input
		if (cleaned === '' || cleaned === '.') {
			return { valid: true, cents: 0, error: '' };
		}

		// Check for valid number format
		const parsed = parseFloat(cleaned);
		if (isNaN(parsed)) {
			return { valid: false, cents: 0, error: 'Please enter a valid number' };
		}

		// Check for negative numbers
		if (parsed < 0) {
			return { valid: false, cents: 0, error: 'Budget cannot be negative' };
		}

		// Convert to cents (round to nearest cent)
		const cents = amountToCents(parsed);

		return { valid: true, cents, error: '' };
	}

	/**
	 * Handle save action
	 */
	function handleSave() {
		const result = validateValue(displayValue);

		if (!result.valid) {
			hasError = true;
			errorMessage = result.error;
			return;
		}

		hasError = false;
		errorMessage = '';
		dispatch('save', { valueCents: result.cents });
	}

	/**
	 * Handle cancel action
	 */
	function handleCancel() {
		displayValue = originalValue;
		hasError = false;
		errorMessage = '';
		dispatch('cancel');
	}

	/**
	 * Handle Tab navigation - validates and saves before navigating
	 * Returns true if navigation should proceed
	 */
	function handleTabNavigation(direction: 'next' | 'prev'): boolean {
		const result = validateValue(displayValue);

		if (!result.valid) {
			hasError = true;
			errorMessage = result.error;
			return false;
		}

		hasError = false;
		errorMessage = '';
		dispatch('navigate', { direction, valueCents: result.cents });
		return true;
	}

	/**
	 * Handle keyboard events
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSave();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleCancel();
		} else if (event.key === 'Tab') {
			event.preventDefault();
			const direction = event.shiftKey ? 'prev' : 'next';
			handleTabNavigation(direction);
		}
	}

	/**
	 * Handle blur event
	 */
	function handleBlur() {
		// Only save if value has changed
		if (displayValue !== originalValue) {
			handleSave();
		} else {
			dispatch('cancel');
		}
	}

	/**
	 * Handle input changes to validate in real-time
	 */
	function handleInput() {
		// Clear error on input change
		if (hasError) {
			const result = validateValue(displayValue);
			if (result.valid) {
				hasError = false;
				errorMessage = '';
			}
		}
	}

	// Get currency symbol for display
	const currencySymbol = getCurrencySymbol();
</script>

<div class="cell-input-wrapper" class:has-error={hasError} data-testid="cell-input">
	<span class="currency-symbol" data-testid="currency-symbol">{currencySymbol}</span>
	<input
		bind:this={inputElement}
		bind:value={displayValue}
		type="text"
		inputmode="decimal"
		class="cell-input"
		class:error={hasError}
		data-testid="cell-input-field"
		on:keydown={handleKeydown}
		on:blur={handleBlur}
		on:input={handleInput}
		aria-invalid={hasError}
		aria-describedby={hasError ? 'cell-input-error' : undefined}
	/>
	{#if hasError && errorMessage}
		<span class="error-message" id="cell-input-error" data-testid="cell-input-error" role="alert">
			{errorMessage}
		</span>
	{/if}
</div>

<style>
	.cell-input-wrapper {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px 8px;
		background: var(--bg-primary, #ffffff);
		border: 2px solid var(--color-accent, #4f46e5);
		border-radius: 4px;
		position: relative;
		min-width: 80px;
	}

	.cell-input-wrapper.has-error {
		border-color: var(--color-danger, #ef4444);
	}

	.currency-symbol {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		user-select: none;
	}

	.cell-input {
		flex: 1;
		min-width: 60px;
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary, #111827);
		text-align: right;
		padding: 2px 0;
	}

	.cell-input.error {
		color: var(--color-danger, #ef4444);
	}

	.cell-input::placeholder {
		color: var(--text-secondary, #9ca3af);
	}

	.error-message {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		padding: 4px 8px;
		background: var(--color-danger, #ef4444);
		color: white;
		font-size: 0.75rem;
		border-radius: 0 0 4px 4px;
		white-space: nowrap;
		z-index: 100;
	}

	/* Dark mode */
	:global(.dark) .cell-input-wrapper {
		--bg-primary: #1a1a1a;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
	}
</style>
