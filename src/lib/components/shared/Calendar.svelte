<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let selectedDate: string = ''; // YYYY-MM-DD
	export let viewYear: number = new Date().getFullYear();
	export let viewMonth: number = new Date().getMonth(); // 0-indexed

	const dispatch = createEventDispatcher<{
		select: { date: string };
		close: void;
	}>();

	const MONTH_NAMES = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	// Today's date for highlighting (computed once at init)
	const todayStr = todayISO();

	// Focused date for keyboard navigation (YYYY-MM-DD)
	let focusedDate = selectedDate || todayStr;

	// Parse selected date
	$: selectedParts = parseISO(selectedDate);
	$: focusedParts = parseISO(focusedDate);

	// Calculate calendar grid
	$: calendarDays = getCalendarDays(viewYear, viewMonth);

	function parseISO(iso: string): { year: number; month: number; day: number } | null {
		const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) return null;
		return {
			year: parseInt(match[1], 10),
			month: parseInt(match[2], 10) - 1, // 0-indexed
			day: parseInt(match[3], 10)
		};
	}

	function todayISO(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function toISO(year: number, month: number, day: number): string {
		return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	interface CalendarDay {
		date: string; // YYYY-MM-DD
		day: number;
		isCurrentMonth: boolean;
		isToday: boolean;
		isSelected: boolean;
	}

	function getCalendarDays(year: number, month: number): CalendarDay[] {
		const days: CalendarDay[] = [];

		// First day of the month
		const firstDay = new Date(year, month, 1);
		const startDow = firstDay.getDay(); // 0=Sunday

		// Days in this month
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		// Days from previous month to fill first row
		const prevMonth = month === 0 ? 11 : month - 1;
		const prevYear = month === 0 ? year - 1 : year;
		const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

		for (let i = startDow - 1; i >= 0; i--) {
			const day = daysInPrevMonth - i;
			const dateStr = toISO(prevYear, prevMonth, day);
			days.push({
				date: dateStr,
				day,
				isCurrentMonth: false,
				isToday: dateStr === todayStr,
				isSelected: dateStr === selectedDate
			});
		}

		// Current month
		for (let day = 1; day <= daysInMonth; day++) {
			const dateStr = toISO(year, month, day);
			days.push({
				date: dateStr,
				day,
				isCurrentMonth: true,
				isToday: dateStr === todayStr,
				isSelected: dateStr === selectedDate
			});
		}

		// Next month to fill last row
		const nextMonth = month === 11 ? 0 : month + 1;
		const nextYear = month === 11 ? year + 1 : year;
		const remaining = 42 - days.length; // 6 rows * 7 days
		for (let day = 1; day <= remaining; day++) {
			const dateStr = toISO(nextYear, nextMonth, day);
			days.push({
				date: dateStr,
				day,
				isCurrentMonth: false,
				isToday: dateStr === todayStr,
				isSelected: dateStr === selectedDate
			});
		}

		return days;
	}

	function goToPrevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear -= 1;
		} else {
			viewMonth -= 1;
		}
	}

	function goToNextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear += 1;
		} else {
			viewMonth += 1;
		}
	}

	function selectDate(dateStr: string) {
		dispatch('select', { date: dateStr });
	}

	function handleKeydown(event: KeyboardEvent) {
		const parts = parseISO(focusedDate);
		if (!parts) return;

		const d = new Date(parts.year, parts.month, parts.day);

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				d.setDate(d.getDate() - 1);
				updateFocused(d);
				break;
			case 'ArrowRight':
				event.preventDefault();
				d.setDate(d.getDate() + 1);
				updateFocused(d);
				break;
			case 'ArrowUp':
				event.preventDefault();
				d.setDate(d.getDate() - 7);
				updateFocused(d);
				break;
			case 'ArrowDown':
				event.preventDefault();
				d.setDate(d.getDate() + 7);
				updateFocused(d);
				break;
			case 'Enter':
				event.preventDefault();
				selectDate(focusedDate);
				break;
			case 'Escape':
				event.preventDefault();
				dispatch('close');
				break;
		}
	}

	function updateFocused(d: Date) {
		focusedDate = toISO(d.getFullYear(), d.getMonth(), d.getDate());
		// Update view if focused date moves to different month
		viewYear = d.getFullYear();
		viewMonth = d.getMonth();
	}
</script>

<div
	class="calendar"
	data-testid="calendar"
	role="grid"
	aria-label="Calendar"
	tabindex="0"
	on:keydown={handleKeydown}
>
	<div class="calendar-header" data-testid="calendar-header">
		<button
			type="button"
			class="nav-btn"
			on:click={goToPrevMonth}
			data-testid="calendar-prev-month"
			aria-label="Previous month"
		>
			&lsaquo;
		</button>
		<span class="month-year" data-testid="calendar-month-year">
			{MONTH_NAMES[viewMonth]} {viewYear}
		</span>
		<button
			type="button"
			class="nav-btn"
			on:click={goToNextMonth}
			data-testid="calendar-next-month"
			aria-label="Next month"
		>
			&rsaquo;
		</button>
	</div>

	<div class="day-headers" role="row">
		{#each DAY_HEADERS as dayName}
			<span class="day-header" role="columnheader">{dayName}</span>
		{/each}
	</div>

	<div class="day-grid">
		{#each calendarDays as dayInfo}
			<button
				type="button"
				class="day-cell"
				class:other-month={!dayInfo.isCurrentMonth}
				class:today={dayInfo.isToday}
				class:selected={dayInfo.isSelected}
				class:focused={dayInfo.date === focusedDate}
				data-testid="calendar-day-{dayInfo.date}"
				data-date={dayInfo.date}
				role="gridcell"
				aria-selected={dayInfo.isSelected}
				aria-current={dayInfo.isToday ? 'date' : undefined}
				on:click={() => selectDate(dayInfo.date)}
			>
				{dayInfo.day}
			</button>
		{/each}
	</div>
</div>

<style>
	.calendar {
		width: 280px;
		background: var(--bg-primary, #ffffff);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		padding: 12px;
		outline: none;
	}

	.calendar:focus-visible {
		box-shadow: 0 0 0 2px var(--accent, #4f46e5), 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.month-year {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary, #6b7280);
		font-size: 1.25rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.nav-btn:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.day-headers {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 0;
		margin-bottom: 4px;
	}

	.day-header {
		text-align: center;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-secondary, #9ca3af);
		padding: 4px 0;
		text-transform: uppercase;
	}

	.day-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	.day-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--text-primary, #111827);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: background-color 0.1s ease;
		padding: 0;
	}

	.day-cell:hover {
		background: var(--bg-hover, #f3f4f6);
	}

	.day-cell.other-month {
		color: var(--text-tertiary, #d1d5db);
	}

	.day-cell.today {
		font-weight: 700;
		color: var(--accent, #4f46e5);
	}

	.day-cell.selected {
		background: var(--accent, #4f46e5);
		color: white;
		font-weight: 600;
	}

	.day-cell.selected:hover {
		background: var(--accent-dark, #4338ca);
	}

	.day-cell.focused:not(.selected) {
		outline: 2px solid var(--accent, #4f46e5);
		outline-offset: -2px;
	}

	/* Dark mode */
	:global(.dark) .calendar {
		background: var(--bg-secondary, #1a1a1a);
		border-color: var(--border-color, #374151);
	}

	:global(.dark) .nav-btn:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .day-cell:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(.dark) .day-cell.other-month {
		color: var(--text-tertiary, #4b5563);
	}
</style>
