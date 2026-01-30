<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { parseDisplayToCents, formatCentsToDisplay } from '$lib/utils/currency';

	export let balanceCents: number;
	export let testId = 'balance-edit';

	const dispatch = createEventDispatcher<{
		save: { newBalanceCents: number };
		cancel: void;
	}>();

	let isEditing = false;
	let inputValue = '';
	let inputElement: HTMLInputElement | undefined;
	let editContainer: HTMLDivElement | undefined;

	function startEdit() {
		isEditing = true;
		inputValue = formatCentsToDisplay(Math.abs(balanceCents));
		// Use requestAnimationFrame to ensure DOM has updated before focusing
		requestAnimationFrame(() => {
			inputElement?.focus();
			inputElement?.select();
		});
	}

	function handleSave() {
		if (!isEditing) return;
		const parsed = parseDisplayToCents(inputValue);
		// If original was negative (liability), keep it negative
		const newCents = balanceCents < 0 ? -Math.abs(parsed) : parsed;
		isEditing = false;
		dispatch('save', { newBalanceCents: newCents });
	}

	function handleCancel() {
		if (!isEditing) return;
		isEditing = false;
		dispatch('cancel');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSave();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleCancel();
		}
	}

	function handleBlur(event: FocusEvent) {
		// Check if focus is moving to a related element within the edit container
		const relatedTarget = event.relatedTarget as HTMLElement | null;
		if (relatedTarget && editContainer?.contains(relatedTarget)) {
			// Focus moved to a sibling element (e.g., currency select) — don't cancel
			return;
		}
		// Focus left the edit area — save gracefully
		handleSave();
	}
</script>

{#if isEditing}
	<div class="balance-edit-container" bind:this={editContainer} data-testid="{testId}-container">
		<input
			bind:this={inputElement}
			bind:value={inputValue}
			type="text"
			inputmode="decimal"
			class="balance-input"
			data-testid="{testId}-input"
			on:keydown={handleKeydown}
			on:blur={handleBlur}
		/>
	</div>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<span
		class="balance-clickable"
		data-testid="{testId}-trigger"
		on:click={startEdit}
		title="Click to edit balance"
	>
		<slot />
		<svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
		</svg>
	</span>
{/if}

<style>
	.balance-edit-container {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.balance-clickable {
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border-bottom: 1px dashed transparent;
		padding-bottom: 1px;
		transition: border-color 0.15s, color 0.15s;
	}

	.balance-clickable:hover {
		border-bottom-color: var(--accent, #4f46e5);
	}

	.edit-icon {
		opacity: 0;
		color: var(--text-secondary, #9ca3af);
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.balance-clickable:hover .edit-icon {
		opacity: 1;
		color: var(--accent, #4f46e5);
	}

	.balance-input {
		width: 120px;
		padding: 2px 6px;
		font-size: 0.875rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		border: 1px solid var(--accent, #4f46e5);
		border-radius: 4px;
		outline: none;
		text-align: right;
		color: var(--text-primary, #111827);
		background: var(--bg-primary, #ffffff);
	}

	.balance-input:focus {
		box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
	}

	:global(.dark) .balance-input {
		background: var(--bg-secondary, #1a1a1a);
		color: var(--text-primary, #f9fafb);
		border-color: #6366f1;
	}
</style>
