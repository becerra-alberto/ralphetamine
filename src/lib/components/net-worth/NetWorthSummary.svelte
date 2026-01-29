<script lang="ts">
	import SummaryCard from './SummaryCard.svelte';

	export let totalAssetsCents: number = 0;
	export let totalLiabilitiesCents: number = 0;
	export let netWorthCents: number = 0;
	export let hasAccounts: boolean = true;
	export let testId = 'net-worth-summary';

	// Progress bar: percentage of net worth that each component represents
	$: totalAbsolute = totalAssetsCents + totalLiabilitiesCents;
	$: assetsPercent = totalAbsolute > 0 ? (totalAssetsCents / totalAbsolute) * 100 : 0;
	$: liabilitiesPercent =
		totalAbsolute > 0 ? (totalLiabilitiesCents / totalAbsolute) * 100 : 0;
</script>

<section class="net-worth-summary" data-testid={testId}>
	{#if !hasAccounts}
		<div class="empty-state" data-testid="{testId}-empty">
			<SummaryCard
				label="Total Assets"
				amountCents={0}
				colorTheme="green"
				testId="{testId}-assets"
			/>
			<SummaryCard
				label="Total Liabilities"
				amountCents={0}
				colorTheme="red"
				testId="{testId}-liabilities"
			/>
			<SummaryCard
				label="Net Worth"
				amountCents={0}
				colorTheme="auto"
				isProminent
				testId="{testId}-net-worth"
			/>
			<p class="empty-prompt" data-testid="{testId}-prompt">
				Add your first account to start tracking your net worth.
			</p>
		</div>
	{:else}
		<div class="summary-cards" data-testid="{testId}-cards">
			<SummaryCard
				label="Total Assets"
				amountCents={totalAssetsCents}
				colorTheme="green"
				progressPercent={assetsPercent}
				testId="{testId}-assets"
			/>
			<SummaryCard
				label="Total Liabilities"
				amountCents={totalLiabilitiesCents}
				colorTheme="red"
				progressPercent={liabilitiesPercent}
				testId="{testId}-liabilities"
			/>
			<SummaryCard
				label="Net Worth"
				amountCents={netWorthCents}
				colorTheme="auto"
				isProminent
				testId="{testId}-net-worth"
			/>
		</div>
	{/if}
</section>

<style>
	.net-worth-summary {
		width: 100%;
	}

	.summary-cards {
		display: flex;
		gap: 16px;
	}

	.empty-state {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		position: relative;
	}

	.empty-prompt {
		width: 100%;
		text-align: center;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		margin-top: 8px;
	}

	@media (max-width: 768px) {
		.summary-cards,
		.empty-state {
			flex-direction: column;
		}
	}
</style>
