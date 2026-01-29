<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { getTodayDate } from '$lib/types/transaction';
	import DatePicker from '$lib/components/shared/DatePicker.svelte';
	import PayeeInput from '$lib/components/transactions/PayeeInput.svelte';
	import CategorySelect from '$lib/components/transactions/CategorySelect.svelte';
	import type { Account } from '$lib/types/account';
	import type { CategoryNode } from '$lib/types/ui';

	export let accounts: Account[] = [];
	export let categories: CategoryNode[] = [];
	export let lastUsedAccountId: string | null = null;

	const dispatch = createEventDispatcher<{
		save: {
			date: string;
			payee: string;
			categoryId: string | null;
			memo: string | null;
			amountCents: number;
			accountId: string;
		};
	}>();

	// Form state
	let date = getTodayDate();
	let payee = '';
	let categoryId = '';
	let memo = '';
	let amountStr = '';
	let isExpense = true;
	let accountId = '';
	let isSaving = false;
	let showSuccess = false;

	// Validation errors
	let errors: { payee?: string; amount?: string; account?: string } = {};

	// Element references for focus management
	let payeeInputRef: PayeeInput;
	let categorySelectRef: CategorySelect;
	let memoInput: HTMLInputElement;
	let amountInput: HTMLInputElement;
	let accountSelect: HTMLSelectElement;
	let saveButton: HTMLButtonElement;

	// Set default account
	$: {
		if (!accountId && accounts.length > 0) {
			accountId = lastUsedAccountId || accounts[0].id;
		}
	}

	function dollarsToCents(dollars: string): number {
		const cleaned = dollars.replace(/[^0-9.]/g, '');
		const parsed = parseFloat(cleaned);
		if (isNaN(parsed)) return 0;
		return Math.round(parsed * 100);
	}

	function validate(): boolean {
		errors = {};

		if (!payee.trim()) {
			errors.payee = 'Payee is required';
		}

		if (!amountStr.trim() || dollarsToCents(amountStr) === 0) {
			errors.amount = 'Amount is required';
		}

		if (!accountId) {
			errors.account = 'Account is required';
		}

		return Object.keys(errors).length === 0;
	}

	function focusFirstInvalidField() {
		if (errors.payee) {
			payeeInputRef?.focus();
		} else if (errors.amount) {
			amountInput?.focus();
		} else if (errors.account) {
			accountSelect?.focus();
		}
	}

	async function handleSave() {
		if (!validate()) {
			focusFirstInvalidField();
			return;
		}

		isSaving = true;

		const cents = dollarsToCents(amountStr);
		const finalCents = isExpense ? -Math.abs(cents) : Math.abs(cents);

		dispatch('save', {
			date,
			payee: payee.trim(),
			categoryId: categoryId || null,
			memo: memo.trim() || null,
			amountCents: finalCents,
			accountId
		});

		// Reset form
		resetForm();

		// Show success feedback
		showSuccess = true;
		setTimeout(() => {
			showSuccess = false;
		}, 1500);

		isSaving = false;
	}

	function resetForm() {
		date = getTodayDate();
		payee = '';
		categoryId = '';
		memo = '';
		amountStr = '';
		isExpense = true;
		errors = {};
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSave();
		}
	}

	function toggleSign() {
		isExpense = !isExpense;
	}

	function handlePayeeSelect(event: CustomEvent<{ payee: string; categoryId: string | null }>) {
		payee = event.detail.payee;
		if (event.detail.categoryId && !categoryId) {
			categoryId = event.detail.categoryId;
		}
		// Move focus to next field (memo, since category dropdown is click-based)
		memoInput?.focus();
	}

	function handleCategorySelect(event: CustomEvent<{ categoryId: string | null }>) {
		categoryId = event.detail.categoryId || '';
		// Move focus to memo after selecting category
		memoInput?.focus();
	}

	function handlePayeeEnter() {
		handleSave();
	}

	// Cmd+N shortcut handler
	function handleGlobalKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
			event.preventDefault();
			payeeInputRef?.focus();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleGlobalKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleGlobalKeydown);
	});

	export function focusPayee() {
		payeeInputRef?.focus();
	}
</script>

<div
	class="quick-add-row"
	class:success={showSuccess}
	data-testid="quick-add-row"
	role="form"
	aria-label="Quick add transaction"
>
	<div class="quick-add-fields">
		<div class="field field-date">
			<DatePicker
				value={date}
				label="Transaction date"
				on:change={(e) => { date = e.detail.date; }}
			/>
		</div>

		<div class="field field-payee">
			<PayeeInput
				bind:this={payeeInputRef}
				bind:value={payee}
				hasError={!!errors.payee}
				on:select={handlePayeeSelect}
				on:enter={handlePayeeEnter}
				on:input={() => { if (errors.payee) errors.payee = undefined; }}
			/>
			{#if errors.payee}
				<span class="error-text" data-testid="error-payee">{errors.payee}</span>
			{/if}
		</div>

		<div class="field field-category" data-testid="quick-add-category">
			<CategorySelect
				bind:this={categorySelectRef}
				{categories}
				value={categoryId || null}
				on:select={handleCategorySelect}
			/>
		</div>

		<div class="field field-memo">
			<input
				bind:this={memoInput}
				bind:value={memo}
				type="text"
				class="input input-memo"
				placeholder="Memo"
				data-testid="quick-add-memo"
				aria-label="Memo"
				on:keydown={handleKeydown}
			/>
		</div>

		<div class="field field-amount">
			<div class="amount-wrapper">
				<button
					type="button"
					class="sign-toggle"
					class:income={!isExpense}
					data-testid="quick-add-sign-toggle"
					aria-label={isExpense ? 'Expense (click for income)' : 'Income (click for expense)'}
					on:click={toggleSign}
				>
					{isExpense ? '-' : '+'}
				</button>
				<input
					bind:this={amountInput}
					bind:value={amountStr}
					type="text"
					inputmode="decimal"
					class="input input-amount"
					class:error={errors.amount}
					placeholder="0.00"
					data-testid="quick-add-amount"
					aria-label="Amount"
					aria-invalid={!!errors.amount}
					on:keydown={handleKeydown}
					on:input={() => { if (errors.amount) errors.amount = undefined; }}
				/>
			</div>
			{#if errors.amount}
				<span class="error-text" data-testid="error-amount">{errors.amount}</span>
			{/if}
		</div>

		<div class="field field-account">
			<select
				bind:this={accountSelect}
				bind:value={accountId}
				class="input input-account"
				class:error={errors.account}
				data-testid="quick-add-account"
				aria-label="Account"
				aria-invalid={!!errors.account}
				on:keydown={handleKeydown}
			>
				<option value="">Select account</option>
				{#each accounts as acct}
					<option value={acct.id}>{acct.name}</option>
				{/each}
			</select>
			{#if errors.account}
				<span class="error-text" data-testid="error-account">{errors.account}</span>
			{/if}
		</div>

		<div class="field field-save">
			<button
				bind:this={saveButton}
				type="button"
				class="save-btn"
				data-testid="quick-add-save"
				disabled={isSaving}
				on:click={handleSave}
			>
				{#if isSaving}
					Saving...
				{:else}
					Save
				{/if}
			</button>
		</div>
	</div>

	{#if showSuccess}
		<div class="success-indicator" data-testid="quick-add-success">
			Transaction added
		</div>
	{/if}
</div>

<style>
	.quick-add-row {
		background: var(--bg-quick-add, #f0f4ff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		padding: 12px 16px;
		position: relative;
		transition: background-color 0.3s ease;
	}

	.quick-add-row.success {
		background: rgba(16, 185, 129, 0.08);
	}

	.quick-add-fields {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.field-date {
		flex: 0 0 130px;
	}

	.field-payee {
		flex: 1.5;
		min-width: 100px;
	}

	.field-category {
		flex: 1;
		min-width: 100px;
	}

	.field-memo {
		flex: 1;
		min-width: 80px;
	}

	.field-amount {
		flex: 0 0 130px;
	}

	.field-account {
		flex: 1;
		min-width: 100px;
	}

	.field-save {
		flex: 0 0 auto;
		display: flex;
		align-items: flex-start;
	}

	.input {
		height: 34px;
		padding: 0 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s ease;
		width: 100%;
		box-sizing: border-box;
	}

	.input:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.input.error {
		border-color: var(--color-danger, #ef4444);
	}

	.input.error:focus {
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
	}

	.error-text {
		font-size: 0.6875rem;
		color: var(--color-danger, #ef4444);
		line-height: 1.2;
	}

	.amount-wrapper {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.sign-toggle {
		height: 34px;
		width: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-color, #d1d5db);
		border-right: none;
		border-radius: 4px 0 0 4px;
		background: var(--bg-secondary, #f9fafb);
		color: var(--color-danger, #ef4444);
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
		padding: 0;
	}

	.sign-toggle.income {
		color: var(--color-success, #10b981);
		background: rgba(16, 185, 129, 0.08);
	}

	.sign-toggle:hover {
		background: var(--bg-hover, #e5e7eb);
	}

	.amount-wrapper .input-amount {
		border-radius: 0 4px 4px 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	select.input {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 8px center;
		padding-right: 24px;
	}

	.save-btn {
		height: 34px;
		padding: 0 16px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: background-color 0.15s ease, opacity 0.15s ease;
	}

	.save-btn:hover:not(:disabled) {
		background: var(--accent-hover, #4338ca);
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-indicator {
		position: absolute;
		top: -8px;
		right: 12px;
		padding: 2px 10px;
		background: var(--color-success, #10b981);
		color: white;
		font-size: 0.6875rem;
		font-weight: 600;
		border-radius: 4px;
		animation: fadeInOut 1.5s ease forwards;
	}

	@keyframes fadeInOut {
		0% {
			opacity: 0;
			transform: translateY(4px);
		}
		20% {
			opacity: 1;
			transform: translateY(0);
		}
		80% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	/* Dark mode */
	:global(.dark) .quick-add-row {
		--bg-quick-add: rgba(79, 70, 229, 0.06);
		--border-color: #2d2d2d;
		--bg-primary: #1a1a1a;
		--bg-secondary: #252525;
		--text-primary: #f9fafb;
	}
</style>
