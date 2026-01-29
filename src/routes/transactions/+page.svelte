<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TransactionTable from '$lib/components/transactions/TransactionTable.svelte';
	import SearchBar from '$lib/components/transactions/SearchBar.svelte';
	import FilterPanel from '$lib/components/transactions/FilterPanel.svelte';
	import UncategorizedBanner from '$lib/components/transactions/UncategorizedBanner.svelte';
	import {
		transactionStore,
		filterTransactionsBySearch,
		uncategorizedCount as uncategorizedCountStore,
		type TransactionWithDisplay,
		type SortableColumn
	} from '$lib/stores/transactions';
	import {
		transactionFilterStore,
		activeFilterCount as activeFilterCountStore,
		applyTransactionFilters,
		type TransactionFilterState
	} from '$lib/stores/transactionFilters';
	import { getTransactionsPaginated } from '$lib/api/transactions';
	import type { Account } from '$lib/types/account';
	import type { CategoryNode, TagInfo } from '$lib/types/ui';

	// Local state for loading
	let isLoading = false;
	let error: string | null = null;

	// Filter panel data
	let accounts: Account[] = [];
	let categories: CategoryNode[] = [];
	let tags: TagInfo[] = [];

	// Subscribe to stores
	$: storeState = $transactionStore;
	$: filterState = $transactionFilterStore;
	$: filterCount = $activeFilterCountStore;
	$: currentPage = storeState.pagination.currentPage;
	$: itemsPerPage = storeState.pagination.itemsPerPage;
	$: totalItems = storeState.pagination.totalItems;
	$: sortColumn = storeState.sort.column;
	$: sortDirection = storeState.sort.direction;
	$: allTransactions = storeState.transactions;
	$: searchQuery = storeState.filters.search;
	$: selectedId = storeState.selectedId;
	$: expandedId = storeState.expandedId;
	$: uncategorizedCount = $uncategorizedCountStore;

	// Apply search filter first, then panel filters, then uncategorized-only filter
	$: searchFiltered = filterTransactionsBySearch(allTransactions, searchQuery);
	$: panelFiltered = applyTransactionFilters(searchFiltered, filterState);
	$: filteredTransactions = showUncategorizedOnly
		? panelFiltered.filter((t) => t.categoryId === null || t.categoryId === undefined || t.categoryId === '')
		: panelFiltered;
	$: transactions = filteredTransactions;
	$: displayedTotalItems =
		searchQuery.length >= 2 || filterCount > 0 || showUncategorizedOnly ? filteredTransactions.length : totalItems;

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
		loadFilterData();

		document.addEventListener('keydown', handleGlobalKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleGlobalKeydown);
	});

	function handleGlobalKeydown(event: KeyboardEvent) {
		// "/" key toggles filter panel (when not in an input)
		if (event.key === '/' && !isInputFocused()) {
			event.preventDefault();
			transactionFilterStore.toggle();
		}
	}

	function isInputFocused(): boolean {
		const el = document.activeElement;
		if (!el) return false;
		const tag = el.tagName.toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || (el as HTMLElement).isContentEditable;
	}

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
			const transactionsWithDisplay: TransactionWithDisplay[] = result.items.map((t) => ({
				...t,
				categoryName: null,
				accountName: 'Unknown'
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

	async function loadFilterData() {
		try {
			// Load accounts and categories via Tauri invoke
			const { invoke } = await import('@tauri-apps/api/core');
			const [accts, cats] = await Promise.all([
				invoke<Account[]>('get_accounts'),
				invoke<any[]>('get_categories')
			]);

			accounts = accts || [];
			categories = (cats || []).map(mapCategoryNode);

			// Build tag list from loaded transactions
			rebuildTags();
		} catch {
			// Gracefully handle missing backend (e.g., in test/dev mode)
			accounts = [];
			categories = [];
			tags = [];
		}
	}

	function mapCategoryNode(cat: any): CategoryNode {
		return {
			id: cat.id,
			name: cat.name,
			parentId: cat.parentId || null,
			type: cat.type || 'expense',
			children: (cat.children || []).map(mapCategoryNode)
		};
	}

	function rebuildTags() {
		const tagCounts = new Map<string, number>();
		for (const t of allTransactions) {
			for (const tag of t.tags) {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			}
		}
		tags = Array.from(tagCounts.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	// Rebuild tags whenever transactions change
	$: if (allTransactions) rebuildTags();

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

	function handleSearch(event: CustomEvent<{ query: string }>) {
		transactionStore.setSearch(event.detail.query);
	}

	function handleSearchClear() {
		transactionStore.clearSearch();
	}

	function handleFilterToggle() {
		transactionFilterStore.toggle();
	}

	function handleFilterDatePreset(event: CustomEvent<{ preset: string }>) {
		transactionFilterStore.setDatePreset(event.detail.preset);
	}

	function handleFilterDateChange(event: CustomEvent<{ start: string | null; end: string | null; preset: string | null }>) {
		transactionFilterStore.setDateRange(event.detail);
	}

	function handleFilterAccountToggle(event: CustomEvent<{ accountId: string }>) {
		transactionFilterStore.toggleAccountId(event.detail.accountId);
	}

	function handleFilterAccountSelectAll() {
		transactionFilterStore.setAccountIds(accounts.map((a) => a.id));
	}

	function handleFilterAccountClearAll() {
		transactionFilterStore.setAccountIds([]);
	}

	function handleFilterCategoryToggle(event: CustomEvent<{ categoryId: string }>) {
		transactionFilterStore.toggleCategoryId(event.detail.categoryId);
	}

	function handleFilterCategoryToggleParent(event: CustomEvent<{ parentId: string; childIds: string[] }>) {
		const { childIds } = event.detail;
		const allSelected = childIds.every((id) => filterState.categoryIds.includes(id));
		if (allSelected) {
			// Deselect all children
			transactionFilterStore.setCategoryIds(
				filterState.categoryIds.filter((id) => !childIds.includes(id))
			);
		} else {
			// Select all children
			const newIds = new Set([...filterState.categoryIds, ...childIds]);
			transactionFilterStore.setCategoryIds(Array.from(newIds));
		}
	}

	function handleFilterTagToggle(event: CustomEvent<{ tag: string }>) {
		transactionFilterStore.toggleTag(event.detail.tag);
	}

	function handleFilterAmountChange(event: CustomEvent<{ min: number | null; max: number | null }>) {
		transactionFilterStore.setAmountRange(event.detail.min, event.detail.max);
	}

	function handleFilterTypeChange(event: CustomEvent<{ type: 'all' | 'income' | 'expense' }>) {
		transactionFilterStore.setType(event.detail.type);
	}

	function handleFilterClearAll() {
		transactionFilterStore.clearAll();
	}

	function handleFilterClose() {
		transactionFilterStore.close();
	}

	let showUncategorizedOnly = false;

	function handleCategorizeNow() {
		// Clear other filters and show only uncategorized
		transactionFilterStore.clearAll();
		transactionStore.clearSearch();
		showUncategorizedOnly = true;
		// Select the first uncategorized transaction
		const firstUncategorized = allTransactions.find(
			(t) => t.categoryId === null || t.categoryId === undefined || t.categoryId === ''
		);
		if (firstUncategorized) {
			transactionStore.selectTransaction(firstUncategorized.id);
		}
	}

	function handleBannerDismiss() {
		// Banner handles its own dismiss state via session storage
	}

	function handleClearUncategorizedFilter() {
		showUncategorizedOnly = false;
	}
</script>

<svelte:head>
	<title>Stackz - Transactions</title>
</svelte:head>

<div class="transactions-page-wrapper" data-testid="transactions-page">
	<div class="transactions-page">
		<header class="page-header">
			<h1 class="page-title">Transactions</h1>
			<div class="header-actions">
				<SearchBar
					value={searchQuery}
					filteredCount={filteredTransactions.length}
					totalCount={totalItems}
					on:search={handleSearch}
					on:clear={handleSearchClear}
				/>
				<button
					type="button"
					class="filter-toggle-btn"
					on:click={handleFilterToggle}
					aria-label="Toggle filters"
					data-testid="filter-toggle"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
					</svg>
					{#if filterCount > 0}
						<span class="filter-count-badge" data-testid="filter-count-badge">{filterCount}</span>
					{/if}
				</button>
			</div>
		</header>

		{#if error}
			<div class="error-banner" role="alert" data-testid="error-banner">
				<span>{error}</span>
				<button type="button" on:click={loadTransactions}>Retry</button>
			</div>
		{/if}

		<UncategorizedBanner
			count={uncategorizedCount}
			on:categorize={handleCategorizeNow}
			on:dismiss={handleBannerDismiss}
		/>

		{#if showUncategorizedOnly}
			<div class="uncategorized-filter-active" data-testid="uncategorized-filter-active">
				<span>Showing uncategorized transactions only</span>
				<button type="button" on:click={handleClearUncategorizedFilter} data-testid="clear-uncategorized-filter">
					Show all
				</button>
			</div>
		{/if}

		<div class="table-container">
			{#if (searchQuery.length >= 2 || filterCount > 0) && filteredTransactions.length === 0 && !isLoading}
				<div class="no-results" data-testid="no-results">
					{#if searchQuery.length >= 2}
						<p>No transactions match '{searchQuery}'</p>
					{:else}
						<p>No transactions match the selected filters</p>
					{/if}
				</div>
			{:else}
				<TransactionTable
					{transactions}
					totalItems={displayedTotalItems}
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
			{/if}
		</div>
	</div>

	{#if filterState.isOpen}
		<FilterPanel
			filters={filterState}
			{accounts}
			{categories}
			{tags}
			activeFilterCount={filterCount}
			on:datePreset={handleFilterDatePreset}
			on:dateChange={handleFilterDateChange}
			on:accountToggle={handleFilterAccountToggle}
			on:accountSelectAll={handleFilterAccountSelectAll}
			on:accountClearAll={handleFilterAccountClearAll}
			on:categoryToggle={handleFilterCategoryToggle}
			on:categoryToggleParent={handleFilterCategoryToggleParent}
			on:tagToggle={handleFilterTagToggle}
			on:amountChange={handleFilterAmountChange}
			on:typeChange={handleFilterTypeChange}
			on:clearAll={handleFilterClearAll}
			on:close={handleFilterClose}
		/>
	{/if}
</div>

<style>
	.transactions-page-wrapper {
		display: flex;
		height: 100%;
	}

	.transactions-page {
		display: flex;
		flex-direction: column;
		flex: 1;
		height: 100%;
		padding: 24px;
		gap: 16px;
		min-width: 0;
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

	.uncategorized-filter-active {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: rgba(79, 70, 229, 0.08);
		border: 1px solid var(--accent, #4f46e5);
		border-radius: 8px;
		color: var(--accent, #4f46e5);
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.uncategorized-filter-active button {
		padding: 4px 10px;
		background: transparent;
		border: 1px solid var(--accent, #4f46e5);
		border-radius: 4px;
		color: var(--accent, #4f46e5);
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.uncategorized-filter-active button:hover {
		background: var(--accent, #4f46e5);
		color: white;
	}

	.no-results {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.no-results p {
		margin: 0;
	}

	.filter-toggle-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		height: 36px;
		padding: 0 10px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		position: relative;
		transition: border-color 0.15s ease;
	}

	.filter-toggle-btn:hover {
		border-color: var(--accent, #4f46e5);
		color: var(--accent, #4f46e5);
	}

	.filter-count-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 8px;
		background: var(--accent, #4f46e5);
		color: white;
		font-size: 0.625rem;
		font-weight: 700;
	}

	/* Dark mode */
	:global(.dark) .transactions-page {
		--text-primary: #f9fafb;
	}

	:global(.dark) .filter-toggle-btn {
		background: var(--bg-secondary, #1a1a1a);
		border-color: var(--border-color, #374151);
		color: var(--text-secondary, #9ca3af);
	}
</style>
