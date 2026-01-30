<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ColumnRow from './ColumnRow.svelte';
	import MappingPreview from './MappingPreview.svelte';
	import {
		autoDetectMappings,
		validateMappings,
		getAvailableFields,
		isInflowOutflowMode,
		toggleAmountMode,
		type ColumnMapping as ColumnMappingType,
		type MappableField
	} from '$lib/utils/columnDetection';
	import type { CsvParseResult } from '$lib/utils/csvParser';

	export let data: CsvParseResult;
	export let testId: string = 'column-mapping';

	const dispatch = createEventDispatcher<{
		mappingsChange: {
			mappings: ColumnMappingType[];
			valid: boolean;
			errors: string[];
			saveTemplate: boolean;
			templateName: string;
			useInflowOutflow: boolean;
		};
	}>();

	let mappings: ColumnMappingType[] = [];
	let useInflowOutflow = false;
	let saveTemplate = false;
	let templateName = '';
	let instructionsExpanded = true;

	// Auto-detect on first load
	$: {
		const firstRow = data.rows[0] ?? [];
		mappings = autoDetectMappings(data.headers, firstRow);
		// Check if auto-detection found inflow/outflow columns
		useInflowOutflow = isInflowOutflowMode(mappings);
		emitChange();
	}

	function handleColumnChange(event: CustomEvent<{ columnIndex: number; field: MappableField }>) {
		const { columnIndex, field } = event.detail;
		mappings = mappings.map((m) =>
			m.columnIndex === columnIndex ? { ...m, field } : m
		);
		emitChange();
	}

	function handleAmountModeToggle() {
		useInflowOutflow = !useInflowOutflow;
		mappings = toggleAmountMode(mappings, useInflowOutflow);
		emitChange();
	}

	function handleSaveTemplateChange() {
		emitChange();
	}

	function handleTemplateNameChange() {
		emitChange();
	}

	function emitChange() {
		const errors = validateMappings(mappings);
		dispatch('mappingsChange', {
			mappings,
			valid: errors.length === 0,
			errors,
			saveTemplate,
			templateName,
			useInflowOutflow
		});
	}

	$: validationErrors = validateMappings(mappings);
</script>

<div class="column-mapping" data-testid={testId}>
	<div class="step-intro">
		<h2 class="step-title" data-testid="{testId}-title">Map Columns</h2>
		<p class="step-subtitle" data-testid="{testId}-subtitle">Tell us which columns contain which data</p>
	</div>

	<!-- Instructions banner -->
	<div class="instructions-banner" data-testid="{testId}-instructions">
		<button
			class="instructions-toggle"
			on:click={() => instructionsExpanded = !instructionsExpanded}
			data-testid="{testId}-instructions-toggle"
			aria-expanded={instructionsExpanded}
		>
			<svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="16" x2="12" y2="12" />
				<line x1="12" y1="8" x2="12.01" y2="8" />
			</svg>
			<span class="instructions-toggle-text">How to map columns</span>
			<svg class="chevron-icon" class:collapsed={!instructionsExpanded} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</button>
		{#if instructionsExpanded}
			<div class="instructions-content" data-testid="{testId}-instructions-content">
				<p><strong>Required:</strong> Map at least <em>Date</em>, <em>Payee</em>, and either <em>Amount</em> or both <em>Inflow</em> &amp; <em>Outflow</em> columns.</p>
				<p><strong>Optional:</strong> <em>Memo</em>, <em>Category</em>, and <em>Account</em> can be mapped if your CSV includes them.</p>
				<p><strong>Skip:</strong> Select "Skip this column" for any column you don't need to import.</p>
				<p><strong>Inflow/Outflow mode:</strong> Toggle above if your bank uses separate credit/debit columns instead of a single amount.</p>
			</div>
		{/if}
	</div>

	<!-- Amount mode toggle -->
	<div class="amount-mode-toggle" data-testid="{testId}-amount-toggle">
		<label class="toggle-label">
			<input
				type="checkbox"
				checked={useInflowOutflow}
				on:change={handleAmountModeToggle}
				data-testid="{testId}-amount-toggle-input"
			/>
			<span class="toggle-text">Use separate Inflow/Outflow columns</span>
		</label>
		<span class="toggle-hint">
			{useInflowOutflow
				? 'Map separate credit and debit columns'
				: 'Map a single Amount column (negative = expense)'}
		</span>
	</div>

	<!-- Column list -->
	<div class="columns-list" data-testid="{testId}-list">
		{#each mappings as mapping, idx}
			<ColumnRow
				{mapping}
				availableFields={getAvailableFields(mappings, idx, useInflowOutflow)}
				testId="{testId}-row-{idx}"
				on:change={handleColumnChange}
			/>
		{/each}
	</div>

	<!-- Validation errors -->
	{#if validationErrors.length > 0}
		<div class="validation-errors" role="alert" data-testid="{testId}-errors">
			{#each validationErrors as error}
				<p class="error-text" data-testid="{testId}-error">{error}</p>
			{/each}
		</div>
	{/if}

	<!-- Mapping preview -->
	<MappingPreview
		{data}
		{mappings}
		testId="{testId}-preview"
	/>

	<!-- Save template option -->
	<div class="save-template" data-testid="{testId}-save-template">
		<label class="template-checkbox">
			<input
				type="checkbox"
				bind:checked={saveTemplate}
				on:change={handleSaveTemplateChange}
				data-testid="{testId}-save-template-checkbox"
			/>
			<span>Save this mapping for future imports</span>
		</label>
		{#if saveTemplate}
			<input
				type="text"
				class="template-name-input"
				placeholder="Template name (e.g., ING Export)"
				bind:value={templateName}
				on:input={handleTemplateNameChange}
				data-testid="{testId}-template-name"
			/>
		{/if}
	</div>
</div>

<style>
	.column-mapping {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.step-intro {
		text-align: center;
	}

	.step-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.step-subtitle {
		margin: 4px 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
	}

	.instructions-banner {
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		overflow: hidden;
	}

	.instructions-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 14px;
		background: var(--bg-secondary, #f9fafb);
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
		text-align: left;
	}

	.instructions-toggle:hover {
		background: var(--bg-tertiary, #f3f4f6);
	}

	.instructions-toggle-text {
		flex: 1;
	}

	.info-icon {
		color: var(--accent, #4f46e5);
		flex-shrink: 0;
	}

	.chevron-icon {
		flex-shrink: 0;
		color: var(--text-secondary, #6b7280);
		transition: transform 0.15s ease;
	}

	.chevron-icon.collapsed {
		transform: rotate(-90deg);
	}

	.instructions-content {
		padding: 10px 14px 12px;
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.instructions-content p {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
		line-height: 1.5;
	}

	.instructions-content p + p {
		margin-top: 6px;
	}

	.instructions-content em {
		font-style: normal;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.amount-mode-toggle {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 14px;
		background: var(--bg-secondary, #f9fafb);
		border-radius: 8px;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.toggle-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.toggle-hint {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
		padding-left: 24px;
	}

	.columns-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.validation-errors {
		padding: 10px 14px;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid var(--color-danger, #ef4444);
		border-radius: 8px;
	}

	.error-text {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-danger, #ef4444);
	}

	.error-text + .error-text {
		margin-top: 4px;
	}

	.save-template {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
	}

	.template-checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
	}

	.template-checkbox input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.template-name-input {
		padding: 8px 12px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
	}

	.template-name-input::placeholder {
		color: var(--text-secondary, #9ca3af);
	}

	.template-name-input:focus {
		outline: none;
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}

	/* Dark mode */
	:global(.dark) .step-title {
		color: #f9fafb;
	}

	:global(.dark) .instructions-banner {
		border-color: #374151;
	}

	:global(.dark) .instructions-toggle {
		background: #1a1a1a;
		color: #f9fafb;
	}

	:global(.dark) .instructions-toggle:hover {
		background: #252525;
	}

	:global(.dark) .instructions-content {
		border-top-color: #374151;
	}

	:global(.dark) .instructions-content em {
		color: #f9fafb;
	}

	:global(.dark) .amount-mode-toggle {
		background: #1a1a1a;
	}

	:global(.dark) .toggle-label {
		color: #f9fafb;
	}

	:global(.dark) .save-template {
		border-color: #374151;
	}

	:global(.dark) .template-checkbox {
		color: #f9fafb;
	}

	:global(.dark) .template-name-input {
		background: #1a1a1a;
		border-color: #374151;
		color: #f9fafb;
	}
</style>
