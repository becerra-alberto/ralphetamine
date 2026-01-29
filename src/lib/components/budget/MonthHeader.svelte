<script lang="ts">
	import type { MonthString } from '$lib/types/budget';
	import { formatMonthShort } from '$lib/utils/dates';

	export let month: MonthString;
	export let isCurrent: boolean = false;

	$: monthLabel = formatMonthShort(month);
</script>

<div
	class="month-header"
	class:current={isCurrent}
	role="columnheader"
	aria-label={monthLabel}
>
	{monthLabel}
</div>

<style>
	.month-header {
		min-width: 120px;
		width: 120px;
		padding: 8px 12px;
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		background: var(--bg-secondary, #f9fafb);
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		border-right: 1px solid var(--border-color, #e5e7eb);
	}

	.month-header.current {
		background: var(--bg-highlight, #eff6ff);
		color: var(--color-accent, #4f46e5);
		font-weight: 600;
	}

	/* Dark mode */
	:global(.dark) .month-header {
		--bg-secondary: #1a1a1a;
		--border-color: #2d2d2d;
		--text-secondary: #9ca3af;
	}

	:global(.dark) .month-header.current {
		--bg-highlight: #1e3a5f;
		--color-accent: #818cf8;
	}
</style>
