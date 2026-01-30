<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import type { CurrencyCode } from '$lib/utils/currency';
	import type { AccountWithBalance } from '$lib/api/netWorth';
	import BalanceEdit from './BalanceEdit.svelte';
	import ConfirmDialog from '../shared/ConfirmDialog.svelte';
	import { maskBankNumber, validateBankNumber, COUNTRY_CODES, getCountryName } from '$lib/utils/bankIdentifiers';

	export let account: AccountWithBalance;
	export let showAbsoluteBalance = false;
	export let editable = false;
	export let testId = 'account-row';

	const dispatch = createEventDispatcher<{
		balanceSave: { accountId: string; newBalanceCents: number };
		edit: { accountId: string; update: { name?: string; institution?: string; accountType?: string; bankNumber?: string; country?: string } };
		delete: { accountId: string };
	}>();

	let showMenu = false;
	let showDeleteConfirm = false;
	let isEditing = false;
	let editName = '';
	let editInstitution = '';
	let editBankNumber = '';
	let editCountry = '';
	let bankNumberError = '';

	function openMenu() {
		showMenu = !showMenu;
	}

	function startEdit() {
		editName = account.name;
		editInstitution = account.institution || '';
		editBankNumber = account.bankNumber || '';
		editCountry = account.country || '';
		bankNumberError = '';
		isEditing = true;
		showMenu = false;
	}

	function cancelEdit() {
		isEditing = false;
	}

	function saveEdit() {
		if (!editName.trim()) return;
		const bankVal = editBankNumber.trim();
		if (bankVal) {
			const validation = validateBankNumber(bankVal);
			if (!validation.valid) {
				bankNumberError = validation.error || 'Invalid bank number';
				return;
			}
		}
		bankNumberError = '';
		dispatch('edit', {
			accountId: account.id,
			update: {
				name: editName.trim(),
				institution: editInstitution.trim(),
				bankNumber: bankVal,
				country: editCountry
			}
		});
		isEditing = false;
	}

	function handleDelete() {
		showMenu = false;
		showDeleteConfirm = true;
	}

	function handleDeleteConfirm() {
		showDeleteConfirm = false;
		dispatch('delete', { accountId: account.id });
	}

	function handleDeleteCancel() {
		showDeleteConfirm = false;
	}

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			cancelEdit();
		}
	}

	function handleClickOutsideMenu(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.kebab-menu-container')) {
			showMenu = false;
		}
	}

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
	$: maskedBank = maskBankNumber(account.bankNumber);

	function handleBalanceSave(event: CustomEvent<{ newBalanceCents: number }>) {
		dispatch('balanceSave', {
			accountId: account.id,
			newBalanceCents: event.detail.newBalanceCents
		});
	}
</script>

<svelte:window on:click={handleClickOutsideMenu} />

{#if isEditing}
	<div class="account-row account-row--editing" data-testid="{testId}-editing">
		<div class="edit-fields">
			<div class="edit-field">
				<label class="edit-label" for="{testId}-edit-name">Name</label>
				<input
					class="edit-input"
					id="{testId}-edit-name"
					type="text"
					bind:value={editName}
					placeholder="Account name"
					on:keydown={handleEditKeydown}
					data-testid="{testId}-edit-name"
				/>
			</div>
			<div class="edit-field edit-field--small">
				<label class="edit-label" for="{testId}-edit-institution">Institution</label>
				<input
					class="edit-input"
					id="{testId}-edit-institution"
					type="text"
					bind:value={editInstitution}
					placeholder="Institution"
					on:keydown={handleEditKeydown}
					data-testid="{testId}-edit-institution"
				/>
			</div>
			<div class="edit-field edit-field--small">
				<label class="edit-label" for="{testId}-edit-bank-number">Bank Number</label>
				<input
					class="edit-input"
					id="{testId}-edit-bank-number"
					type="text"
					bind:value={editBankNumber}
					placeholder="IBAN / CLABE"
					on:keydown={handleEditKeydown}
					data-testid="{testId}-edit-bank-number"
				/>
			</div>
			<div class="edit-field edit-field--tiny">
				<label class="edit-label" for="{testId}-edit-country">Country</label>
				<select
					class="edit-input"
					id="{testId}-edit-country"
					bind:value={editCountry}
					data-testid="{testId}-edit-country"
				>
					<option value="">--</option>
					{#each COUNTRY_CODES as code}
						<option value={code}>{getCountryName(code)}</option>
					{/each}
				</select>
			</div>
		</div>
		{#if bankNumberError}
			<span class="edit-error" data-testid="{testId}-bank-number-error">{bankNumberError}</span>
		{/if}
		<div class="edit-actions">
			<button class="edit-btn edit-btn--save" on:click={saveEdit} data-testid="{testId}-edit-save">Save</button>
			<button class="edit-btn edit-btn--cancel" on:click={cancelEdit} data-testid="{testId}-edit-cancel">Cancel</button>
		</div>
	</div>
{:else}
	<div class="account-row" data-testid={testId}>
		<div class="account-info" data-testid="{testId}-info">
			<div class="account-name-row">
				<span class="account-name" data-testid="{testId}-name">{account.name}</span>
				{#if account.country}
					<span class="country-badge" data-testid="{testId}-country">{account.country}</span>
				{/if}
			</div>
			{#if account.institution}
				<span class="account-institution" data-testid="{testId}-institution">{account.institution}</span>
			{/if}
			{#if maskedBank}
				<span class="account-bank-number" data-testid="{testId}-bank-number">{maskedBank}</span>
			{/if}
		</div>
		<div class="account-balance-col" data-testid="{testId}-balance-col">
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
		{#if editable}
			<div class="kebab-menu-container" data-testid="{testId}-menu-col">
				<button
					class="kebab-btn"
					on:click|stopPropagation={openMenu}
					aria-label="Account actions"
					data-testid="{testId}-menu-btn"
				>
					&#8942;
				</button>
				{#if showMenu}
					<div class="kebab-dropdown" data-testid="{testId}-menu">
						<button class="kebab-option" on:click|stopPropagation={startEdit} data-testid="{testId}-menu-edit">
							Edit
						</button>
						<button class="kebab-option kebab-option--danger" on:click|stopPropagation={handleDelete} data-testid="{testId}-menu-delete">
							Delete
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<ConfirmDialog
	open={showDeleteConfirm}
	title="Delete account?"
	message="Are you sure you want to delete &quot;{account.name}&quot;? This action cannot be undone."
	confirmLabel="Delete"
	cancelLabel="Cancel"
	confirmVariant="danger"
	testId="{testId}-delete-confirm"
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

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
		flex: 1;
		min-width: 0;
	}

	.account-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.account-name-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.account-institution {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.account-bank-number {
		font-size: 0.6875rem;
		color: var(--text-secondary, #9ca3af);
		font-family: monospace;
	}

	.country-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		background: var(--bg-tertiary, #f3f4f6);
		padding: 1px 4px;
		border-radius: 3px;
		text-transform: uppercase;
	}

	.account-balance-col {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		flex-shrink: 0;
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

	:global(.dark) .country-badge {
		background: #2d2d2d;
		color: #9ca3af;
	}

	:global(.dark) .account-bank-number {
		color: #6b7280;
	}

	:global(.dark) .last-updated {
		color: #6b7280;
	}

	/* Kebab menu */
	.kebab-menu-container {
		position: relative;
		margin-left: 8px;
		width: 28px;
		flex-shrink: 0;
	}

	.kebab-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		color: var(--text-secondary, #9ca3af);
		font-size: 1.125rem;
		cursor: pointer;
		border-radius: 4px;
		line-height: 1;
	}

	.kebab-btn:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.kebab-dropdown {
		position: absolute;
		right: 0;
		top: 100%;
		z-index: 20;
		min-width: 100px;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		padding: 4px;
	}

	.kebab-option {
		display: block;
		width: 100%;
		padding: 6px 12px;
		border: none;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;
		border-radius: 4px;
	}

	.kebab-option:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.kebab-option--danger {
		color: var(--danger, #ef4444);
	}

	.kebab-option--danger:hover {
		background: rgba(239, 68, 68, 0.08);
	}

	/* Inline edit */
	.account-row--editing {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-color, #f3f4f6);
		position: relative;
		z-index: 10;
	}

	.edit-fields {
		display: flex;
		gap: 8px;
		flex: 1;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.edit-field--small {
		max-width: 140px;
	}

	.edit-field--tiny {
		max-width: 180px;
	}

	.edit-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		margin-bottom: 2px;
	}

	.edit-input {
		height: 30px;
		padding: 0 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		outline: none;
		width: 100%;
		box-sizing: border-box;
	}

	.edit-input:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.edit-error {
		color: var(--danger, #ef4444);
		font-size: 0.75rem;
	}

	.edit-actions {
		display: flex;
		gap: 4px;
	}

	.edit-btn {
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
	}

	.edit-btn--save {
		background: var(--accent, #4f46e5);
		color: white;
	}

	.edit-btn--save:hover {
		opacity: 0.9;
	}

	.edit-btn--cancel {
		background: var(--bg-secondary, #f3f4f6);
		color: var(--text-primary, #111827);
		border: 1px solid var(--border-color, #d1d5db);
	}

	.edit-btn--cancel:hover {
		background: var(--bg-hover, #e5e7eb);
	}

	:global(.dark) .kebab-btn:hover {
		background: #2d2d2d;
		color: #f9fafb;
	}

	:global(.dark) .kebab-dropdown {
		background: #1a1a1a;
		border-color: #374151;
	}

	:global(.dark) .kebab-option {
		color: #f9fafb;
	}

	:global(.dark) .kebab-option:hover {
		background: #2d2d2d;
	}

	:global(.dark) .edit-input {
		background: #1a1a1a;
		border-color: #374151;
		color: #f9fafb;
	}
</style>
