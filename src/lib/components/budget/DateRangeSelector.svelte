<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import MonthPicker from '../shared/MonthPicker.svelte';
	import type { MonthString } from '$lib/types/budget';
	import {
		formatMonthDisplay,
		getCurrentMonth,
		getDefaultDateRange,
		getThisYearRangeArray,
		getLastYearRangeArray,
		getThisQuarterRangeArray,
		getMonthRange
	} from '$lib/utils/dates';

	export let startMonth: MonthString;
	export let endMonth: MonthString;
	// Callback prop for Svelte 5 compatibility in tests
	export let onchange: ((event: CustomEvent<{ startMonth: MonthString; endMonth: MonthString }>) => void) | undefined = undefined;

	const dispatch = createEventDispatcher<{
		change: { startMonth: MonthString; endMonth: MonthString };
	}>();

	/**
	 * Dispatch change event and call callback if provided
	 */
	function emitChange(newStart: MonthString, newEnd: MonthString) {
		const detail = { startMonth: newStart, endMonth: newEnd };
		dispatch('change', detail);
		if (onchange) {
			onchange(new CustomEvent('change', { detail }));
		}
	}

	let isOpen = false;
	let showCustom = false;
	let customStart = startMonth;
	let customEnd = endMonth;

	const MAX_MONTHS = 36;

	type Preset = 'rolling-12' | 'this-year' | 'last-year' | 'this-quarter' | 'custom';

	// Determine which preset is currently selected
	$: currentPreset = detectPreset(startMonth, endMonth);
	$: displayText = formatRangeDisplay(startMonth, endMonth);

	/**
	 * Detect which preset matches the current range
	 */
	function detectPreset(start: MonthString, end: MonthString): Preset | null {
		const rolling12 = getDefaultDateRange();
		if (start === rolling12[0] && end === rolling12[rolling12.length - 1]) {
			return 'rolling-12';
		}

		const thisYear = getThisYearRangeArray();
		if (start === thisYear[0] && end === thisYear[thisYear.length - 1]) {
			return 'this-year';
		}

		const lastYear = getLastYearRangeArray();
		if (start === lastYear[0] && end === lastYear[lastYear.length - 1]) {
			return 'last-year';
		}

		const thisQuarter = getThisQuarterRangeArray();
		if (start === thisQuarter[0] && end === thisQuarter[thisQuarter.length - 1]) {
			return 'this-quarter';
		}

		return 'custom';
	}

	/**
	 * Format the range for display
	 */
	function formatRangeDisplay(start: MonthString, end: MonthString): string {
		return `${formatMonthDisplay(start)} - ${formatMonthDisplay(end)}`;
	}

	/**
	 * Apply a preset range
	 */
	function applyPreset(preset: Preset) {
		let range: MonthString[];

		switch (preset) {
			case 'rolling-12':
				range = getDefaultDateRange();
				break;
			case 'this-year':
				range = getThisYearRangeArray();
				break;
			case 'last-year':
				range = getLastYearRangeArray();
				break;
			case 'this-quarter':
				range = getThisQuarterRangeArray();
				break;
			case 'custom':
				showCustom = true;
				return;
			default:
				return;
		}

		startMonth = range[0];
		endMonth = range[range.length - 1];
		emitChange(startMonth, endMonth);
		isOpen = false;
		showCustom = false;
	}

	/**
	 * Apply custom range
	 */
	function applyCustomRange() {
		// Validate range doesn't exceed max months
		const months = getMonthRange(customStart, customEnd);
		if (months.length > MAX_MONTHS) {
			// Show error - range too large
			return;
		}

		// Ensure start is before end
		if (customStart > customEnd) {
			const temp = customStart;
			customStart = customEnd;
			customEnd = temp;
		}

		startMonth = customStart;
		endMonth = customEnd;
		emitChange(startMonth, endMonth);
		isOpen = false;
		showCustom = false;
	}

	/**
	 * Cancel custom range and go back to presets
	 */
	function cancelCustom() {
		showCustom = false;
		customStart = startMonth;
		customEnd = endMonth;
	}

	/**
	 * Toggle dropdown
	 */
	function toggleDropdown() {
		isOpen = !isOpen;
		if (!isOpen) {
			showCustom = false;
		}
	}

	/**
	 * Close dropdown when clicking outside
	 */
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.date-range-selector')) {
			isOpen = false;
			showCustom = false;
		}
	}

	/**
	 * Handle keyboard navigation
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isOpen = false;
			showCustom = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="date-range-selector" data-testid="date-range-selector">
	<button
		type="button"
		class="selector-trigger"
		on:click={toggleDropdown}
		aria-expanded={isOpen}
		aria-haspopup="listbox"
	>
		<span class="range-text">{displayText}</span>
		<span class="dropdown-arrow" aria-hidden="true">▼</span>
	</button>

	{#if isOpen}
		<div class="dropdown-panel" role="listbox" aria-label="Date range options">
			{#if !showCustom}
				<!-- Preset options -->
				<button
					type="button"
					class="preset-option"
					class:selected={currentPreset === 'rolling-12'}
					on:click={() => applyPreset('rolling-12')}
					role="option"
					aria-selected={currentPreset === 'rolling-12'}
				>
					<span class="option-label">Rolling 12 Months</span>
					{#if currentPreset === 'rolling-12'}
						<span class="check-mark" aria-hidden="true">✓</span>
					{/if}
				</button>

				<button
					type="button"
					class="preset-option"
					class:selected={currentPreset === 'this-year'}
					on:click={() => applyPreset('this-year')}
					role="option"
					aria-selected={currentPreset === 'this-year'}
				>
					<span class="option-label">This Year</span>
					{#if currentPreset === 'this-year'}
						<span class="check-mark" aria-hidden="true">✓</span>
					{/if}
				</button>

				<button
					type="button"
					class="preset-option"
					class:selected={currentPreset === 'last-year'}
					on:click={() => applyPreset('last-year')}
					role="option"
					aria-selected={currentPreset === 'last-year'}
				>
					<span class="option-label">Last Year</span>
					{#if currentPreset === 'last-year'}
						<span class="check-mark" aria-hidden="true">✓</span>
					{/if}
				</button>

				<button
					type="button"
					class="preset-option"
					class:selected={currentPreset === 'this-quarter'}
					on:click={() => applyPreset('this-quarter')}
					role="option"
					aria-selected={currentPreset === 'this-quarter'}
				>
					<span class="option-label">This Quarter</span>
					{#if currentPreset === 'this-quarter'}
						<span class="check-mark" aria-hidden="true">✓</span>
					{/if}
				</button>

				<div class="divider"></div>

				<button
					type="button"
					class="preset-option"
					class:selected={currentPreset === 'custom'}
					on:click={() => applyPreset('custom')}
					role="option"
					aria-selected={currentPreset === 'custom'}
				>
					<span class="option-label">Custom Range...</span>
					{#if currentPreset === 'custom'}
						<span class="check-mark" aria-hidden="true">✓</span>
					{/if}
				</button>
			{:else}
				<!-- Custom range picker -->
				<div class="custom-range">
					<div class="custom-header">
						<button type="button" class="back-btn" on:click={cancelCustom}>
							← Back
						</button>
						<span class="custom-title">Custom Range</span>
					</div>

					<div class="pickers-container">
						<MonthPicker
							bind:value={customStart}
							label="Start"
							maxMonth={customEnd}
						/>
						<MonthPicker
							bind:value={customEnd}
							label="End"
							minMonth={customStart}
						/>
					</div>

					<div class="custom-footer">
						<span class="range-info">
							{getMonthRange(customStart, customEnd).length} months
							{#if getMonthRange(customStart, customEnd).length > MAX_MONTHS}
								<span class="error">(max {MAX_MONTHS})</span>
							{/if}
						</span>
						<button
							type="button"
							class="apply-btn"
							on:click={applyCustomRange}
							disabled={getMonthRange(customStart, customEnd).length > MAX_MONTHS}
						>
							Apply
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.date-range-selector {
		position: relative;
		display: inline-block;
	}

	.selector-trigger {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.selector-trigger:hover {
		border-color: var(--color-accent, #4f46e5);
	}

	.selector-trigger:focus-visible {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 1px;
	}

	.range-text {
		white-space: nowrap;
	}

	.dropdown-arrow {
		font-size: 0.625rem;
		color: var(--text-secondary, #6b7280);
	}

	.dropdown-panel {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 50;
		min-width: 220px;
		padding: 4px;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.preset-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 10px 12px;
		font-size: 0.875rem;
		text-align: left;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary, #111827);
		cursor: pointer;
	}

	.preset-option:hover {
		background: var(--bg-secondary, #f9fafb);
	}

	.preset-option.selected {
		background: var(--bg-highlight, #eff6ff);
	}

	.check-mark {
		color: var(--color-accent, #4f46e5);
		font-weight: 600;
	}

	.divider {
		height: 1px;
		margin: 4px 0;
		background: var(--border-color, #e5e7eb);
	}

	.custom-range {
		padding: 8px;
	}

	.custom-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.back-btn {
		padding: 4px 8px;
		font-size: 0.75rem;
		border: none;
		border-radius: 4px;
		background: var(--bg-secondary, #f9fafb);
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
	}

	.back-btn:hover {
		background: var(--bg-tertiary, #f3f4f6);
	}

	.custom-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.pickers-container {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.custom-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.range-info {
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.range-info .error {
		color: var(--color-danger, #ef4444);
	}

	.apply-btn {
		padding: 8px 16px;
		font-size: 0.875rem;
		font-weight: 500;
		border: none;
		border-radius: 6px;
		background: var(--color-accent, #4f46e5);
		color: white;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.apply-btn:hover:not(:disabled) {
		background: var(--color-accent-hover, #4338ca);
	}

	.apply-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Dark mode */
	:global(.dark) .date-range-selector {
		--bg-primary: #0f0f0f;
		--bg-secondary: #1a1a1a;
		--bg-tertiary: #262626;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--bg-highlight: #1e3a5f;
	}
</style>
