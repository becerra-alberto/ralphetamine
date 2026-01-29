<script lang="ts">
	import { onMount } from 'svelte';
	import OnboardingWizard from '$lib/components/onboarding/OnboardingWizard.svelte';
	import { onboardingStore } from '$lib/stores/onboarding';
	import type { OnboardingAccount } from '$lib/stores/onboarding';
	import {
		checkOnboardingStatus,
		saveUserGoals,
		saveMonthlyIncome,
		saveDisabledCategories,
		completeOnboarding
	} from '$lib/api/onboarding';
	import { createAccount } from '$lib/api/netWorth';

	let showOnboarding = false;
	let isLoading = true;
	let showWelcomeToast = false;

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

	function handleToggleGoal(event: CustomEvent<{ goalId: string }>) {
		onboardingStore.toggleGoal(event.detail.goalId);
	}

	function handleSetIncome(event: CustomEvent<{ incomeCents: number }>) {
		onboardingStore.setMonthlyIncome(event.detail.incomeCents);
	}

	function handleAddAccount(event: CustomEvent<OnboardingAccount>) {
		onboardingStore.addAccount(event.detail);
	}

	function handleToggleCategory(event: CustomEvent<{ categoryId: string }>) {
		onboardingStore.toggleCategory(event.detail.categoryId);
	}

	async function handleNext() {
		const step = $onboardingStore.currentStep;
		try {
			if (step === 1) {
				await saveUserGoals($onboardingStore.goals);
			} else if (step === 2) {
				await saveMonthlyIncome($onboardingStore.monthlyIncomeCents);
			} else if (step === 3) {
				for (const account of $onboardingStore.accounts) {
					await createAccount(account.name, account.type, '', 'EUR', account.balanceCents);
				}
			}
		} catch {
			// Best-effort save, still advance
		}
		onboardingStore.nextStep();
	}

	function handleBack() {
		onboardingStore.previousStep();
	}

	async function handleFinish() {
		try {
			await saveDisabledCategories($onboardingStore.disabledCategories);
			await completeOnboarding();
		} catch {
			// Best-effort save
		}
		onboardingStore.setCompleted(true);
		showOnboarding = false;
		showWelcomeToast = true;
		setTimeout(() => {
			showWelcomeToast = false;
		}, 4000);
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
		monthlyIncomeCents={$onboardingStore.monthlyIncomeCents}
		accounts={$onboardingStore.accounts}
		disabledCategories={$onboardingStore.disabledCategories}
		on:toggleGoal={handleToggleGoal}
		on:setIncome={handleSetIncome}
		on:addAccount={handleAddAccount}
		on:toggleCategory={handleToggleCategory}
		on:next={handleNext}
		on:back={handleBack}
		on:skip={handleSkip}
		on:finish={handleFinish}
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

{#if showWelcomeToast}
	<div class="welcome-toast" data-testid="welcome-toast">Welcome to Stackz!</div>
{/if}

<style>
	.welcome-toast {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--success, #10b981);
		color: white;
		padding: 12px 24px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9375rem;
		z-index: 200;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 50vh;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}
</style>
