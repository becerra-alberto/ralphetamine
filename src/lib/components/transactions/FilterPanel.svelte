<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import DateRangeFilter from './DateRangeFilter.svelte';
	import AccountFilter from './AccountFilter.svelte';
	import CategoryFilter from './CategoryFilter.svelte';
	import TagsFilter from './TagsFilter.svelte';
	import AmountFilter from './AmountFilter.svelte';
	import type { Account } from '$lib/types/account';
	import type { CategoryNode, TagInfo } from '$lib/types/ui';
	import type { TransactionFilterState } from '$lib/stores/transactionFilters';

	export let filters: TransactionFilterState;
	export let accounts: Account[] = [];
	export let categories: CategoryNode[] = [];
	export let tags: TagInfo[] = [];
	export let activeFilterCount: number = 0;

	const dispatch = createEventDispatcher<{
		datePreset: { preset: string };
		dateChange: { start: string | null; end: string | null; preset: string | null };
		accountToggle: { accountId: string };
		accountSelectAll: void;
		accountClearAll: void;
		categoryToggle: { categoryId: string };
		categoryToggleParent: { parentId: string; childIds: string[] };
		tagToggle: { tag: string };
		amountChange: { min: number | null; max: number | null };
		typeChange: { type: 'all' | 'income' | 'expense' };
		clearAll: void;
		close: void;
	}>();

	let panelElement: HTMLElement;

	function handleTypeChange(type: 'all' | 'income' | 'expense') {
		dispatch('typeChange', { type });
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			dispatch('close');
		}
	}

	onMount(() => {
		// Focus the first interactive element
		const firstInput = panelElement?.querySelector('button, input, select');
		if (firstInput instanceof HTMLElement) {
			firstInput.focus();
		}
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<aside
	class="filter-panel"
	data-testid="filter-panel"
	bind:this={panelElement}
	role="complementary"
	aria-label="Transaction filters"
>
	<div class="panel-header">
		<h3 class="panel-title">
			Filters
			{#if activeFilterCount > 0}
				<span class="filter-badge" data-testid="filter-badge">{activeFilterCount}</span>
			{/if}
		</h3>
		<div class="panel-actions">
			{#if activeFilterCount > 0}
				<button
					type="button"
					class="clear-all-btn"
					on:click={() => dispatch('clearAll')}
					data-testid="clear-all-filters"
				>
					Clear all
				</button>
			{/if}
			<button
				type="button"
				class="close-btn"
				on:click={() => dispatch('close')}
				aria-label="Close filter panel"
				data-testid="filter-panel-close"
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
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</div>
	</div>

	<div class="panel-body">
		<DateRangeFilter
			startDate={filters.dateRange.start}
			endDate={filters.dateRange.end}
			activePreset={filters.dateRange.preset}
			on:preset={(e) => dispatch('datePreset', e.detail)}
			on:change={(e) => dispatch('dateChange', e.detail)}
		/>

		<div class="divider" />

		<AccountFilter
			{accounts}
			selectedIds={filters.accountIds}
			on:toggle={(e) => dispatch('accountToggle', e.detail)}
			on:selectAll={() => dispatch('accountSelectAll')}
			on:clearAll={() => dispatch('accountClearAll')}
		/>

		<div class="divider" />

		<CategoryFilter
			{categories}
			selectedIds={filters.categoryIds}
			on:toggle={(e) => dispatch('categoryToggle', e.detail)}
			on:toggleParent={(e) => dispatch('categoryToggleParent', e.detail)}
		/>

		<div class="divider" />

		<TagsFilter
			{tags}
			selectedTags={filters.tagNames}
			on:toggle={(e) => dispatch('tagToggle', e.detail)}
		/>

		<div class="divider" />

		<AmountFilter
			minAmount={filters.amountRange.min}
			maxAmount={filters.amountRange.max}
			on:change={(e) => dispatch('amountChange', e.detail)}
		/>

		<div class="divider" />

		<div class="filter-section" data-testid="type-filter">
			<h4 class="filter-label">Type</h4>
			<div class="type-radios">
				<label class="radio-item">
					<input
						type="radio"
						name="transaction-type"
						value="all"
						checked={filters.type === 'all'}
						on:change={() => handleTypeChange('all')}
						data-testid="type-all"
					/>
					<span>All</span>
				</label>
				<label class="radio-item">
					<input
						type="radio"
						name="transaction-type"
						value="income"
						checked={filters.type === 'income'}
						on:change={() => handleTypeChange('income')}
						data-testid="type-income"
					/>
					<span>Income only</span>
				</label>
				<label class="radio-item">
					<input
						type="radio"
						name="transaction-type"
						value="expense"
						checked={filters.type === 'expense'}
						on:change={() => handleTypeChange('expense')}
						data-testid="type-expense"
					/>
					<span>Expense only</span>
				</label>
			</div>
		</div>
	</div>
</aside>

<style>
	.filter-panel {
		display: flex;
		flex-direction: column;
		width: 280px;
		min-width: 280px;
		height: 100%;
		border-left: 1px solid var(--border-color, #e5e7eb);
		background: var(--bg-primary, #ffffff);
		overflow-y: auto;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.panel-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.filter-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background: var(--accent, #4f46e5);
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
	}

	.panel-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.clear-all-btn {
		font-size: 0.75rem;
		color: var(--accent, #4f46e5);
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 0;
	}

	.clear-all-btn:hover {
		text-decoration: underline;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
	}

	.close-btn:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		overflow-y: auto;
	}

	.divider {
		height: 1px;
		background: var(--border-color, #e5e7eb);
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	.type-radios {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.radio-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8rem;
		color: var(--text-primary, #111827);
		cursor: pointer;
	}

	.radio-item input[type='radio'] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	:global(.dark) .filter-panel {
		background: var(--bg-primary, #0f0f0f);
		border-color: var(--border-color, #374151);
	}

	:global(.dark) .panel-header {
		border-color: var(--border-color, #374151);
	}

	:global(.dark) .close-btn:hover {
		background: var(--bg-hover, #374151);
	}

	:global(.dark) .divider {
		background: var(--border-color, #374151);
	}
</style>
