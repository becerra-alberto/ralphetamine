<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import StepIndicator from './StepIndicator.svelte';
	import Step1Goals from './Step1Goals.svelte';
	import Step2Income from './Step2Income.svelte';
	import Step3Accounts from './Step3Accounts.svelte';
	import Step4Categories from './Step4Categories.svelte';
	import type { OnboardingAccount } from '$lib/stores/onboarding';

	export let currentStep = 1;
	export let totalSteps = 4;
	export let selectedGoals: string[] = [];
	export let monthlyIncomeCents = 0;
	export let accounts: OnboardingAccount[] = [];
	export let disabledCategories: string[] = [];
	export let testId = 'onboarding-wizard';

	const dispatch = createEventDispatcher<{
		toggleGoal: { goalId: string };
		setIncome: { incomeCents: number };
		addAccount: OnboardingAccount;
		toggleCategory: { categoryId: string };
		next: void;
		back: void;
		skip: void;
		finish: void;
	}>();

	function handleToggleGoal(event: CustomEvent<{ goalId: string }>) {
		dispatch('toggleGoal', event.detail);
	}

	function handleSetIncome(event: CustomEvent<{ incomeCents: number }>) {
		dispatch('setIncome', event.detail);
	}

	function handleAddAccount(event: CustomEvent<OnboardingAccount>) {
		dispatch('addAccount', event.detail);
	}

	function handleToggleCategory(event: CustomEvent<{ categoryId: string }>) {
		dispatch('toggleCategory', event.detail);
	}

	function handleNext() {
		dispatch('next');
	}

	function handleBack() {
		dispatch('back');
	}

	function handleSkip() {
		dispatch('skip');
	}

	function handleFinish() {
		dispatch('finish');
	}
</script>

<div class="wizard-overlay" data-testid={testId}>
	<div class="wizard-container" data-testid="{testId}-container">
		<div class="wizard-header">
			<StepIndicator {currentStep} {totalSteps} testId="{testId}-indicator" />
			<button class="skip-link" on:click={handleSkip} data-testid="{testId}-skip">
				Skip setup
			</button>
		</div>

		<div class="wizard-content">
			{#if currentStep === 1}
				<div in:fly={{ x: 50, duration: 300 }} out:fly={{ x: -50, duration: 300 }}>
					<Step1Goals
						{selectedGoals}
						testId="{testId}-step1"
						on:toggleGoal={handleToggleGoal}
						on:next={handleNext}
					/>
				</div>
			{:else if currentStep === 2}
				<div in:fly={{ x: 50, duration: 300 }} out:fly={{ x: -50, duration: 300 }}>
					<Step2Income
						{monthlyIncomeCents}
						testId="{testId}-step2"
						on:setIncome={handleSetIncome}
						on:next={handleNext}
						on:back={handleBack}
					/>
				</div>
			{:else if currentStep === 3}
				<div in:fly={{ x: 50, duration: 300 }} out:fly={{ x: -50, duration: 300 }}>
					<Step3Accounts
						{accounts}
						testId="{testId}-step3"
						on:addAccount={handleAddAccount}
						on:next={handleNext}
						on:back={handleBack}
					/>
				</div>
			{:else if currentStep === 4}
				<div in:fly={{ x: 50, duration: 300 }} out:fly={{ x: -50, duration: 300 }}>
					<Step4Categories
						{disabledCategories}
						testId="{testId}-step4"
						on:toggleCategory={handleToggleCategory}
						on:finish={handleFinish}
						on:back={handleBack}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.wizard-overlay {
		position: fixed;
		inset: 0;
		background: var(--bg-primary, #ffffff);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.wizard-container {
		width: 100%;
		max-width: 600px;
		padding: 32px 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.wizard-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.skip-link {
		background: none;
		border: none;
		color: var(--text-secondary, #6b7280);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: color 0.15s ease;
	}

	.skip-link:hover {
		color: var(--text-primary, #111827);
	}

	.wizard-content {
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.dark) .wizard-overlay {
		background: var(--bg-primary, #0f0f0f);
	}

	:global(.dark) .skip-link {
		color: #6b7280;
	}

	:global(.dark) .skip-link:hover {
		color: #d1d5db;
	}
</style>
