<script lang="ts">
	import BudgetGrid from '$lib/components/budget/BudgetGrid.svelte';
</script>

<svelte:head>
	<title>Stackz - Budget</title>
</svelte:head>

<div class="budget-page" data-testid="budget-page">
	<header class="budget-header">
		<h1 class="budget-title">Budget</h1>
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
		margin-bottom: 16px;
		flex-shrink: 0;
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
