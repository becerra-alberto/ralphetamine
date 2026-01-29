<script lang="ts">
	import type { MonthString } from '$lib/types/budget';
	import { getYear, getMonthNumber } from '$lib/utils/dates';

	export let value: MonthString;
	export let minYear: number = 2020;
	export let maxYear: number = new Date().getFullYear() + 1;
	export let id: string = '';
	export let label: string = '';
	// Optional min/max month constraints
	export let minMonth: MonthString | undefined = undefined;
	export let maxMonth: MonthString | undefined = undefined;

	// Parse current value
	$: selectedYear = getYear(value);
	$: selectedMonth = getMonthNumber(value);

	// Calculate effective min/max years based on constraints
	$: effectiveMinYear = minMonth ? getYear(minMonth) : minYear;
	$: effectiveMaxYear = maxMonth ? getYear(maxMonth) : maxYear;

	// Generate year options
	$: years = Array.from(
		{ length: effectiveMaxYear - effectiveMinYear + 1 },
		(_, i) => effectiveMinYear + i
	);

	// All months
	const allMonths = [
		{ value: 1, label: 'Jan' },
		{ value: 2, label: 'Feb' },
		{ value: 3, label: 'Mar' },
		{ value: 4, label: 'Apr' },
		{ value: 5, label: 'May' },
		{ value: 6, label: 'Jun' },
		{ value: 7, label: 'Jul' },
		{ value: 8, label: 'Aug' },
		{ value: 9, label: 'Sep' },
		{ value: 10, label: 'Oct' },
		{ value: 11, label: 'Nov' },
		{ value: 12, label: 'Dec' }
	];

	// Filter available months based on min/max constraints for current year
	$: availableMonths = allMonths.filter((m) => {
		const monthStr = `${selectedYear}-${String(m.value).padStart(2, '0')}`;
		if (minMonth && monthStr < minMonth) return false;
		if (maxMonth && monthStr > maxMonth) return false;
		return true;
	});

	function handleMonthChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedMonth = parseInt(target.value, 10);
		updateValue();
	}

	function handleYearChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedYear = parseInt(target.value, 10);
		// Ensure selected month is still valid for new year
		const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
		if (minMonth && monthStr < minMonth) {
			selectedMonth = getMonthNumber(minMonth);
		}
		if (maxMonth && monthStr > maxMonth) {
			selectedMonth = getMonthNumber(maxMonth);
		}
		updateValue();
	}

	function updateValue() {
		value = selectedYear + '-' + String(selectedMonth).padStart(2, '0');
	}
</script>

<div class="month-picker" data-testid="month-picker">
	{#if label}
		<label class="picker-label" for="{id}-month">{label}</label>
	{/if}

	<div class="picker-controls">
		<select
			id="{id}-month"
			class="month-select"
			value={selectedMonth}
			on:change={handleMonthChange}
			aria-label="Month"
		>
			{#each availableMonths as month (month.value)}
				<option value={month.value}>{month.label}</option>
			{/each}
		</select>

		<select
			id="{id}-year"
			class="year-select"
			value={selectedYear}
			on:change={handleYearChange}
			aria-label="Year"
		>
			{#each years as year (year)}
				<option value={year}>{year}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.month-picker {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.picker-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
	}

	.picker-controls {
		display: flex;
		gap: 8px;
	}

	.month-select,
	.year-select {
		padding: 6px 8px;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.month-select:focus,
	.year-select:focus {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 1px;
	}

	.month-select {
		width: 70px;
	}

	.year-select {
		width: 80px;
	}

	/* Dark mode */
	:global(.dark) .month-picker {
		--bg-primary: #1a1a1a;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
	}
</style>
