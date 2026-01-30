<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import FileSelection from './FileSelection.svelte';
	import ColumnMapping from './ColumnMapping.svelte';
	import AccountValueMapping from './AccountValueMapping.svelte';
	import type { AccountMappingEntry } from './AccountValueMapping.svelte';
	import ImportPreview from './ImportPreview.svelte';
	import ImportProgress from './ImportProgress.svelte';
	import type { CsvParseResult } from '$lib/utils/csvParser';
	import {
		buildPreviewTransaction,
		type ColumnMapping as ColumnMappingType,
		type PreviewTransaction
	} from '$lib/utils/columnDetection';
	import {
		detectDuplicates,
		buildImportSummary,
		type DuplicateCheckResult,
		type ImportSummary
	} from '$lib/utils/duplicateDetection';
	import { getTransactions, importTransactions } from '$lib/api/transactions';
	import { createAccount } from '$lib/api/netWorth';
	import type { TransactionInput } from '$lib/types/transaction';
	import type { Account } from '$lib/types/account';
	import { invoke } from '@tauri-apps/api/core';

	export let open: boolean = false;
	export let testId: string = 'import-wizard';

	const dispatch = createEventDispatcher<{
		close: void;
		importComplete: { imported: number; skipped: number };
		categorizeNow: void;
	}>();

	let currentStep = 1;
	let fileData: CsvParseResult | null = null;
	let fileName: string | null = null;

	// Step 2 state
	let mappings: ColumnMappingType[] = [];
	let mappingsValid = false;
	let mappingErrors: string[] = [];
	let saveTemplate = false;
	let templateName = '';
	let useInflowOutflow = false;

	// Account mapping state (step between column mapping and preview when account column exists)
	let uniqueAccountValues: string[] = [];
	let accountMappings: Record<string, AccountMappingEntry> = {};
	let accountMappingsAllMapped = false;

	// Dynamic total steps: 3 normally, 4 when account column is mapped
	$: totalSteps = hasAccountColumn ? 4 : 3;
	// The preview step is the last step before import
	$: previewStep = hasAccountColumn ? 4 : 3;

	// Step 3 or 4 state (preview)
	let previewTransactions: PreviewTransaction[] = [];
	let duplicateResult: DuplicateCheckResult = { duplicates: [], cleanCount: 0, totalCount: 0 };
	let importSummary: ImportSummary = { totalTransactions: 0, duplicatesFound: 0, dateRange: null, toImport: 0 };
	let duplicateOption: 'skip' | 'import-all' | 'review' = 'skip';

	// Import progress state
	let importStatus: 'idle' | 'importing' | 'success' | 'error' = 'idle';
	let importedCount = 0;
	let skippedCount = 0;
	let importError = '';
	let uncategorizedImportCount = 0;

	// Account selection for import
	let availableAccounts: Account[] = [];
	let selectedAccountId: string = '';

	// Whether CSV has an account column mapped
	$: hasAccountColumn = mappings.some((m) => m.field === 'account');

	$: hasFile = fileData !== null;
	$: canProceed = currentStep === 1 ? hasFile
		: currentStep === 2 ? mappingsValid
		: (hasAccountColumn && currentStep === 3) ? accountMappingsAllMapped
		: currentStep === previewStep ? importStatus === 'idle'
		: false;
	$: showFooter = importStatus === 'idle';

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
		previewTransactions = [];
		duplicateResult = { duplicates: [], cleanCount: 0, totalCount: 0 };
		importSummary = { totalTransactions: 0, duplicatesFound: 0, dateRange: null, toImport: 0 };
		duplicateOption = 'skip';
		importStatus = 'idle';
		importedCount = 0;
		skippedCount = 0;
		importError = '';
		uncategorizedImportCount = 0;
		uniqueAccountValues = [];
		accountMappings = {};
		accountMappingsAllMapped = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && importStatus !== 'importing') {
			handleClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape' && importStatus !== 'importing') {
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

	function handleAccountMappingChange(event: CustomEvent<{
		mappings: Record<string, AccountMappingEntry>;
		allMapped: boolean;
	}>) {
		accountMappings = event.detail.mappings;
		accountMappingsAllMapped = event.detail.allMapped;
	}

	/**
	 * Extract unique account values from CSV data using the mapped account column.
	 */
	function extractUniqueAccountValues(): string[] {
		if (!fileData) return [];
		const accountMapping = mappings.find((m) => m.field === 'account');
		if (!accountMapping) return [];

		const colIndex = accountMapping.columnIndex;
		const valuesSet = new Set<string>();
		for (const row of fileData.rows) {
			const val = (row[colIndex] ?? '').trim();
			if (val) valuesSet.add(val);
		}
		return Array.from(valuesSet).sort();
	}

	/**
	 * Build account lookup from account value mappings.
	 * Creates new accounts as needed, then returns csvValue→accountId map.
	 */
	async function buildAccountMappingLookup(): Promise<Map<string, string>> {
		const lookup = new Map<string, string>();

		for (const [csvValue, entry] of Object.entries(accountMappings)) {
			if (entry.action === 'existing' && entry.accountId) {
				lookup.set(csvValue, entry.accountId);
			} else if (entry.action === 'create' && entry.newAccount) {
				// Create the account via API
				const newId = await createAccount(
					entry.newAccount.name,
					entry.newAccount.type,
					entry.newAccount.institution,
					'EUR',
					0,
					entry.newAccount.bankNumber || null,
					entry.newAccount.country || null
				);
				lookup.set(csvValue, newId);
			}
			// 'skip' entries not added to lookup
		}

		return lookup;
	}

	async function preparePreviewStep() {
		if (!fileData) return;

		previewTransactions = fileData.rows.map((row) =>
			buildPreviewTransaction(row, mappings)
		);

		try {
			const existing = await getTransactions();
			duplicateResult = detectDuplicates(previewTransactions, existing);
		} catch {
			duplicateResult = {
				duplicates: [],
				cleanCount: previewTransactions.length,
				totalCount: previewTransactions.length
			};
		}

		importSummary = buildImportSummary(previewTransactions, duplicateResult);
	}

	function prepareAccountMappingStep() {
		uniqueAccountValues = extractUniqueAccountValues();
	}

	function handleDuplicateOptionChange(event: CustomEvent<{ option: 'skip' | 'import-all' | 'review' }>) {
		duplicateOption = event.detail.option;
		if (duplicateOption === 'import-all') {
			duplicateResult = {
				...duplicateResult,
				duplicates: duplicateResult.duplicates.map((d) => ({ ...d, include: true }))
			};
		} else if (duplicateOption === 'skip') {
			duplicateResult = {
				...duplicateResult,
				duplicates: duplicateResult.duplicates.map((d) => ({ ...d, include: false }))
			};
		}
		importSummary = buildImportSummary(previewTransactions, duplicateResult);
	}

	function handleDuplicateToggle(event: CustomEvent<{ importIndex: number; include: boolean }>) {
		const { importIndex, include } = event.detail;
		duplicateResult = {
			...duplicateResult,
			duplicates: duplicateResult.duplicates.map((d) =>
				d.importIndex === importIndex ? { ...d, include } : d
			)
		};
		importSummary = buildImportSummary(previewTransactions, duplicateResult);
	}

	async function executeImport() {
		importStatus = 'importing';
		importedCount = 0;
		skippedCount = 0;

		const skipIndices = new Set(
			duplicateOption !== 'import-all'
				? duplicateResult.duplicates.filter((d) => !d.include).map((d) => d.importIndex)
				: []
		);

		// When no account column is mapped, require selected account
		if (!hasAccountColumn && !selectedAccountId) {
			importStatus = 'error';
			importError = 'No account selected. Please create an account first.';
			return;
		}

		// Build account lookup from the explicit account value mappings
		let accountValueLookup: Map<string, string> | null = null;
		if (hasAccountColumn) {
			try {
				accountValueLookup = await buildAccountMappingLookup();
			} catch (err) {
				importStatus = 'error';
				importError = err instanceof Error ? err.message : 'Failed to create accounts';
				return;
			}
		}

		const inputs: TransactionInput[] = [];
		const rowErrors: string[] = [];

		for (let i = 0; i < previewTransactions.length; i++) {
			if (skipIndices.has(i)) {
				skippedCount++;
				continue;
			}
			const tx = previewTransactions[i];

			// Validate required fields
			if (!tx.date) {
				rowErrors.push(`Row ${i + 1}: Missing date`);
				continue;
			}
			if (!tx.payee) {
				rowErrors.push(`Row ${i + 1}: Missing payee`);
				continue;
			}

			// Resolve account ID per-row using account value mappings
			let accountId = selectedAccountId;
			if (accountValueLookup && tx.account) {
				const resolved = accountValueLookup.get(tx.account.trim());
				if (resolved) {
					accountId = resolved;
				} else if (selectedAccountId) {
					// Fallback to selected account if not in mapping
					accountId = selectedAccountId;
				} else {
					rowErrors.push(`Row ${i + 1}: Unknown account "${tx.account}"`);
					continue;
				}
			}

			if (!accountId) {
				rowErrors.push(`Row ${i + 1}: No account resolved`);
				continue;
			}

			inputs.push({
				date: tx.date,
				payee: tx.payee,
				amountCents: tx.amountCents,
				memo: tx.memo || undefined,
				accountId,
				importSource: 'CSV'
			});
		}

		try {
			const result = await importTransactions(inputs);
			importedCount = result.imported;
			skippedCount += result.skipped;
			// Count how many imported transactions have no category
			uncategorizedImportCount = inputs.filter((t) => !t.categoryId).length;
			importStatus = 'success';

			if (rowErrors.length > 0) {
				importError = `${rowErrors.length} row(s) skipped:\n${rowErrors.slice(0, 5).join('\n')}${rowErrors.length > 5 ? `\n...and ${rowErrors.length - 5} more` : ''}`;
			}

			dispatch('importComplete', { imported: importedCount, skipped: skippedCount + rowErrors.length });
		} catch (err) {
			importStatus = 'error';
			importError = err instanceof Error ? err.message : 'An error occurred during import';
			if (rowErrors.length > 0) {
				importError += `\n\nAdditionally, ${rowErrors.length} row(s) had validation errors.`;
			}
		}
	}

	async function handleNext() {
		if (currentStep === 1 && hasFile) {
			currentStep = 2;
		} else if (currentStep === 2 && mappingsValid) {
			if (hasAccountColumn) {
				// Go to account value mapping step
				currentStep = 3;
				prepareAccountMappingStep();
			} else {
				// Skip account mapping, go to preview
				currentStep = 3;
				await preparePreviewStep();
			}
		} else if (hasAccountColumn && currentStep === 3 && accountMappingsAllMapped) {
			// Account mapping done, go to preview
			currentStep = 4;
			await preparePreviewStep();
		} else if (currentStep === previewStep && importStatus === 'idle') {
			await executeImport();
		}
	}

	function handleBack() {
		if (currentStep > 1 && importStatus === 'idle') {
			currentStep--;
		}
	}

	function handleProgressClose() {
		handleClose();
	}

	function handleCategorize() {
		dispatch('categorizeNow');
		resetState();
	}

	async function handleRetry() {
		importStatus = 'idle';
		await executeImport();
	}

	onMount(async () => {
		document.addEventListener('keydown', handleKeydown);
		try {
			availableAccounts = await invoke<Account[]>('get_accounts');
			if (availableAccounts.length > 0) {
				selectedAccountId = availableAccounts[0].id;
			}
		} catch {
			availableAccounts = [];
		}
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
			class:wizard-panel--wide={currentStep >= 2}
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
				{#if importStatus !== 'idle'}
					<ImportProgress
						status={importStatus}
						imported={importedCount}
						skipped={skippedCount}
						total={importSummary.toImport}
						errorMessage={importError}
						uncategorizedCount={uncategorizedImportCount}
						testId="{testId}-progress"
						on:close={handleProgressClose}
						on:retry={handleRetry}
						on:categorize={handleCategorize}
					/>
				{:else if currentStep === 1}
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
				{:else if hasAccountColumn && currentStep === 3}
					<AccountValueMapping
						{uniqueAccountValues}
						existingAccounts={availableAccounts}
						testId="{testId}-account-mapping"
						on:mappingChange={handleAccountMappingChange}
					/>
				{:else if currentStep === previewStep}
					{#if !hasAccountColumn && availableAccounts.length > 0}
						<div class="account-selector" data-testid="import-account-selector">
							<label for="import-account">Import to account:</label>
							<select id="import-account" bind:value={selectedAccountId}>
								{#each availableAccounts as acct}
									<option value={acct.id}>{acct.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					<ImportPreview
						transactions={previewTransactions}
						summary={importSummary}
						{duplicateResult}
						testId="{testId}-import-preview"
						on:duplicateOptionChange={handleDuplicateOptionChange}
						on:duplicateToggle={handleDuplicateToggle}
					/>
				{/if}
			</div>

			<!-- Footer -->
			{#if showFooter}
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
						{currentStep < previewStep ? 'Next' : 'Import'}
					</button>
				</footer>
			{/if}
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

	.account-selector {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		font-size: 0.875rem;
		color: var(--text-primary, #111827);
	}

	.account-selector select {
		padding: 6px 10px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
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
