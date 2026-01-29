<script lang="ts">
	import { onMount } from 'svelte';
	import NetWorthSummary from '$lib/components/net-worth/NetWorthSummary.svelte';
	import AssetsSection from '$lib/components/net-worth/AssetsSection.svelte';
	import { netWorthStore } from '$lib/stores/netWorth';
	import { getNetWorthSummary, saveNetWorthSnapshot, getMomChange } from '$lib/api/netWorth';

	let isLoading = true;
	let error: string | null = null;

	function getCurrentMonth(): string {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	}

	onMount(async () => {
		try {
			netWorthStore.setLoading(true);
			const summary = await getNetWorthSummary();
			netWorthStore.setSummary(summary);

			// Auto-snapshot current month
			const currentMonth = getCurrentMonth();
			await saveNetWorthSnapshot(
				currentMonth,
				summary.totalAssetsCents,
				summary.totalLiabilitiesCents,
				summary.netWorthCents
			);

			// Get month-over-month change
			const momData = await getMomChange(currentMonth, summary.netWorthCents);
			netWorthStore.setMomChange(momData);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			netWorthStore.setError(message);
			error = message;
		} finally {
			isLoading = false;
		}
	});

	$: hasAccounts = $netWorthStore.accounts.length > 0;
</script>

<svelte:head>
	<title>Stackz - Net Worth</title>
</svelte:head>

<div class="net-worth-page" data-testid="net-worth-page">
	<h1 class="page-title">Net Worth</h1>

	{#if isLoading}
		<div class="loading" data-testid="net-worth-loading">Loading...</div>
	{:else if error}
		<div class="error" data-testid="net-worth-error">{error}</div>
	{:else}
		<NetWorthSummary
			totalAssetsCents={$netWorthStore.totalAssetsCents}
			totalLiabilitiesCents={$netWorthStore.totalLiabilitiesCents}
			netWorthCents={$netWorthStore.netWorthCents}
			momChange={$netWorthStore.momChange}
			{hasAccounts}
		/>

		{#if hasAccounts}
			<AssetsSection
				accounts={$netWorthStore.accounts}
				totalAssetsCents={$netWorthStore.totalAssetsCents}
			/>
		{/if}
	{/if}
</div>

<style>
	.net-worth-page {
		padding: 24px;
		max-width: 1200px;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		margin-bottom: 24px;
	}

	.loading {
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
		padding: 24px 0;
	}

	.error {
		color: var(--danger, #ef4444);
		font-size: 0.875rem;
		padding: 24px 0;
	}

	:global(.dark) .page-title {
		color: var(--text-primary, #f9fafb);
	}
</style>
