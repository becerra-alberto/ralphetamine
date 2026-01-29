<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MappableField, ColumnMapping } from '$lib/utils/columnDetection';
	import { FIELD_LABELS } from '$lib/utils/columnDetection';

	export let mapping: ColumnMapping;
	export let availableFields: { value: MappableField; label: string }[];
	export let testId: string = 'column-row';

	const dispatch = createEventDispatcher<{
		change: { columnIndex: number; field: MappableField };
	}>();

	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		dispatch('change', {
			columnIndex: mapping.columnIndex,
			field: target.value as MappableField
		});
	}

	$: isRequired = mapping.field === 'date' || mapping.field === 'payee' || mapping.field === 'amount';
	$: isSkipped = mapping.field === 'skip';
</script>

<div
	class="column-row"
	class:skipped={isSkipped}
	data-testid={testId}
>
	<div class="column-info">
		<span class="column-header" data-testid="{testId}-header">{mapping.columnHeader}</span>
		<span class="column-sample" data-testid="{testId}-sample">{mapping.sampleValue || '—'}</span>
	</div>

	<div class="column-mapping">
		<svg class="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<line x1="5" y1="12" x2="19" y2="12" />
			<polyline points="12 5 19 12 12 19" />
		</svg>

		<select
			class="field-select"
			class:required={isRequired}
			value={mapping.field}
			on:change={handleChange}
			data-testid="{testId}-select"
		>
			{#each availableFields as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.column-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		transition: opacity 0.15s ease;
	}

	.column-row.skipped {
		opacity: 0.5;
	}

	.column-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.column-header {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.column-sample {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.column-mapping {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.arrow-icon {
		color: var(--text-secondary, #9ca3af);
	}

	.field-select {
		padding: 6px 10px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		min-width: 140px;
		cursor: pointer;
	}

	.field-select.required {
		border-color: var(--accent, #4f46e5);
	}

	/* Dark mode */
	:global(.dark) .column-row {
		border-color: #374151;
	}

	:global(.dark) .column-header {
		color: #f9fafb;
	}

	:global(.dark) .field-select {
		background: #1a1a1a;
		border-color: #374151;
		color: #f9fafb;
	}
</style>
