<script lang="ts">
	import type { CsvParseResult } from '$lib/utils/csvParser';
	import { getPreviewRows } from '$lib/utils/csvParser';

	export let data: CsvParseResult;
	export let maxRows: number = 5;
	export let testId: string = 'csv-preview';

	$: previewRows = getPreviewRows(data, maxRows);
</script>

<div class="csv-preview" data-testid={testId}>
	<div class="preview-header">
		<h3 class="preview-title" data-testid="{testId}-title">Preview</h3>
		<span class="preview-count" data-testid="{testId}-count">
			Showing {previewRows.length} of {data.totalRows} rows
		</span>
	</div>

	<div class="table-wrapper">
		<table class="preview-table" data-testid="{testId}-table">
			<thead>
				<tr>
					{#each data.headers as header}
						<th>{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each previewRows as row, rowIdx}
					<tr data-testid="{testId}-row-{rowIdx}">
						{#each row as cell}
							<td>{cell}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.csv-preview {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.preview-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.preview-count {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
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
