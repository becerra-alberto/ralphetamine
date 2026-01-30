<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Transaction } from '$lib/types/transaction';
	import { formatCentsCurrency } from '$lib/utils/currency';
	import type { Account } from '$lib/types/account';
	import type { CategoryNode } from '$lib/types/ui';

	export let transaction: Transaction;
	export let categoryName: string | null = null;
	export let accountName: string = 'Unknown';
	export let isExpanded: boolean = false;
	export let accounts: Account[] = [];
	export let categories: CategoryNode[] = [];

	const dispatch = createEventDispatcher<{
		click: { id: string };
		expand: { id: string };
		save: { id: string; update: Record<string, any> };
		delete: { id: string };
	}>();

	$: isInflow = transaction.amountCents > 0;
	$: isOutflow = transaction.amountCents < 0;

	$: outflowDisplay = isOutflow
		? formatCentsCurrency(Math.abs(transaction.amountCents))
		: '-';
	$: inflowDisplay = isInflow
		? formatCentsCurrency(transaction.amountCents)
		: '-';

	// Edit state
	let isEditing = false;
	let editDate = '';
	let editPayee = '';
	let editCategoryId = '';
	let editMemo = '';
	let editAmountStr = '';
	let editIsExpense = true;
	let editAccountId = '';
	let isSaving = false;

	function initEditForm() {
		editDate = transaction.date;
		editPayee = transaction.payee;
		editCategoryId = transaction.categoryId || '';
		editMemo = transaction.memo || '';
		const absCents = Math.abs(transaction.amountCents);
		editAmountStr = (absCents / 100).toFixed(2);
		editIsExpense = transaction.amountCents < 0;
		editAccountId = transaction.accountId;
		isEditing = true;
	}

	function cancelEdit() {
		isEditing = false;
	}

	function dollarsToCents(dollars: string): number {
		const cleaned = dollars.replace(/[^0-9.]/g, '');
		const parsed = parseFloat(cleaned);
		if (isNaN(parsed)) return 0;
		return Math.round(parsed * 100);
	}

	async function saveEdit() {
		if (!editPayee.trim() || !editDate || !editAccountId) return;
		isSaving = true;

		const cents = dollarsToCents(editAmountStr);
		const finalCents = editIsExpense ? -Math.abs(cents) : Math.abs(cents);

		dispatch('save', {
			id: transaction.id,
			update: {
				date: editDate,
				payee: editPayee.trim(),
				categoryId: editCategoryId || null,
				memo: editMemo.trim() || null,
				amountCents: finalCents,
				accountId: editAccountId
			}
		});

		isSaving = false;
		isEditing = false;
	}

	function handleDelete() {
		dispatch('delete', { id: transaction.id });
	}

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			cancelEdit();
		}
	}

	function handleAmountInput(event: Event) {
		const input = event.target as HTMLInputElement;
		input.value = input.value.replace(/[^0-9.\-]/g, '');
		editAmountStr = input.value;
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T00:00:00');
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	function handleEditClick() {
		dispatch('expand', { id: transaction.id });
	}

	function handleClick() {
		dispatch('click', { id: transaction.id });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			dispatch('expand', { id: transaction.id });
		}
	}

	function flattenCategoryOptions(nodes: CategoryNode[], prefix: string = ''): { id: string; name: string }[] {
		const result: { id: string; name: string }[] = [];
		for (const node of nodes) {
			result.push({ id: node.id, name: prefix + node.name });
			if (node.children && node.children.length > 0) {
				result.push(...flattenCategoryOptions(node.children, prefix + '  '));
			}
		}
		return result;
	}

	$: categoryOptions = flattenCategoryOptions(categories);
</script>

<tr
	class="transaction-row"
	class:expanded={isExpanded}
	data-testid="transaction-row"
	data-id={transaction.id}
	tabindex="0"
	on:click={handleClick}
	on:keydown={handleKeydown}
>
	<td class="cell cell-date" data-testid="cell-date">
		{formatDate(transaction.date)}
	</td>
	<td class="cell cell-payee" data-testid="cell-payee">
		{transaction.payee}
	</td>
	<td class="cell cell-category" data-testid="cell-category">
		{categoryName || '-'}
	</td>
	<td class="cell cell-memo" data-testid="cell-memo">
		{transaction.memo || '-'}
	</td>
	<td class="cell cell-outflow" class:has-value={isOutflow} data-testid="cell-outflow">
		{outflowDisplay}
	</td>
	<td class="cell cell-inflow" class:has-value={isInflow && transaction.amountCents !== 0} data-testid="cell-inflow">
		{inflowDisplay}
	</td>
	<td class="cell cell-account" data-testid="cell-account">
		{accountName}
	</td>
	<td class="cell cell-tags" data-testid="cell-tags">
		{#if transaction.tags && transaction.tags.length > 0}
			<div class="tags-container">
				{#each transaction.tags as tag}
					<span class="tag-chip" data-testid="tag-chip">{tag}</span>
				{/each}
			</div>
		{:else}
			-
		{/if}
	</td>
	<td class="cell cell-actions" data-testid="cell-actions">
		<button
			type="button"
			class="edit-icon-btn"
			on:click|stopPropagation={handleEditClick}
			aria-label="Edit transaction"
			data-testid="edit-icon-btn"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
				<path d="m15 5 4 4"/>
			</svg>
		</button>
	</td>
</tr>

{#if isExpanded}
	<tr class="expansion-row" data-testid="expansion-row">
		<td colspan="9">
			<div class="expansion-content">
				{#if isEditing}
					<!-- Edit Form -->
					<div class="edit-form" data-testid="edit-form">
						<div class="edit-row">
							<div class="edit-field">
								<label class="edit-label">Date</label>
								<input
									type="date"
									class="edit-input"
									bind:value={editDate}
									on:keydown={handleEditKeydown}
									data-testid="edit-date"
								/>
							</div>
							<div class="edit-field edit-field-wide">
								<label class="edit-label">Payee</label>
								<input
									type="text"
									class="edit-input"
									bind:value={editPayee}
									placeholder="Payee"
									on:keydown={handleEditKeydown}
									data-testid="edit-payee"
								/>
							</div>
							<div class="edit-field">
								<label class="edit-label">Category</label>
								<select class="edit-input" bind:value={editCategoryId} data-testid="edit-category">
									<option value="">Uncategorized</option>
									{#each categoryOptions as cat}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="edit-row">
							<div class="edit-field edit-field-wide">
								<label class="edit-label">Memo</label>
								<input
									type="text"
									class="edit-input"
									bind:value={editMemo}
									placeholder="Memo"
									on:keydown={handleEditKeydown}
									data-testid="edit-memo"
								/>
							</div>
							<div class="edit-field">
								<label class="edit-label">Amount</label>
								<div class="edit-amount-wrapper">
									<button
										type="button"
										class="edit-sign-toggle"
										class:income={!editIsExpense}
										on:click|stopPropagation={() => { editIsExpense = !editIsExpense; }}
									>
										{editIsExpense ? '-' : '+'}
									</button>
									<input
										type="text"
										inputmode="decimal"
										class="edit-input edit-amount-input"
										bind:value={editAmountStr}
										on:input={handleAmountInput}
										on:keydown={handleEditKeydown}
										data-testid="edit-amount"
									/>
								</div>
							</div>
							<div class="edit-field">
								<label class="edit-label">Account</label>
								<select class="edit-input" bind:value={editAccountId} data-testid="edit-account">
									{#each accounts as acct}
										<option value={acct.id}>{acct.name}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="edit-actions">
							<button
								type="button"
								class="edit-btn edit-btn-save"
								on:click|stopPropagation={saveEdit}
								disabled={isSaving}
								data-testid="edit-save"
							>
								{isSaving ? 'Saving...' : 'Save'}
							</button>
							<button
								type="button"
								class="edit-btn edit-btn-cancel"
								on:click|stopPropagation={cancelEdit}
								data-testid="edit-cancel"
							>
								Cancel
							</button>
							<button
								type="button"
								class="edit-btn edit-btn-delete"
								on:click|stopPropagation={handleDelete}
								data-testid="edit-delete"
							>
								Delete
							</button>
						</div>
					</div>
				{:else}
					<!-- View / Edit button -->
					<div class="expansion-section">
						<button
							type="button"
							class="edit-trigger-btn"
							on:click|stopPropagation={initEditForm}
							data-testid="edit-trigger"
						>
							Edit Transaction
						</button>
					</div>
				{/if}
			</div>
		</td>
	</tr>
{/if}

<style>
	.transaction-row {
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.transaction-row:hover {
		background: var(--bg-hover, #f9fafb);
	}

	.transaction-row:focus-visible {
		outline: 2px solid var(--accent, #4f46e5);
		outline-offset: -2px;
	}

	.transaction-row.expanded {
		background: var(--bg-expanded, #e0e7ff);
		border-left: 3px solid var(--color-accent, #4f46e5);
	}

	.cell {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		vertical-align: middle;
	}

	.cell-date {
		font-feature-settings: 'tnum' 1;
		white-space: nowrap;
	}

	.cell-payee {
		font-weight: 500;
	}

	.cell-category,
	.cell-memo {
		color: var(--text-secondary, #6b7280);
	}

	.cell-outflow,
	.cell-inflow {
		text-align: right;
		font-feature-settings: 'tnum' 1;
		font-weight: 500;
	}

	.cell-outflow.has-value {
		color: var(--danger, #ef4444);
	}

	.cell-inflow.has-value {
		color: var(--success, #10b981);
	}

	.cell-account {
		color: var(--text-secondary, #6b7280);
	}

	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--accent-light, #eef2ff);
		color: var(--accent, #4f46e5);
		border-radius: 9999px;
		white-space: nowrap;
	}

	.cell-actions {
		width: 40px;
		text-align: center;
		padding: 12px 8px;
	}

	.edit-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		color: var(--text-secondary, #9ca3af);
		cursor: pointer;
		border-radius: 4px;
		opacity: 0;
		transition: opacity 0.15s ease, background-color 0.15s ease;
		padding: 0;
	}

	.transaction-row:hover .edit-icon-btn,
	.edit-icon-btn:focus-visible {
		opacity: 1;
	}

	.edit-icon-btn:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--accent, #4f46e5);
	}

	.edit-icon-btn:focus-visible {
		outline: 2px solid var(--accent, #4f46e5);
		outline-offset: -2px;
	}

	.expansion-row {
		background: var(--bg-secondary, #f8f9fa);
	}

	.expansion-content {
		padding: 16px 24px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.expansion-section {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.edit-trigger-btn {
		padding: 8px 16px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
	}

	.edit-trigger-btn:hover {
		opacity: 0.9;
	}

	/* Edit form styles */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.edit-row {
		display: flex;
		gap: 12px;
		align-items: flex-end;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}

	.edit-field-wide {
		flex: 2;
	}

	.edit-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
	}

	.edit-input {
		height: 34px;
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

	select.edit-input {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 8px center;
		padding-right: 24px;
	}

	.edit-amount-wrapper {
		display: flex;
		align-items: center;
	}

	.edit-sign-toggle {
		height: 34px;
		width: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-color, #d1d5db);
		border-right: none;
		border-radius: 4px 0 0 4px;
		background: var(--bg-secondary, #f9fafb);
		color: var(--danger, #ef4444);
		font-weight: 700;
		font-size: 1rem;
		cursor: pointer;
		padding: 0;
	}

	.edit-sign-toggle.income {
		color: var(--success, #10b981);
		background: rgba(16, 185, 129, 0.08);
	}

	.edit-amount-input {
		border-radius: 0 4px 4px 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.edit-actions {
		display: flex;
		gap: 8px;
		padding-top: 4px;
	}

	.edit-btn {
		padding: 6px 14px;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
	}

	.edit-btn-save {
		background: var(--accent, #4f46e5);
		color: white;
	}

	.edit-btn-save:hover:not(:disabled) {
		opacity: 0.9;
	}

	.edit-btn-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.edit-btn-cancel {
		background: var(--bg-secondary, #f3f4f6);
		color: var(--text-primary, #111827);
		border: 1px solid var(--border-color, #d1d5db);
	}

	.edit-btn-cancel:hover {
		background: var(--bg-hover, #e5e7eb);
	}

	.edit-btn-delete {
		background: transparent;
		color: var(--danger, #ef4444);
		border: 1px solid var(--danger, #ef4444);
		margin-left: auto;
	}

	.edit-btn-delete:hover {
		background: rgba(239, 68, 68, 0.08);
	}

	:global(.dark) .transaction-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(.dark) .transaction-row.expanded {
		background: var(--bg-secondary, #1a1a1a);
	}

	:global(.dark) .cell {
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--border-color: #2d2d2d;
	}

	:global(.dark) .tag-chip {
		background: rgba(79, 70, 229, 0.2);
		color: #a5b4fc;
	}

	:global(.dark) .expansion-row {
		background: var(--bg-secondary, #1a1a1a);
	}

	:global(.dark) .edit-input {
		background: #1a1a1a;
		border-color: #374151;
		color: #f9fafb;
	}

	:global(.dark) .edit-icon-btn:hover {
		background: #2d2d2d;
		color: #a5b4fc;
	}
</style>
