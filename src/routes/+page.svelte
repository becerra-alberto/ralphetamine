<script lang="ts">
	import { onMount } from 'svelte';
	import OnboardingWizard from '$lib/components/onboarding/OnboardingWizard.svelte';
	import { onboardingStore } from '$lib/stores/onboarding';
	import { checkOnboardingStatus, saveUserGoals, completeOnboarding } from '$lib/api/onboarding';

	let showOnboarding = false;
	let isLoading = true;

	onMount(async () => {
		try {
			const status = await checkOnboardingStatus();
			onboardingStore.setCompleted(status.isCompleted);
			onboardingStore.setGoals(status.goals);
			showOnboarding = !status.isCompleted;
		} catch {
			// If API fails, show dashboard (fail open)
			showOnboarding = false;
		} finally {
			isLoading = false;
			onboardingStore.setLoading(false);
		}
	});

	async function handleToggleGoal(event: CustomEvent<{ goalId: string }>) {
		onboardingStore.toggleGoal(event.detail.goalId);
	}

	async function handleNext() {
		await saveUserGoals($onboardingStore.goals);
		onboardingStore.nextStep();
	}

	async function handleSkip() {
		await completeOnboarding();
		onboardingStore.setCompleted(true);
		showOnboarding = false;
	}
</script>

<svelte:head>
	<title>Stackz - Home</title>
</svelte:head>

{#if isLoading}
	<div class="loading" data-testid="home-loading">Loading...</div>
{:else if showOnboarding}
	<OnboardingWizard
		currentStep={$onboardingStore.currentStep}
		totalSteps={$onboardingStore.totalSteps}
		selectedGoals={$onboardingStore.goals}
		on:toggleGoal={handleToggleGoal}
		on:next={handleNext}
		on:skip={handleSkip}
	/>
{:else}
	<div class="p-6" data-testid="home-page">
		<h1 class="text-3xl font-bold text-text-primary mb-4">Home Dashboard</h1>
		<p class="text-text-secondary mb-6">Your local-first personal finance app</p>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<a
				href="/budget"
				class="p-4 bg-bg-secondary rounded-lg hover:bg-accent/10 transition-colors"
			>
				<h2 class="text-lg font-semibold text-text-primary">Budget</h2>
				<p class="text-sm text-text-secondary">Manage your monthly budgets</p>
			</a>
			<a
				href="/transactions"
				class="p-4 bg-bg-secondary rounded-lg hover:bg-accent/10 transition-colors"
			>
				<h2 class="text-lg font-semibold text-text-primary">Transactions</h2>
				<p class="text-sm text-text-secondary">Track your spending</p>
			</a>
			<a
				href="/net-worth"
				class="p-4 bg-bg-secondary rounded-lg hover:bg-accent/10 transition-colors"
			>
				<h2 class="text-lg font-semibold text-text-primary">Net Worth</h2>
				<p class="text-sm text-text-secondary">Monitor your assets & liabilities</p>
			</a>
		</div>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 50vh;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}
</style>
