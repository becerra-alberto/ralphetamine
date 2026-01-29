<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ContextMenu from '../shared/ContextMenu.svelte';
	import type { MenuItem } from '$lib/types/ui';

	export let visible: boolean = false;
	export let x: number = 0;
	export let y: number = 0;
	export let currentBudgetCents: number = 0;

	// Popover state
	let showAmountInput: boolean = false;
	let showPercentageInput: boolean = false;
	let inputValue: string = '';
	let inputError: string = '';

	const dispatch = createEventDispatcher<{
		close: void;
		editThisMonth: void;
		setFutureMonths: { amountCents: number };
		increaseFutureMonths: { percentage: number };
	}>();

	const menuItems: MenuItem[] = [
		{ id: 'edit', label: 'Edit this month' },
		{ id: 'set-future', label: 'Set for all future months...' },
		{ id: 'increase-future', label: 'Increase future months by %...' }
	];

	function handleClose() {
		showAmountInput = false;
		showPercentageInput = false;
		inputValue = '';
		inputError = '';
		dispatch('close');
	}

	function handleSelect(event: CustomEvent<{ id: string }>) {
		const { id } = event.detail;

		switch (id) {
			case 'edit':
				dispatch('editThisMonth');
				handleClose();
				break;
			case 'set-future':
				showAmountInput = true;
				inputValue = currentBudgetCents > 0 ? (currentBudgetCents / 100).toFixed(2) : '';
				break;
			case 'increase-future':
				showPercentageInput = true;
				inputValue = '';
				break;
		}
	}

	function handleAmountSubmit() {
		const parsed = parseFloat(inputValue);
		if (isNaN(parsed) || parsed < 0) {
			inputError = 'Please enter a valid positive amount';
			return;
		}

		const amountCents = Math.round(parsed * 100);
		dispatch('setFutureMonths', { amountCents });
		handleClose();
	}

	function handlePercentageSubmit() {
		const parsed = parseFloat(inputValue);
		if (isNaN(parsed)) {
			inputError = 'Please enter a valid percentage';
			return;
		}

		dispatch('increaseFutureMonths', { percentage: parsed });
		handleClose();
	}

	function handleInputKeydown(event: KeyboardEvent, submitFn: () => void) {
		if (event.key === 'Enter') {
			event.preventDefault();
			submitFn();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
		}
	}

	/**
	 * Calculate the result of applying a percentage to a base amount
	 * Uses integer cents arithmetic to avoid floating point errors
	 */
	export function calculatePercentageIncrease(baseCents: number, percentage: number): number {
		// Calculate in cents to avoid floating point issues
		// Formula: base + (base * percentage / 100)
		// Use Math.round to get nearest cent
		const increaseCents = Math.round((baseCents * percentage) / 100);
		return baseCents + increaseCents;
	}
</script>

{#if visible && !showAmountInput && !showPercentageInput}
	<ContextMenu {visible} {x} {y} items={menuItems} on:close={handleClose} on:select={handleSelect} />
{/if}

{#if showAmountInput}
	<div
		class="input-popover"
		style="left: {x}px; top: {y}px;"
		data-testid="amount-input-popover"
		role="dialog"
		aria-label="Set amount for future months"
	>
		<div class="popover-header">Set for all future months</div>
		<div class="popover-body">
			<div class="input-group">
				<span class="currency-symbol">€</span>
				<input
					type="text"
					inputmode="decimal"
					bind:value={inputValue}
					placeholder="0.00"
					class="amount-input"
					class:error={!!inputError}
					data-testid="amount-input"
					on:keydown={(e) => handleInputKeydown(e, handleAmountSubmit)}
				/>
			</div>
			{#if inputError}
				<div class="input-error" data-testid="input-error">{inputError}</div>
			{/if}
		</div>
		<div class="popover-footer">
			<button class="btn-cancel" on:click={handleClose} data-testid="cancel-btn">Cancel</button>
			<button class="btn-apply" on:click={handleAmountSubmit} data-testid="apply-btn">Apply</button>
		</div>
	</div>
{/if}

{#if showPercentageInput}
	<div
		class="input-popover"
		style="left: {x}px; top: {y}px;"
		data-testid="percentage-input-popover"
		role="dialog"
		aria-label="Increase future months by percentage"
	>
		<div class="popover-header">Increase future months by %</div>
		<div class="popover-body">
			<div class="input-group">
				<input
					type="text"
					inputmode="decimal"
					bind:value={inputValue}
					placeholder="0"
					class="percentage-input"
					class:error={!!inputError}
					data-testid="percentage-input"
					on:keydown={(e) => handleInputKeydown(e, handlePercentageSubmit)}
				/>
				<span class="percent-symbol">%</span>
			</div>
			{#if inputError}
				<div class="input-error" data-testid="input-error">{inputError}</div>
			{/if}
		</div>
		<div class="popover-footer">
			<button class="btn-cancel" on:click={handleClose} data-testid="cancel-btn">Cancel</button>
			<button class="btn-apply" on:click={handlePercentageSubmit} data-testid="apply-btn"
				>Apply</button
			>
		</div>
	</div>
{/if}

<style>
	.input-popover {
		position: fixed;
		z-index: 1100;
		background: var(--bg-menu, #ffffff);
		border: 1px solid var(--border-menu, #e5e7eb);
		border-radius: 8px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		min-width: 220px;
		overflow: hidden;
	}

	.popover-header {
		padding: 12px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
		border-bottom: 1px solid var(--border-menu, #e5e7eb);
	}

	.popover-body {
		padding: 12px 16px;
	}

	.input-group {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--bg-input, #f9fafb);
		border: 1px solid var(--border-input, #d1d5db);
		border-radius: 6px;
		padding: 0 12px;
	}

	.input-group:focus-within {
		border-color: var(--color-accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}

	.currency-symbol,
	.percent-symbol {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.amount-input,
	.percentage-input {
		flex: 1;
		border: none;
		background: transparent;
		padding: 8px 0;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
		outline: none;
		font-variant-numeric: tabular-nums;
	}

	.amount-input::placeholder,
	.percentage-input::placeholder {
		color: var(--text-placeholder, #9ca3af);
	}

	.input-group.error,
	.input-group:has(.error) {
		border-color: var(--color-danger, #ef4444);
	}

	.input-error {
		margin-top: 8px;
		font-size: 0.75rem;
		color: var(--color-danger, #ef4444);
	}

	.popover-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--border-menu, #e5e7eb);
		background: var(--bg-footer, #f9fafb);
	}

	.btn-cancel,
	.btn-apply {
		padding: 6px 12px;
		font-size: 0.875rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 100ms ease;
	}

	.btn-cancel {
		background: transparent;
		border: 1px solid var(--border-input, #d1d5db);
		color: var(--text-primary, #111827);
	}

	.btn-cancel:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.btn-apply {
		background: var(--color-accent, #4f46e5);
		border: 1px solid var(--color-accent, #4f46e5);
		color: white;
	}

	.btn-apply:hover {
		background: var(--color-accent-hover, #4338ca);
	}

	/* Dark mode */
	:global(.dark) .input-popover {
		--bg-menu: #1a1a1a;
		--border-menu: #2d2d2d;
		--text-primary: #f9fafb;
		--bg-input: #0f0f0f;
		--border-input: #3f3f46;
		--text-secondary: #9ca3af;
		--bg-footer: #141414;
		--bg-hover: #2d2d2d;
	}
</style>
