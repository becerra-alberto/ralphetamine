<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TransactionRow from './TransactionRow.svelte';
	import Pagination from '$lib/components/shared/Pagination.svelte';
	import type { TransactionWithDisplay, SortableColumn, SortDirection } from '$lib/stores/transactions';
	import type { Account } from '$lib/types/account';
	import type { CategoryNode } from '$lib/types/ui';

	export let transactions: TransactionWithDisplay[] = [];
	export let totalItems: number = 0;
	export let currentPage: number = 1;
	export let itemsPerPage: number = 50;
	export let sortColumn: SortableColumn = 'date';
	export let sortDirection: SortDirection = 'desc';
	export let isLoading: boolean = false;
	export let selectedId: string | null = null;
	export let expandedId: string | null = null;
	export let accounts: Account[] = [];
	export let categories: CategoryNode[] = [];

	const dispatch = createEventDispatcher<{
		pageChange: { page: number };
		sort: { column: SortableColumn };
		rowClick: { id: string };
		rowExpand: { id: string };
		save: { id: string; update: Record<string, any> };
		delete: { id: string };
	}>();

	type ColumnDef = {
		key: string;
		label: string;
		sortable: boolean;
		sortKey?: SortableColumn;
	};

	const columns: ColumnDef[] = [
		{ key: 'date', label: 'Date', sortable: true, sortKey: 'date' },
		{ key: 'payee', label: 'Payee', sortable: true, sortKey: 'payee' },
		{ key: 'category', label: 'Category', sortable: true, sortKey: 'category' },
		{ key: 'memo', label: 'Memo', sortable: false },
		{ key: 'outflow', label: 'Outflow', sortable: true, sortKey: 'amount' },
		{ key: 'inflow', label: 'Inflow', sortable: true, sortKey: 'amount' },
		{ key: 'account', label: 'Account', sortable: true, sortKey: 'account' },
		{ key: 'tags', label: 'Tags', sortable: false }
	];

	$: totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

	function handleSort(column: ColumnDef) {
		if (column.sortable && column.sortKey) {
			dispatch('sort', { column: column.sortKey });
		}
	}

	function handleColumnKeydown(event: KeyboardEvent, column: ColumnDef) {
		if ((event.key === 'Enter' || event.key === ' ') && column.sortable) {
			event.preventDefault();
			handleSort(column);
		}
	}

	function handlePageChange(event: CustomEvent<{ page: number }>) {
		dispatch('pageChange', event.detail);
	}

	function getSortIcon(column: ColumnDef): string {
		if (!column.sortable || column.sortKey !== sortColumn) return '';
		return sortDirection === 'asc' ? '↑' : '↓';
	}
</script>

<div class="transaction-table-container" data-testid="transaction-table">
	{#if isLoading}
		<div class="loading-overlay" data-testid="loading-overlay">
			<div class="loading-spinner"></div>
			<span>Loading transactions...</span>
		</div>
	{/if}

	{#if transactions.length === 0 && !isLoading}
		<div class="empty-state" data-testid="empty-state">
			<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<line x1="3" y1="9" x2="21" y2="9"></line>
				<line x1="9" y1="21" x2="9" y2="9"></line>
			</svg>
			<h3 class="empty-title">No transactions yet</h3>
			<p class="empty-description">Add your first transaction to start tracking your finances.</p>
		</div>
	{:else}
		<div class="table-wrapper">
			<table class="transaction-table" role="grid" aria-label="Transaction list">
				<thead>
					<tr>
						{#each columns as column}
							<th
								class="header-cell"
								class:sortable={column.sortable}
								class:sorted={column.sortKey === sortColumn}
								data-testid="header-{column.key}"
								role="columnheader"
								aria-sort={column.sortKey === sortColumn ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
								tabindex={column.sortable ? 0 : -1}
								on:click={() => handleSort(column)}
								on:keydown={(e) => handleColumnKeydown(e, column)}
							>
								<span class="header-content">
									{column.label}
									{#if column.sortable}
										<span class="sort-indicator" class:active={column.sortKey === sortColumn}>
											{getSortIcon(column) || '↕'}
										</span>
									{/if}
								</span>
							</th>
						{/each}
						<th class="header-cell header-cell-actions" data-testid="header-actions" role="columnheader">
							<span class="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each transactions as transaction (transaction.id)}
						<TransactionRow
							{transaction}
							categoryName={transaction.categoryName}
							accountName={transaction.accountName}
							isExpanded={expandedId === transaction.id}
							{accounts}
							{categories}
							on:click={() => dispatch('rowClick', { id: transaction.id })}
							on:expand={() => dispatch('rowExpand', { id: transaction.id })}
							on:save={(e) => dispatch('save', e.detail)}
							on:delete={(e) => dispatch('delete', e.detail)}
						/>
					{/each}
				</tbody>
			</table>
		</div>

		<Pagination
			{currentPage}
			{totalPages}
			{totalItems}
			{itemsPerPage}
			on:pageChange={handlePageChange}
		/>
	{/if}
</div>

<style>
	.transaction-table-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		overflow: hidden;
		position: relative;
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		z-index: 10;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-color, #e5e7eb);
		border-top-color: var(--color-accent, #4f46e5);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.table-wrapper {
		flex: 1;
		overflow: auto;
	}

	.transaction-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: auto;
	}

	.header-cell {
		padding: 12px 16px;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		white-space: nowrap;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.header-cell.sortable {
		cursor: pointer;
		user-select: none;
	}

	.header-cell.sortable:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.header-cell.sortable:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: -2px;
	}

	.header-cell.sorted {
		color: var(--color-accent, #4f46e5);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.sort-indicator {
		opacity: 0.3;
		font-size: 0.75rem;
	}

	.sort-indicator.active {
		opacity: 1;
		color: var(--color-accent, #4f46e5);
	}

	.header-cell[data-testid='header-outflow'],
	.header-cell[data-testid='header-inflow'] {
		text-align: right;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.empty-icon {
		color: var(--text-secondary, #6b7280);
		opacity: 0.5;
		margin-bottom: 16px;
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0 0 8px 0;
	}

	.empty-description {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		margin: 0;
		max-width: 300px;
	}

	.header-cell-actions {
		width: 40px;
		padding: 12px 8px;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	:global(.dark) .transaction-table-container {
		--bg-primary: #0f0f0f;
		--bg-secondary: #1a1a1a;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
	}

	:global(.dark) .loading-overlay {
		background: rgba(15, 15, 15, 0.9);
	}
</style>
