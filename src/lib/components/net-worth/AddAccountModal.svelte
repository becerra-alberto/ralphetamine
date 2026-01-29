<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { parseDisplayToCents } from '$lib/utils/currency';

	export let isOpen = false;
	export let defaultType = 'checking';
	export let testId = 'add-account-modal';

	const dispatch = createEventDispatcher<{
		submit: {
			name: string;
			accountType: string;
			institution: string;
			currency: string;
			startingBalanceCents: number;
		};
		close: void;
	}>();

	let name = '';
	let accountType = defaultType;
	let institution = '';
	let currency = 'EUR';
	let startingBalance = '';
	let errors: Record<string, string> = {};

	const ACCOUNT_TYPES = [
		{ value: 'checking', label: 'Checking' },
		{ value: 'savings', label: 'Savings' },
		{ value: 'credit', label: 'Credit Card' },
		{ value: 'investment', label: 'Investment' },
		{ value: 'cash', label: 'Cash' }
	];

	const CURRENCIES = [
		{ value: 'EUR', label: 'EUR (€)' },
		{ value: 'USD', label: 'USD ($)' },
		{ value: 'CAD', label: 'CAD ($)' }
	];

	function validate(): boolean {
		errors = {};
		if (!name.trim()) errors.name = 'Account name is required';
		if (!startingBalance.trim()) errors.balance = 'Starting balance is required';
		else {
			const parsed = parseFloat(startingBalance.replace(/[^0-9.-]/g, ''));
			if (isNaN(parsed)) errors.balance = 'Enter a valid amount';
		}
		return Object.keys(errors).length === 0;
	}

	function handleSubmit() {
		if (!validate()) return;

		const cents = parseDisplayToCents(startingBalance);
		// Credit cards: store as negative
		const balanceCents = accountType === 'credit' ? -Math.abs(cents) : cents;

		dispatch('submit', {
			name: name.trim(),
			accountType,
			institution: institution.trim(),
			currency,
			startingBalanceCents: balanceCents
		});

		resetForm();
	}

	function handleClose() {
		resetForm();
		dispatch('close');
	}

	function resetForm() {
		name = '';
		accountType = defaultType;
		institution = '';
		currency = 'EUR';
		startingBalance = '';
		errors = {};
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" data-testid="{testId}-overlay" on:click={handleClose} on:keydown={handleKeydown}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-content" data-testid={testId} on:click|stopPropagation role="dialog" aria-label="Add Account">
			<h2 class="modal-title" data-testid="{testId}-title">Add Account</h2>

			<form on:submit|preventDefault={handleSubmit} data-testid="{testId}-form">
				<div class="form-field">
					<label for="account-name">Account Name *</label>
					<input
						id="account-name"
						type="text"
						bind:value={name}
						placeholder="e.g., Main Checking"
						data-testid="{testId}-name-input"
					/>
					{#if errors.name}
						<span class="error" data-testid="{testId}-name-error">{errors.name}</span>
					{/if}
				</div>

				<div class="form-field">
					<label for="account-type">Account Type</label>
					<select id="account-type" bind:value={accountType} data-testid="{testId}-type-select">
						{#each ACCOUNT_TYPES as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-field">
					<label for="account-institution">Institution</label>
					<input
						id="account-institution"
						type="text"
						bind:value={institution}
						placeholder="e.g., ING, Chase"
						data-testid="{testId}-institution-input"
					/>
				</div>

				<div class="form-field">
					<label for="account-currency">Currency</label>
					<select id="account-currency" bind:value={currency} data-testid="{testId}-currency-select">
						{#each CURRENCIES as curr}
							<option value={curr.value}>{curr.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-field">
					<label for="account-balance">Starting Balance *</label>
					<input
						id="account-balance"
						type="text"
						inputmode="decimal"
						bind:value={startingBalance}
						placeholder="0.00"
						data-testid="{testId}-balance-input"
					/>
					{#if errors.balance}
						<span class="error" data-testid="{testId}-balance-error">{errors.balance}</span>
					{/if}
				</div>

				<div class="modal-actions">
					<button type="button" class="btn-cancel" on:click={handleClose} data-testid="{testId}-cancel">
						Cancel
					</button>
					<button type="submit" class="btn-save" data-testid="{testId}-submit">
						Add Account
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal-content {
		background: var(--bg-primary, #ffffff);
		border-radius: 12px;
		padding: 24px;
		width: 420px;
		max-width: 90vw;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		margin: 0 0 20px 0;
	}

	.form-field {
		margin-bottom: 16px;
	}

	.form-field label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		margin-bottom: 4px;
	}

	.form-field input,
	.form-field select {
		width: 100%;
		padding: 8px 12px;
		font-size: 0.875rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		color: var(--text-primary, #111827);
		background: var(--bg-primary, #ffffff);
		box-sizing: border-box;
	}

	.form-field input:focus,
	.form-field select:focus {
		outline: none;
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}

	.error {
		color: var(--danger, #ef4444);
		font-size: 0.75rem;
		margin-top: 2px;
		display: block;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 20px;
	}

	.btn-cancel {
		padding: 8px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
	}

	.btn-save {
		padding: 8px 16px;
		font-size: 0.875rem;
		font-weight: 600;
		border: none;
		border-radius: 6px;
		background: var(--accent, #4f46e5);
		color: white;
		cursor: pointer;
	}

	.btn-save:hover {
		background: #4338ca;
	}

	:global(.dark) .modal-content {
		background: var(--bg-secondary, #1a1a1a);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
	}

	:global(.dark) .modal-title {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .form-field input,
	:global(.dark) .form-field select {
		background: var(--bg-tertiary, #0f0f0f);
		color: var(--text-primary, #f9fafb);
		border-color: #2d2d2d;
	}
</style>
