<script lang="ts">
	import type { CsvParseResult } from '$lib/utils/csvParser';
	import type { ColumnMapping } from '$lib/utils/columnDetection';
	import { FIELD_LABELS, buildPreviewTransaction, type PreviewTransaction } from '$lib/utils/columnDetection';

	export let data: CsvParseResult;
	export let mappings: ColumnMapping[];
	export let maxRows: number = 5;
	export let testId: string = 'mapping-preview';

	// Filter to only mapped (non-skip) columns
	$: activeMappings = mappings.filter((m) => m.field !== 'skip');

	// Build preview rows using the parsed transaction builder
	$: previewTransactions = data.rows.slice(0, maxRows).map((row) =>
		buildPreviewTransaction(row, mappings)
	);

	// Determine which columns to display based on mapped fields
	$: displayFields = (() => {
		const fields = new Set(activeMappings.map((m) => m.field));
		const result: { key: keyof PreviewTransaction; label: string }[] = [];
		if (fields.has('date')) result.push({ key: 'date', label: 'Date' });
		if (fields.has('payee')) result.push({ key: 'payee', label: 'Payee' });
		if (fields.has('amount') || fields.has('inflow') || fields.has('outflow')) {
			result.push({ key: 'amountCents', label: 'Amount' });
		}
		if (fields.has('memo')) result.push({ key: 'memo', label: 'Memo' });
		if (fields.has('category')) result.push({ key: 'category', label: 'Category' });
		return result;
	})();

	function formatCellValue(field: keyof PreviewTransaction, tx: PreviewTransaction): string {
		if (field === 'amountCents') {
			const cents = tx.amountCents;
			const abs = Math.abs(cents) / 100;
			const sign = cents < 0 ? '-' : cents > 0 ? '+' : '';
			return sign + abs.toFixed(2);
		}
		return String(tx[field] || '');
	}
</script>

<div class="mapping-preview" data-testid={testId}>
	<h3 class="preview-title" data-testid="{testId}-title">Mapped Preview</h3>

	{#if activeMappings.length === 0}
		<p class="empty-state" data-testid="{testId}-empty">No columns mapped yet</p>
	{:else}
		<div class="table-wrapper">
			<table class="preview-table" data-testid="{testId}-table">
				<thead>
					<tr>
						{#each displayFields as field}
							<th>{field.label}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each previewTransactions as tx, rowIdx}
						<tr data-testid="{testId}-row-{rowIdx}">
							{#each displayFields as field}
								<td
									class:amount-cell={field.key === 'amountCents'}
									class:amount-positive={field.key === 'amountCents' && tx.amountCents > 0}
									class:amount-negative={field.key === 'amountCents' && tx.amountCents < 0}
								>
									{formatCellValue(field.key, tx)}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.mapping-preview {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.preview-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.empty-state {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary, #6b7280);
		font-style: italic;
	}

	.table-wrapper {
		overflow-x: auto;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
	}

	.preview-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
	}

	.preview-table th {
		padding: 8px 12px;
		text-align: left;
		background: var(--bg-secondary, #f9fafb);
		color: var(--text-secondary, #6b7280);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		white-space: nowrap;
	}

	.preview-table td {
		padding: 8px 12px;
		color: var(--text-primary, #111827);
		border-bottom: 1px solid var(--border-color, #f3f4f6);
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.preview-table tbody tr:last-child td {
		border-bottom: none;
	}

	.amount-cell {
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.amount-positive {
		color: var(--color-success, #10b981);
	}

	.amount-negative {
		color: var(--color-danger, #ef4444);
	}

	/* Dark mode */
	:global(.dark) .preview-title {
		color: #f9fafb;
	}

	:global(.dark) .table-wrapper {
		border-color: #374151;
	}

	:global(.dark) .preview-table th {
		background: #1a1a1a;
		border-color: #374151;
		color: #9ca3af;
	}

	:global(.dark) .preview-table td {
		color: #f9fafb;
		border-color: #2d2d2d;
	}
</style>
