<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import FileSelection from './FileSelection.svelte';
	import ColumnMapping from './ColumnMapping.svelte';
	import type { CsvParseResult } from '$lib/utils/csvParser';
	import type { ColumnMapping as ColumnMappingType } from '$lib/utils/columnDetection';

	export let open: boolean = false;
	export let testId: string = 'import-wizard';

	const dispatch = createEventDispatcher<{
		close: void;
		fileReady: { data: CsvParseResult; fileName: string };
		mappingsReady: {
			data: CsvParseResult;
			fileName: string;
			mappings: ColumnMappingType[];
			saveTemplate: boolean;
			templateName: string;
			useInflowOutflow: boolean;
		};
	}>();

	let currentStep = 1;
	const totalSteps = 3;
	let fileData: CsvParseResult | null = null;
	let fileName: string | null = null;

	// Step 2 state
	let mappings: ColumnMappingType[] = [];
	let mappingsValid = false;
	let mappingErrors: string[] = [];
	let saveTemplate = false;
	let templateName = '';
	let useInflowOutflow = false;

	$: hasFile = fileData !== null;
	$: canProceed = currentStep === 1 ? hasFile : currentStep === 2 ? mappingsValid : false;

	function handleClose() {
		dispatch('close');
		resetState();
	}

	function resetState() {
		currentStep = 1;
		fileData = null;
		fileName = null;
		mappings = [];
		mappingsValid = false;
		mappingErrors = [];
		saveTemplate = false;
		templateName = '';
		useInflowOutflow = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			handleClose();
		}
	}

	function handleFileReady(event: CustomEvent<{ data: CsvParseResult; fileName: string }>) {
		fileData = event.detail.data;
		fileName = event.detail.fileName;
	}

	function handleMappingsChange(event: CustomEvent<{
		mappings: ColumnMappingType[];
		valid: boolean;
		errors: string[];
		saveTemplate: boolean;
		templateName: string;
		useInflowOutflow: boolean;
	}>) {
		mappings = event.detail.mappings;
		mappingsValid = event.detail.valid;
		mappingErrors = event.detail.errors;
		saveTemplate = event.detail.saveTemplate;
		templateName = event.detail.templateName;
		useInflowOutflow = event.detail.useInflowOutflow;
	}

	function handleNext() {
		if (currentStep === 1 && hasFile) {
			currentStep = 2;
		} else if (currentStep === 2 && mappingsValid) {
			dispatch('mappingsReady', {
				data: fileData!,
				fileName: fileName!,
				mappings,
				saveTemplate,
				templateName,
				useInflowOutflow
			});
			handleClose();
		}
	}

	function handleBack() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<div
		class="wizard-backdrop"
		role="presentation"
		data-testid="{testId}-backdrop"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 100 }}
	>
		<div
			class="wizard-panel"
			class:wizard-panel--wide={currentStep === 2}
			role="dialog"
			aria-modal="true"
			aria-label="Import Transactions"
			data-testid={testId}
			transition:scale={{ duration: 100, start: 0.95 }}
		>
			<!-- Header -->
			<header class="wizard-header">
				<div class="wizard-title-area">
					<h2 class="wizard-title">Import Transactions</h2>
					<span class="step-indicator" data-testid="{testId}-step-indicator">
						Step {currentStep} of {totalSteps}
					</span>
				</div>
				<button
					class="wizard-close"
					aria-label="Close import wizard"
					data-testid="{testId}-close"
					on:click={handleClose}
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</header>

			<!-- Body -->
			<div class="wizard-body" data-testid="{testId}-body">
				{#if currentStep === 1}
					<FileSelection
						testId="{testId}-file-selection"
						on:fileReady={handleFileReady}
					/>
				{:else if currentStep === 2 && fileData}
					<ColumnMapping
						data={fileData}
						testId="{testId}-column-mapping"
						on:mappingsChange={handleMappingsChange}
					/>
				{/if}
			</div>

			<!-- Footer -->
			<footer class="wizard-footer" data-testid="{testId}-footer">
				{#if currentStep > 1}
					<button
						type="button"
						class="btn-back"
						data-testid="{testId}-back"
						on:click={handleBack}
					>
						Back
					</button>
				{:else}
					<div></div>
				{/if}

				<button
					type="button"
					class="btn-next"
					disabled={!canProceed}
					data-testid="{testId}-next"
					on:click={handleNext}
				>
					{currentStep < totalSteps ? 'Next' : 'Import'}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.wizard-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1300;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		padding: 16px;
	}

	.wizard-panel {
		background: var(--bg-primary, #ffffff);
		border-radius: 12px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 640px;
		width: 100%;
		max-height: calc(100vh - 32px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.wizard-panel--wide {
		max-width: 780px;
	}

	.wizard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.wizard-title-area {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.wizard-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.step-indicator {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.wizard-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
	}

	.wizard-close:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.wizard-body {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
	}

	.wizard-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 20px;
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.btn-back {
		padding: 8px 16px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.btn-back:hover {
		background: var(--bg-secondary, #f9fafb);
	}

	.btn-next {
		padding: 8px 20px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-next:hover {
		opacity: 0.9;
	}

	.btn-next:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Dark mode */
	:global(.dark) .wizard-panel {
		background: var(--bg-primary, #0f0f0f);
	}

	:global(.dark) .wizard-header {
		border-color: #2d2d2d;
	}

	:global(.dark) .wizard-title {
		color: #f9fafb;
	}

	:global(.dark) .wizard-footer {
		border-color: #2d2d2d;
	}
</style>
