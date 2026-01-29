<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import StepIndicator from './StepIndicator.svelte';
	import Step1Goals from './Step1Goals.svelte';

	export let currentStep = 1;
	export let totalSteps = 4;
	export let selectedGoals: string[] = [];
	export let testId = 'onboarding-wizard';

	const dispatch = createEventDispatcher<{
		toggleGoal: { goalId: string };
		next: void;
		skip: void;
	}>();

	function handleToggleGoal(event: CustomEvent<{ goalId: string }>) {
		dispatch('toggleGoal', event.detail);
	}

	function handleNext() {
		dispatch('next');
	}

	function handleSkip() {
		dispatch('skip');
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
				<div
					class="placeholder-step"
					data-testid="{testId}-step2"
					in:fly={{ x: 50, duration: 300 }}
				>
					<h2>Step 2 - Coming Soon</h2>
				</div>
			{:else if currentStep === 3}
				<div
					class="placeholder-step"
					data-testid="{testId}-step3"
					in:fly={{ x: 50, duration: 300 }}
				>
					<h2>Step 3 - Coming Soon</h2>
				</div>
			{:else if currentStep === 4}
				<div
					class="placeholder-step"
					data-testid="{testId}-step4"
					in:fly={{ x: 50, duration: 300 }}
				>
					<h2>Step 4 - Coming Soon</h2>
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

	.placeholder-step {
		text-align: center;
		color: var(--text-secondary, #6b7280);
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

	:global(.dark) .placeholder-step {
		color: #9ca3af;
	}
</style>
