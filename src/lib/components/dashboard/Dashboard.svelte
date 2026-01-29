<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuickShortcuts from './QuickShortcuts.svelte';
	import SummaryCards from './SummaryCards.svelte';
	import { dashboardStore, getCurrentMonth, calculateMonthSummary } from '../../stores/dashboard';
	import { getTransactionsForMonth } from '../../api/transactions';

	export let testId = 'dashboard';

	onMount(async () => {
		dashboardStore.setLoading(true);
		try {
			const month = getCurrentMonth();
			const transactions = await getTransactionsForMonth(month);
			const { incomeCents, expensesCents } = calculateMonthSummary(transactions);
			dashboardStore.setSummary(incomeCents, expensesCents);
		} catch {
			dashboardStore.setError('Failed to load dashboard data');
		} finally {
			dashboardStore.setLoading(false);
		}
	});

	function handleNavigate(event: CustomEvent<{ path: string }>) {
		goto(event.detail.path);
	}
</script>

<div class="dashboard" data-testid={testId}>
	<!-- Command Palette Prompt -->
	<div class="cmd-prompt" data-testid="{testId}-cmd-prompt">
		<p class="cmd-text" data-testid="{testId}-cmd-text">
			Press <kbd class="cmd-kbd">⌘K</kbd> to get started
		</p>
	</div>

	<!-- Quick Shortcuts -->
	<section class="dashboard-section" data-testid="{testId}-shortcuts-section">
		<QuickShortcuts testId="{testId}-shortcuts" on:navigate={handleNavigate} />
	</section>

	<!-- Current Month Summary -->
	<section class="dashboard-section" data-testid="{testId}-summary-section">
		<h2 class="section-title" data-testid="{testId}-summary-title">Current Month</h2>
		{#if $dashboardStore.isLoading}
			<p class="loading-text" data-testid="{testId}-loading">Loading summary...</p>
		{:else if $dashboardStore.error}
			<p class="error-text" data-testid="{testId}-error">{$dashboardStore.error}</p>
		{:else}
			<SummaryCards
				incomeCents={$dashboardStore.incomeCents}
				expensesCents={$dashboardStore.expensesCents}
				testId="{testId}-cards"
			/>
		{/if}
	</section>
</div>

<style>
	.dashboard {
		padding: 32px;
		max-width: 960px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.cmd-prompt {
		text-align: center;
		padding: 24px;
		border-radius: 12px;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
	}

	.cmd-text {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	.cmd-kbd {
		display: inline-block;
		padding: 2px 8px;
		font-size: 1rem;
		font-family: inherit;
		font-weight: 700;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		color: var(--accent, #4f46e5);
	}

	.dashboard-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.loading-text {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.error-text {
		font-size: 0.875rem;
		color: var(--danger, #ef4444);
	}

	/* Dark mode */
	:global(.dark) .cmd-prompt {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #2d2d2d;
	}

	:global(.dark) .cmd-kbd {
		background: #0f0f0f;
		border-color: #2d2d2d;
		color: #818cf8;
	}

	:global(.dark) .section-title {
		color: var(--text-primary, #f9fafb);
	}
</style>
