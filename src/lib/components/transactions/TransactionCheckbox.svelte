<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let transactionId: string;
	export let checked: boolean = false;
	export let testId: string = 'transaction-checkbox';

	const dispatch = createEventDispatcher<{
		toggle: { transactionId: string; checked: boolean };
	}>();

	function handleChange() {
		const newValue = !checked;
		dispatch('toggle', { transactionId, checked: newValue });
	}
</script>

<label
	class="checkbox-wrapper"
	data-testid={testId}
	on:click|stopPropagation
>
	<input
		type="checkbox"
		{checked}
		on:change={handleChange}
		data-testid="{testId}-input"
		aria-label="Select transaction"
	/>
</label>

<style>
	.checkbox-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 2px;
	}

	.checkbox-wrapper input {
		width: 16px;
		height: 16px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
		margin: 0;
	}
</style>
