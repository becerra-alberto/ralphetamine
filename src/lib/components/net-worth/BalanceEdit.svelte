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

	function startEdit() {
		isEditing = true;
		inputValue = formatCentsToDisplay(Math.abs(balanceCents));
		// Focus and select on next tick
		setTimeout(() => {
			inputElement?.focus();
			inputElement?.select();
		}, 0);
	}

	function handleSave() {
		const parsed = parseDisplayToCents(inputValue);
		// If original was negative (liability), keep it negative
		const newCents = balanceCents < 0 ? -Math.abs(parsed) : parsed;
		isEditing = false;
		dispatch('save', { newBalanceCents: newCents });
	}

	function handleCancel() {
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
</script>

{#if isEditing}
	<input
		bind:this={inputElement}
		bind:value={inputValue}
		type="text"
		inputmode="decimal"
		class="balance-input"
		data-testid="{testId}-input"
		on:keydown={handleKeydown}
		on:blur={handleCancel}
	/>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<span
		class="balance-clickable"
		data-testid="{testId}-trigger"
		on:click={startEdit}
	>
		<slot />
	</span>
{/if}

<style>
	.balance-clickable {
		cursor: pointer;
		border-bottom: 1px dashed transparent;
		transition: border-color 0.15s;
	}

	.balance-clickable:hover {
		border-bottom-color: var(--accent, #4f46e5);
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
