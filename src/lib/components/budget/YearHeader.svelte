<script lang="ts">
	export let year: number;
	export let monthCount: number;

	// Calculate width based on number of months (120px per month)
	$: width = monthCount * 120;
</script>

<div
	class="year-header"
	style="width: {width}px; min-width: {width}px;"
	role="columnheader"
	aria-label={String(year)}
>
	{year}
</div>

<style>
	.year-header {
		padding: 8px 12px;
		text-align: center;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary, #9ca3af);
		background: var(--bg-tertiary, #f3f4f6);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		border-right: 1px solid var(--border-color, #e5e7eb);
	}

	/* Dark mode */
	:global(.dark) .year-header {
		--bg-tertiary: #262626;
		--border-color: #2d2d2d;
		--text-tertiary: #6b7280;
	}
</style>
