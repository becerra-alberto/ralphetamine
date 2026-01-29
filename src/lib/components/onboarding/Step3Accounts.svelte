<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { OnboardingAccount } from '$lib/stores/onboarding';

	export let accounts: OnboardingAccount[] = [];
	export let testId = 'step3-accounts';

	const dispatch = createEventDispatcher<{
		addAccount: OnboardingAccount;
		next: void;
		back: void;
	}>();

	const ACCOUNT_TYPES = [
		{ value: 'checking', label: 'Checking' },
		{ value: 'savings', label: 'Savings' },
		{ value: 'credit', label: 'Credit Card' },
		{ value: 'investment', label: 'Investment' },
		{ value: 'cash', label: 'Cash' }
	];

	let showForm = false;
	let name = '';
	let type = 'checking';
	let balance = '';
	let formError = '';

	function handleShowForm() {
		showForm = true;
	}

	function handleAddAccount() {
		if (!name.trim()) {
			formError = 'Account name is required';
			return;
		}
		const parsed = parseFloat(balance.replace(/[^0-9.-]/g, ''));
		if (isNaN(parsed)) {
			formError = 'Please enter a valid balance';
			return;
		}
		formError = '';
		dispatch('addAccount', {
			name: name.trim(),
			type,
			balanceCents: Math.round(parsed * 100)
		});
		// Reset form
		name = '';
		type = 'checking';
		balance = '';
		showForm = false;
	}

	function handleNext() {
		dispatch('next');
	}

	function handleBack() {
		dispatch('back');
	}

	function formatBalance(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
	}
</script>

<div class="step3-accounts" data-testid={testId}>
	<h2 class="step-title" data-testid="{testId}-title">Add your accounts</h2>
	<p class="step-subtitle" data-testid="{testId}-subtitle">Where do you keep your money?</p>

	{#if accounts.length > 0}
		<div class="account-list" data-testid="{testId}-list">
			{#each accounts as account, i}
				<div class="account-item" data-testid="{testId}-account-{i}">
					<span class="account-name">{account.name}</span>
					<span class="account-balance">€{formatBalance(account.balanceCents)}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if showForm}
		<div class="add-form" data-testid="{testId}-form">
			<input
				type="text"
				bind:value={name}
				placeholder="Account name"
				class="form-input"
				data-testid="{testId}-name-input"
			/>
			<select bind:value={type} class="form-select" data-testid="{testId}-type-select">
				{#each ACCOUNT_TYPES as t}
					<option value={t.value}>{t.label}</option>
				{/each}
			</select>
			<input
				type="text"
				inputmode="decimal"
				bind:value={balance}
				placeholder="Balance (€)"
				class="form-input"
				data-testid="{testId}-balance-input"
			/>
			{#if formError}
				<span class="error-message" data-testid="{testId}-form-error">{formError}</span>
			{/if}
			<button class="btn-add" on:click={handleAddAccount} data-testid="{testId}-add-btn">
				Add
			</button>
		</div>
	{:else}
		<button
			class="btn-add-account"
			on:click={handleShowForm}
			data-testid="{testId}-show-form-btn"
		>
			+ Add account
		</button>
	{/if}

	<div class="step-actions">
		<button class="btn-back" on:click={handleBack} data-testid="{testId}-back">Back</button>
		<button class="btn-next" on:click={handleNext} data-testid="{testId}-next">
			{accounts.length > 0 ? 'Next' : 'Skip for now'}
		</button>
	</div>
</div>

<style>
	.step3-accounts {
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

	.account-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.account-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 14px;
		background: var(--bg-secondary, #f8f9fa);
		border-radius: 8px;
	}

	.account-name {
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.account-balance {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary, #111827);
	}

	.add-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-input,
	.form-select {
		padding: 10px 14px;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		font-size: 0.9375rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-input:focus,
	.form-select:focus {
		border-color: var(--accent, #4f46e5);
	}

	.error-message {
		font-size: 0.8125rem;
		color: var(--danger, #ef4444);
	}

	.btn-add {
		padding: 10px 24px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-add-account {
		padding: 12px 24px;
		background: none;
		border: 2px dashed var(--border-color, #d1d5db);
		border-radius: 10px;
		color: var(--accent, #4f46e5);
		font-weight: 500;
		cursor: pointer;
		width: 100%;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
	}

	.btn-add-account:hover {
		border-color: var(--accent, #4f46e5);
		background: var(--accent-bg, #f5f3ff);
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
	}

	:global(.dark) .step-title,
	:global(.dark) .account-name,
	:global(.dark) .account-balance {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .account-item {
		background: var(--bg-secondary, #1a1a1a);
	}

	:global(.dark) .form-input,
	:global(.dark) .form-select {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .btn-add-account {
		border-color: #2d2d2d;
		color: var(--accent, #818cf8);
	}

	:global(.dark) .btn-back {
		border-color: #2d2d2d;
		color: #9ca3af;
	}
</style>
