<script lang="ts">
	import { onMount } from 'svelte';
	import NetWorthSummary from '$lib/components/net-worth/NetWorthSummary.svelte';
	import AssetsSection from '$lib/components/net-worth/AssetsSection.svelte';
	import LiabilitiesSection from '$lib/components/net-worth/LiabilitiesSection.svelte';
	import AddAccountModal from '$lib/components/net-worth/AddAccountModal.svelte';
	import { netWorthStore } from '$lib/stores/netWorth';
	import {
		getNetWorthSummary,
		saveNetWorthSnapshot,
		getMomChange,
		updateAccountBalance,
		createAccount,
		updateAccount,
		deleteAccount
	} from '$lib/api/netWorth';

	let isLoading = true;
	let error: string | null = null;
	let showAddAccountModal = false;
	let addAccountDefaultType = 'checking';

	function getCurrentMonth(): string {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	}

	async function refreshData() {
		const summary = await getNetWorthSummary();
		netWorthStore.setSummary(summary);

		const currentMonth = getCurrentMonth();
		await saveNetWorthSnapshot(
			currentMonth,
			summary.totalAssetsCents,
			summary.totalLiabilitiesCents,
			summary.netWorthCents
		);

		const momData = await getMomChange(currentMonth, summary.netWorthCents);
		netWorthStore.setMomChange(momData);
	}

	onMount(async () => {
		try {
			netWorthStore.setLoading(true);
			await refreshData();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			netWorthStore.setError(message);
			error = message;
		} finally {
			isLoading = false;
		}
	});

	async function handleBalanceSave(event: CustomEvent<{ accountId: string; newBalanceCents: number }>) {
		try {
			await updateAccountBalance(event.detail.accountId, event.detail.newBalanceCents);
			await refreshData();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			error = message;
		}
	}

	async function handleAccountEdit(event: CustomEvent<{ accountId: string; update: { name?: string; institution?: string; accountType?: string } }>) {
		try {
			await updateAccount(event.detail.accountId, event.detail.update);
			await refreshData();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			error = message;
		}
	}

	async function handleAccountDelete(event: CustomEvent<{ accountId: string }>) {
		try {
			const txCount = await deleteAccount(event.detail.accountId);
			if (txCount > 0) {
				// Account had transactions, but was soft-deleted
			}
			await refreshData();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			error = message;
		}
	}

	function handleAddAccount(event: CustomEvent<{ defaultType: string }>) {
		addAccountDefaultType = event.detail.defaultType;
		showAddAccountModal = true;
	}

	async function handleAccountSubmit(event: CustomEvent<{
		name: string;
		accountType: string;
		institution: string;
		currency: string;
		startingBalanceCents: number;
		bankNumber: string;
		country: string;
	}>) {
		try {
			const { name, accountType, institution, currency, startingBalanceCents, bankNumber, country } = event.detail;
			await createAccount(name, accountType, institution, currency, startingBalanceCents, bankNumber || null, country || null);
			showAddAccountModal = false;
			await refreshData();
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			error = message;
		}
	}

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
				editable={true}
				on:balanceSave={handleBalanceSave}
				on:addAccount={handleAddAccount}
				on:edit={handleAccountEdit}
				on:delete={handleAccountDelete}
			/>
			<LiabilitiesSection
				accounts={$netWorthStore.accounts}
				totalLiabilitiesCents={$netWorthStore.totalLiabilitiesCents}
				editable={true}
				on:balanceSave={handleBalanceSave}
				on:addAccount={handleAddAccount}
				on:edit={handleAccountEdit}
				on:delete={handleAccountDelete}
			/>
		{/if}
	{/if}
</div>

<AddAccountModal
	isOpen={showAddAccountModal}
	defaultType={addAccountDefaultType}
	on:submit={handleAccountSubmit}
	on:close={() => (showAddAccountModal = false)}
/>

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
