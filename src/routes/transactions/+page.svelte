<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TransactionTable from '$lib/components/transactions/TransactionTable.svelte';
	import {
		transactionStore,
		totalPages,
		type TransactionWithDisplay,
		type SortableColumn
	} from '$lib/stores/transactions';
	import { getTransactionsPaginated } from '$lib/api/transactions';

	// Local state for loading
	let isLoading = false;
	let error: string | null = null;

	// Subscribe to store
	$: storeState = $transactionStore;
	$: currentPage = storeState.pagination.currentPage;
	$: itemsPerPage = storeState.pagination.itemsPerPage;
	$: totalItems = storeState.pagination.totalItems;
	$: sortColumn = storeState.sort.column;
	$: sortDirection = storeState.sort.direction;
	$: transactions = storeState.transactions;
	$: selectedId = storeState.selectedId;
	$: expandedId = storeState.expandedId;

	// Load transactions on mount and when pagination/sort changes
	onMount(() => {
		// Parse URL params for initial state
		const urlPage = $page.url.searchParams.get('page');
		const urlSort = $page.url.searchParams.get('sort');
		const urlOrder = $page.url.searchParams.get('order');

		if (urlPage) {
			transactionStore.setPage(parseInt(urlPage, 10));
		}
		if (urlSort && isValidSortColumn(urlSort)) {
			transactionStore.setSort(urlSort as SortableColumn, (urlOrder as 'asc' | 'desc') || 'desc');
		}

		loadTransactions();
	});

	function isValidSortColumn(value: string): boolean {
		return ['date', 'payee', 'category', 'amount', 'account'].includes(value);
	}

	async function loadTransactions() {
		isLoading = true;
		transactionStore.setLoading(true);

		try {
			const offset = (currentPage - 1) * itemsPerPage;
			const result = await getTransactionsPaginated({
				limit: itemsPerPage,
				offset,
				sortField: mapSortColumnToField(sortColumn),
				sortDirection
			});

			// Transform transactions to include display names
			// TODO: In future, fetch categories and accounts to get real names
			const transactionsWithDisplay: TransactionWithDisplay[] = result.items.map((t) => ({
				...t,
				categoryName: null, // Will be populated when categories API is integrated
				accountName: 'Unknown' // Will be populated when accounts API is integrated
			}));

			transactionStore.setTransactions(transactionsWithDisplay, result.totalCount);
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load transactions';
			transactionStore.setError(error);
		} finally {
			isLoading = false;
			transactionStore.setLoading(false);
		}
	}

	function mapSortColumnToField(column: SortableColumn): string {
		const mapping: Record<SortableColumn, string> = {
			date: 'date',
			payee: 'payee',
			category: 'date', // Categories not directly sortable
			amount: 'amount_cents',
			account: 'date' // Accounts not directly sortable
		};
		return mapping[column];
	}

	function updateUrlParams() {
		const params = new URLSearchParams();
		if (currentPage > 1) params.set('page', String(currentPage));
		if (sortColumn !== 'date') params.set('sort', sortColumn);
		if (sortDirection !== 'desc') params.set('order', sortDirection);

		const queryString = params.toString();
		const newUrl = queryString ? `?${queryString}` : '/transactions';
		goto(newUrl, { replaceState: true, keepFocus: true });
	}

	function handlePageChange(event: CustomEvent<{ page: number }>) {
		transactionStore.setPage(event.detail.page);
		updateUrlParams();
		loadTransactions();
	}

	function handleSort(event: CustomEvent<{ column: SortableColumn }>) {
		transactionStore.toggleSort(event.detail.column);
		updateUrlParams();
		loadTransactions();
	}

	function handleRowClick(event: CustomEvent<{ id: string }>) {
		transactionStore.selectTransaction(event.detail.id);
	}

	function handleRowExpand(event: CustomEvent<{ id: string }>) {
		transactionStore.toggleExpanded(event.detail.id);
	}
</script>

<svelte:head>
	<title>Stackz - Transactions</title>
</svelte:head>

<div class="transactions-page" data-testid="transactions-page">
	<header class="page-header">
		<h1 class="page-title">Transactions</h1>
		<div class="header-actions">
			<!-- Future: Add transaction button, filters, etc. -->
		</div>
	</header>

	{#if error}
		<div class="error-banner" role="alert" data-testid="error-banner">
			<span>{error}</span>
			<button type="button" on:click={loadTransactions}>Retry</button>
		</div>
	{/if}

	<div class="table-container">
		<TransactionTable
			{transactions}
			{totalItems}
			{currentPage}
			{itemsPerPage}
			{sortColumn}
			{sortDirection}
			{isLoading}
			{selectedId}
			{expandedId}
			on:pageChange={handlePageChange}
			on:sort={handleSort}
			on:rowClick={handleRowClick}
			on:rowExpand={handleRowExpand}
		/>
	</div>
</div>

<style>
	.transactions-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 24px;
		gap: 16px;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 12px;
	}

	.table-container {
		flex: 1;
		min-height: 0;
	}

	.error-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-danger, #ef4444);
		border-radius: 8px;
		color: var(--color-danger, #ef4444);
	}

	.error-banner button {
		padding: 6px 12px;
		background: var(--color-danger, #ef4444);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.error-banner button:hover {
		opacity: 0.9;
	}

	/* Dark mode */
	:global(.dark) .transactions-page {
		--text-primary: #f9fafb;
	}
</style>
