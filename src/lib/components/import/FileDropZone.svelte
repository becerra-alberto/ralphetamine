<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isValidCsvFile } from '$lib/utils/csvParser';

	export let testId: string = 'file-drop-zone';
	export let disabled: boolean = false;

	const dispatch = createEventDispatcher<{
		fileSelected: { file: File };
		error: { message: string };
	}>();

	let isDragOver = false;
	let fileInputRef: HTMLInputElement;

	function handleDragOver(event: DragEvent) {
		if (disabled) return;
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleDrop(event: DragEvent) {
		if (disabled) return;
		event.preventDefault();
		isDragOver = false;

		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		validateAndDispatch(file);
	}

	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			validateAndDispatch(file);
		}
		// Reset input so same file can be reselected
		target.value = '';
	}

	function validateAndDispatch(file: File) {
		if (!isValidCsvFile(file)) {
			dispatch('error', { message: 'Please select a CSV file (.csv)' });
			return;
		}
		dispatch('fileSelected', { file });
	}

	function openFilePicker() {
		fileInputRef?.click();
	}
</script>

<div
	class="drop-zone"
	class:drag-over={isDragOver}
	class:disabled
	role="button"
	tabindex="0"
	aria-label="Drop CSV file here or click to select"
	data-testid={testId}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
	on:click={openFilePicker}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openFilePicker();
		}
	}}
>
	<input
		type="file"
		accept=".csv,text/csv"
		class="file-input"
		bind:this={fileInputRef}
		on:change={handleFileInput}
		data-testid="{testId}-input"
	/>

	<div class="drop-content">
		<svg class="upload-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="17 8 12 3 7 8" />
			<line x1="12" y1="3" x2="12" y2="15" />
		</svg>

		<p class="drop-text">
			<span class="drop-primary">Drag & drop your CSV file here</span>
			<span class="drop-secondary">or</span>
		</p>

		<button type="button" class="select-btn" data-testid="{testId}-select-btn" disabled={disabled}>
			Select File
		</button>

		<p class="drop-hint" data-testid="{testId}-hint">Supports .csv files</p>
	</div>
</div>

<style>
	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		padding: 32px;
		border: 2px dashed var(--border-color, #d1d5db);
		border-radius: 12px;
		background: var(--bg-secondary, #f9fafb);
		cursor: pointer;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.drop-zone:hover,
	.drop-zone:focus-visible {
		border-color: var(--accent, #4f46e5);
		background: rgba(79, 70, 229, 0.04);
	}

	.drop-zone.drag-over {
		border-color: var(--accent, #4f46e5);
		background: rgba(79, 70, 229, 0.08);
		border-style: solid;
	}

	.drop-zone.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.file-input {
		display: none;
	}

	.drop-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		pointer-events: none;
	}

	.upload-icon {
		color: var(--text-secondary, #9ca3af);
	}

	.drop-text {
		margin: 0;
		text-align: center;
		line-height: 1.6;
	}

	.drop-primary {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.drop-secondary {
		display: block;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
	}

	.select-btn {
		padding: 8px 20px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		pointer-events: auto;
	}

	.select-btn:hover {
		opacity: 0.9;
	}

	.select-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.drop-hint {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-secondary, #9ca3af);
	}

	/* Dark mode */
	:global(.dark) .drop-zone {
		background: var(--bg-secondary, #1a1a1a);
		border-color: #374151;
	}

	:global(.dark) .drop-zone:hover,
	:global(.dark) .drop-zone:focus-visible {
		border-color: var(--accent, #4f46e5);
		background: rgba(79, 70, 229, 0.08);
	}

	:global(.dark) .drop-primary {
		color: #f9fafb;
	}
</style>
