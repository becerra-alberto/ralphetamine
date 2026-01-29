<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import BudgetGrid from '$lib/components/budget/BudgetGrid.svelte';
	import DateRangeSelector from '$lib/components/budget/DateRangeSelector.svelte';
	import { budgetStore } from '$lib/stores/budget';
	import { getDefaultDateRange, getMonthRange, isValidMonth } from '$lib/utils/dates';
	import type { MonthString } from '$lib/types/budget';

	// Get initial range from URL params or use default
	let startMonth: MonthString;
	let endMonth: MonthString;

	// Initialize from URL params on mount
	onMount(() => {
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
	});

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
</style>
