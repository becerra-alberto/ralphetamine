<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
	import Calendar from './Calendar.svelte';
	import { parseDate } from '$lib/utils/dateParser';
	import { formatDateDisplay } from '$lib/utils/dates';

	export let value: string = ''; // YYYY-MM-DD ISO date
	export let label: string = 'Date';

	const dispatch = createEventDispatcher<{
		change: { date: string };
	}>();

	let isOpen = false;
	let inputValue = '';
	let error = '';
	let pickerRef: HTMLDivElement;
	let inputRef: HTMLInputElement;
	let calendarRef: HTMLDivElement;

	// Initialize view state from the value
	let viewYear = new Date().getFullYear();
	let viewMonth = new Date().getMonth();

	// Sync display value with the prop
	$: {
		if (value && !isOpen) {
			inputValue = formatDateDisplay(value);
		}
	}

	// Update calendar view when value changes
	$: {
		if (value) {
			const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
			if (match) {
				viewYear = parseInt(match[1], 10);
				viewMonth = parseInt(match[2], 10) - 1;
			}
		}
	}

	function openCalendar() {
		isOpen = true;
		error = '';
		tick().then(() => {
			const cal = pickerRef?.querySelector('[data-testid="calendar"]') as HTMLElement;
			cal?.focus();
		});
	}

	function closeCalendar() {
		isOpen = false;
	}

	function handleInputFocus() {
		// Show the raw ISO value for editing when focused
		inputValue = value || '';
	}

	function handleInputBlur() {
		if (!isOpen) {
			commitInput();
		}
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (isOpen) {
				// Let the calendar handle it
				return;
			}
			// Try to parse the input
			if (commitInput()) {
				openCalendar();
			}
		} else if (event.key === 'Escape') {
			if (isOpen) {
				event.preventDefault();
				closeCalendar();
				inputRef?.focus();
			}
		} else if (event.key === 'ArrowDown' && !isOpen) {
			event.preventDefault();
			openCalendar();
		}
	}

	function commitInput(): boolean {
		if (!inputValue.trim()) {
			// Empty input, keep current value
			inputValue = value ? formatDateDisplay(value) : '';
			return false;
		}

		const parsed = parseDate(inputValue);
		if (parsed) {
			value = parsed;
			inputValue = formatDateDisplay(parsed);
			error = '';
			dispatch('change', { date: parsed });
			return true;
		} else {
			error = 'Invalid date';
			return false;
		}
	}

	function handleCalendarSelect(event: CustomEvent<{ date: string }>) {
		value = event.detail.date;
		inputValue = formatDateDisplay(event.detail.date);
		error = '';
		isOpen = false;
		dispatch('change', { date: event.detail.date });
		inputRef?.focus();
	}

	function handleCalendarClose() {
		closeCalendar();
		inputRef?.focus();
	}

	function handleClickOutside(event: MouseEvent) {
		if (pickerRef && !pickerRef.contains(event.target as Node)) {
			if (isOpen) {
				closeCalendar();
				commitInput();
			}
		}
	}

	onMount(() => {
		document.addEventListener('mousedown', handleClickOutside);
	});

	onDestroy(() => {
		document.removeEventListener('mousedown', handleClickOutside);
	});
</script>

<div class="date-picker" bind:this={pickerRef} data-testid="date-picker">
	<div class="input-wrapper">
		<input
			bind:this={inputRef}
			bind:value={inputValue}
			type="text"
			class="date-input"
			class:error={!!error}
			placeholder="DD MMM YYYY"
			data-testid="date-picker-input"
			aria-label={label}
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			aria-invalid={!!error}
			on:focus={handleInputFocus}
			on:blur={handleInputBlur}
			on:keydown={handleInputKeydown}
		/>
		<button
			type="button"
			class="calendar-toggle"
			data-testid="date-picker-toggle"
			aria-label="Open calendar"
			tabindex="-1"
			on:click={() => { isOpen ? closeCalendar() : openCalendar(); }}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
				<line x1="16" y1="2" x2="16" y2="6" />
				<line x1="8" y1="2" x2="8" y2="6" />
				<line x1="3" y1="10" x2="21" y2="10" />
			</svg>
		</button>
	</div>

	{#if error}
		<span class="error-text" data-testid="date-picker-error">{error}</span>
	{/if}

	{#if isOpen}
		<div class="calendar-popup" bind:this={calendarRef} data-testid="date-picker-popup">
			<Calendar
				selectedDate={value}
				{viewYear}
				{viewMonth}
				on:select={handleCalendarSelect}
				on:close={handleCalendarClose}
			/>
		</div>
	{/if}
</div>

<style>
	.date-picker {
		position: relative;
		display: inline-block;
		width: 100%;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		position: relative;
	}

	.date-input {
		width: 100%;
		height: 34px;
		padding: 0 30px 0 8px;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 4px;
		background: var(--bg-primary, #ffffff);
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s ease;
		box-sizing: border-box;
	}

	.date-input:focus {
		border-color: var(--accent, #4f46e5);
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
	}

	.date-input.error {
		border-color: var(--color-danger, #ef4444);
	}

	.date-input.error:focus {
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
	}

	.calendar-toggle {
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 3px;
		background: transparent;
		color: var(--text-secondary, #9ca3af);
		cursor: pointer;
		padding: 0;
	}

	.calendar-toggle:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.error-text {
		display: block;
		font-size: 0.6875rem;
		color: var(--color-danger, #ef4444);
		margin-top: 2px;
		line-height: 1.2;
	}

	.calendar-popup {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 50;
		margin-top: 4px;
	}

	/* Dark mode */
	:global(.dark) .date-input {
		background: var(--bg-primary, #1a1a1a);
		color: var(--text-primary, #f9fafb);
		border-color: var(--border-color, #374151);
	}

	:global(.dark) .calendar-toggle:hover {
		background: rgba(255, 255, 255, 0.08);
	}
</style>
