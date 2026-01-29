<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import BudgetGrid from '$lib/components/budget/BudgetGrid.svelte';
	import DateRangeSelector from '$lib/components/budget/DateRangeSelector.svelte';
	import BudgetAdjustmentModal from '$lib/components/budget/BudgetAdjustmentModal.svelte';
	import { budgetStore } from '$lib/stores/budget';
	import { getDefaultDateRange, getMonthRange, isValidMonth } from '$lib/utils/dates';
	import type { MonthString } from '$lib/types/budget';
	import type { Category } from '$lib/types/category';

	// Get initial range from URL params or use default
	let startMonth: MonthString;
	let endMonth: MonthString;

	// Modal state
	let showAdjustmentModal: boolean = false;
	let categories: Category[] = [];

	// Keyboard shortcut handler
	function handleKeydown(event: KeyboardEvent) {
		// Cmd+Shift+B (Mac) or Ctrl+Shift+B (Windows/Linux) - Open batch adjustment modal
		if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'b') {
			event.preventDefault();
			openAdjustmentModal();
		}
	}

	function openAdjustmentModal() {
		showAdjustmentModal = true;
	}

	function closeAdjustmentModal() {
		showAdjustmentModal = false;
	}

	// Initialize from URL params on mount
	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		const params = $page.url.searchParams;
		const urlStart = params.get('start');
		const urlEnd = params.get('end');

		if (urlStart && urlEnd && isValidMonth(urlStart) && isValidMonth(urlEnd)) {
			startMonth = urlStart as MonthString;
			endMonth = urlEnd as MonthString;
		} else {
			const defaultRange = getDefaultDateRange();
			startMonth = defaultRange[0];
			endMonth = defaultRange[defaultRange.length - 1];
		}

		// Update store with initial range
		budgetStore.setDateRange(getMonthRange(startMonth, endMonth));

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	// Subscribe to get categories from store
	$: categories = $budgetStore.categories;

	// Handle date range changes
	function handleRangeChange(event: CustomEvent<{ startMonth: MonthString; endMonth: MonthString }>) {
		const { startMonth: newStart, endMonth: newEnd } = event.detail;
		startMonth = newStart;
		endMonth = newEnd;

		// Update store
		budgetStore.setDateRange(getMonthRange(newStart, newEnd));

		// Update URL without navigation (for bookmarking)
		const url = new URL(window.location.href);
		url.searchParams.set('start', newStart);
		url.searchParams.set('end', newEnd);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Stackz - Budget</title>
</svelte:head>

<div class="budget-page" data-testid="budget-page">
	<header class="budget-header">
		<div class="header-left">
			<h1 class="budget-title">Budget</h1>
		</div>
		<div class="header-right">
			<button
				type="button"
				class="adjust-budgets-btn"
				data-testid="adjust-budgets-btn"
				on:click={openAdjustmentModal}
			>
				Adjust Budgets
			</button>
			{#if startMonth && endMonth}
				<DateRangeSelector
					{startMonth}
					{endMonth}
					on:change={handleRangeChange}
				/>
			{/if}
		</div>
	</header>

	<main class="budget-content">
		<BudgetGrid />
	</main>
</div>

<!-- Budget Adjustment Modal -->
<BudgetAdjustmentModal
	open={showAdjustmentModal}
	{categories}
	on:close={closeAdjustmentModal}
/>

<style>
	.budget-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 16px 24px;
	}

	.budget-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.adjust-budgets-btn {
		display: inline-flex;
		align-items: center;
		padding: 8px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		cursor: pointer;
		transition:
			background 100ms ease,
			border-color 100ms ease;
	}

	.adjust-budgets-btn:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.adjust-budgets-btn:focus {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 2px;
	}

	.budget-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
	}

	.budget-content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	/* Dark mode */
	:global(.dark) .budget-page {
		--text-primary: #f9fafb;
	}

	:global(.dark) .adjust-budgets-btn {
		--bg-primary: #1a1a1a;
		--border-color: #2d2d2d;
		--bg-hover: #2d2d2d;
		--text-primary: #f9fafb;
	}
</style>
