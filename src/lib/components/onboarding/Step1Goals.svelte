<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let selectedGoals: string[] = [];
	export let testId = 'step1-goals';

	const dispatch = createEventDispatcher<{
		toggleGoal: { goalId: string };
		next: void;
	}>();

	const GOALS = [
		{ id: 'emergency_fund', label: 'Build emergency fund', icon: '🛡️' },
		{ id: 'debt_payoff', label: 'Pay off debt', icon: '💳' },
		{ id: 'save_goal', label: 'Save for a specific goal', icon: '🎯' },
		{ id: 'track_spending', label: 'Track my spending', icon: '📊' },
		{ id: 'monitor_net_worth', label: 'Monitor my net worth', icon: '📈' }
	];

	function handleToggle(goalId: string) {
		dispatch('toggleGoal', { goalId });
	}

	function handleNext() {
		dispatch('next');
	}
</script>

<div class="step1-goals" data-testid={testId}>
	<h2 class="step-title" data-testid="{testId}-title">What are your financial goals?</h2>
	<p class="step-subtitle" data-testid="{testId}-subtitle">Select all that apply</p>

	<div class="goals-list" data-testid="{testId}-list">
		{#each GOALS as goal}
			<label
				class="goal-option"
				class:selected={selectedGoals.includes(goal.id)}
				data-testid="{testId}-option-{goal.id}"
			>
				<input
					type="checkbox"
					checked={selectedGoals.includes(goal.id)}
					on:change={() => handleToggle(goal.id)}
					data-testid="{testId}-checkbox-{goal.id}"
				/>
				<span class="goal-icon">{goal.icon}</span>
				<span class="goal-label">{goal.label}</span>
			</label>
		{/each}
	</div>

	<button class="btn-next" on:click={handleNext} data-testid="{testId}-next">
		Next
	</button>
</div>

<style>
	.step1-goals {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.step-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #111827);
		text-align: center;
		margin: 0;
	}

	.step-subtitle {
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		text-align: center;
		margin: 0 0 8px 0;
	}

	.goals-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.goal-option {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.15s ease;
		background: var(--bg-primary, #ffffff);
	}

	.goal-option:hover {
		border-color: var(--accent, #4f46e5);
		background: var(--accent-bg, #f5f3ff);
	}

	.goal-option.selected {
		border-color: var(--accent, #4f46e5);
		background: var(--accent-bg, #f5f3ff);
	}

	.goal-option input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
		flex-shrink: 0;
	}

	.goal-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.goal-label {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.btn-next {
		margin-top: 16px;
		padding: 12px 48px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-next:hover {
		background: var(--accent-hover, #4338ca);
	}

	:global(.dark) .step-title {
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .step-subtitle {
		color: #9ca3af;
	}

	:global(.dark) .goal-option {
		border-color: #2d2d2d;
		background: var(--bg-secondary, #1a1a1a);
	}

	:global(.dark) .goal-option:hover,
	:global(.dark) .goal-option.selected {
		border-color: var(--accent, #4f46e5);
		background: #1e1b4b;
	}

	:global(.dark) .goal-label {
		color: var(--text-primary, #f9fafb);
	}
</style>
