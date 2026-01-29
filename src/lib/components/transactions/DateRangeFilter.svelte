<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let startDate: string | null = null;
	export let endDate: string | null = null;
	export let activePreset: string | null = null;

	const dispatch = createEventDispatcher<{
		change: { start: string | null; end: string | null; preset: string | null };
		preset: { preset: string };
	}>();

	const presets = [
		{ id: 'today', label: 'Today' },
		{ id: 'this-week', label: 'This week' },
		{ id: 'this-month', label: 'This month' },
		{ id: 'last-30-days', label: 'Last 30 days' },
		{ id: 'this-year', label: 'This year' }
	];

	$: validationError =
		startDate && endDate && startDate > endDate ? 'End date must be after start date' : null;

	function handlePresetClick(presetId: string) {
		dispatch('preset', { preset: presetId });
	}

	function handleStartChange(event: Event) {
		const target = event.target as HTMLInputElement;
		startDate = target.value || null;
		dispatch('change', { start: startDate, end: endDate, preset: null });
	}

	function handleEndChange(event: Event) {
		const target = event.target as HTMLInputElement;
		endDate = target.value || null;
		dispatch('change', { start: startDate, end: endDate, preset: null });
	}
</script>

<div class="filter-section" data-testid="date-range-filter">
	<h4 class="filter-label">Date Range</h4>

	<div class="preset-buttons" data-testid="date-presets">
		{#each presets as preset}
			<button
				type="button"
				class="preset-btn"
				class:active={activePreset === preset.id}
				on:click={() => handlePresetClick(preset.id)}
				data-testid="date-preset-{preset.id}"
			>
				{preset.label}
			</button>
		{/each}
	</div>

	<div class="date-inputs">
		<label class="date-field">
			<span class="date-label">Start</span>
			<input
				type="date"
				value={startDate || ''}
				on:change={handleStartChange}
				class="date-input"
				data-testid="date-start"
				aria-label="Start date"
			/>
		</label>
		<label class="date-field">
			<span class="date-label">End</span>
			<input
				type="date"
				value={endDate || ''}
				on:change={handleEndChange}
				class="date-input"
				data-testid="date-end"
				aria-label="End date"
			/>
		</label>
	</div>

	{#if validationError}
		<p class="validation-error" data-testid="date-validation-error" role="alert">
			{validationError}
		</p>
	{/if}
</div>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	.preset-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.preset-btn {
		padding: 4px 8px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.preset-btn:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.preset-btn.active {
		background: var(--accent, #4f46e5);
		color: white;
		border-color: var(--accent, #4f46e5);
	}

	.date-inputs {
		display: flex;
		gap: 8px;
	}

	.date-field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.date-label {
		font-size: 0.7rem;
		color: var(--text-secondary, #6b7280);
	}

	.date-input {
		height: 32px;
		padding: 0 8px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8rem;
	}

	.date-input:focus {
		outline: none;
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
	}

	.validation-error {
		font-size: 0.75rem;
		color: var(--color-danger, #ef4444);
		margin: 0;
	}

	:global(.dark) .preset-btn {
		background: var(--bg-secondary, #1a1a1a);
		border-color: var(--border-color, #374151);
		color: var(--text-primary, #f9fafb);
	}

	:global(.dark) .preset-btn:hover {
		background: var(--bg-hover, #374151);
	}

	:global(.dark) .date-input {
		background: var(--bg-secondary, #1a1a1a);
		border-color: var(--border-color, #374151);
		color: var(--text-primary, #f9fafb);
	}
</style>
