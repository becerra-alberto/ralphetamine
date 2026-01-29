<script lang="ts">
	export let currentStep: number;
	export let totalSteps: number;
	export let testId = 'step-indicator';

	$: progressPercent = (currentStep / totalSteps) * 100;
</script>

<div class="step-indicator" data-testid={testId}>
	<span class="step-text" data-testid="{testId}-text">Step {currentStep} of {totalSteps}</span>
	<div class="progress-bar" data-testid="{testId}-bar">
		<div
			class="progress-fill"
			data-testid="{testId}-fill"
			style="width: {progressPercent}%"
		></div>
	</div>
	<div class="step-dots" data-testid="{testId}-dots">
		{#each Array(totalSteps) as _, i}
			<span
				class="dot"
				class:active={i < currentStep}
				class:current={i === currentStep - 1}
				data-testid="{testId}-dot-{i}"
			></span>
		{/each}
	</div>
</div>

<style>
	.step-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		margin-bottom: 24px;
	}

	.step-text {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.progress-bar {
		width: 100%;
		max-width: 200px;
		height: 4px;
		background: var(--bg-tertiary, #e5e7eb);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent, #4f46e5);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.step-dots {
		display: flex;
		gap: 8px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--bg-tertiary, #e5e7eb);
		transition: background 0.2s ease;
	}

	.dot.active {
		background: var(--accent, #4f46e5);
	}

	.dot.current {
		background: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px var(--bg-primary, #ffffff), 0 0 0 4px var(--accent, #4f46e5);
	}

	:global(.dark) .step-text {
		color: #9ca3af;
	}

	:global(.dark) .progress-bar {
		background: #2d2d2d;
	}

	:global(.dark) .dot {
		background: #2d2d2d;
	}

	:global(.dark) .dot.current {
		box-shadow: 0 0 0 2px var(--bg-primary, #0f0f0f), 0 0 0 4px var(--accent, #4f46e5);
	}
</style>
