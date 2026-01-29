<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FileDropZone from './FileDropZone.svelte';
	import CsvPreview from './CsvPreview.svelte';
	import { readCsvFile, type CsvParseResult } from '$lib/utils/csvParser';

	export let testId: string = 'file-selection';

	const dispatch = createEventDispatcher<{
		fileReady: { data: CsvParseResult; fileName: string };
	}>();

	let selectedFileName: string | null = null;
	let parsedData: CsvParseResult | null = null;
	let errorMessage: string | null = null;
	let isParsing = false;

	async function handleFileSelected(event: CustomEvent<{ file: File }>) {
		const { file } = event.detail;
		selectedFileName = file.name;
		errorMessage = null;
		isParsing = true;

		const result = await readCsvFile(file);

		isParsing = false;

		if (result.ok) {
			parsedData = result.data;
			dispatch('fileReady', { data: result.data, fileName: file.name });
		} else {
			parsedData = null;
			errorMessage = result.error.message;
		}
	}

	function handleFileError(event: CustomEvent<{ message: string }>) {
		errorMessage = event.detail.message;
		parsedData = null;
		selectedFileName = null;
	}
</script>

<div class="file-selection" data-testid={testId}>
	<div class="step-intro">
		<h2 class="step-title" data-testid="{testId}-title">Import Transactions</h2>
		<p class="step-subtitle" data-testid="{testId}-subtitle">Select a CSV file from your bank</p>
	</div>

	{#if selectedFileName && !errorMessage}
		<div class="selected-file" data-testid="{testId}-selected-file">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
			</svg>
			<span class="file-name" data-testid="{testId}-file-name">{selectedFileName}</span>
		</div>
	{/if}

	{#if !parsedData}
		<FileDropZone
			testId="{testId}-drop-zone"
			on:fileSelected={handleFileSelected}
			on:error={handleFileError}
		/>
	{/if}

	{#if isParsing}
		<div class="parsing-status" data-testid="{testId}-parsing">
			Parsing file...
		</div>
	{/if}

	{#if errorMessage}
		<div class="error-message" role="alert" data-testid="{testId}-error">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	{#if parsedData}
		<CsvPreview data={parsedData} testId="{testId}-preview" />
	{/if}
</div>

<style>
	.file-selection {
		display: flex;
		flex-direction: column;
		gap: 20px;
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

	.selected-file {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid var(--color-success, #10b981);
		border-radius: 8px;
		color: var(--color-success, #10b981);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid var(--color-danger, #ef4444);
		border-radius: 8px;
		color: var(--color-danger, #ef4444);
		font-size: 0.875rem;
	}

	.parsing-status {
		text-align: center;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	/* Dark mode */
	:global(.dark) .step-title {
		color: #f9fafb;
	}
</style>
