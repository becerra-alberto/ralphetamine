<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Autocomplete from '$lib/components/shared/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/types/ui';
	import { getPayeeSuggestions, getPayeeCategory } from '$lib/api/transactions';
	import type { PayeeSuggestion } from '$lib/api/transactions';

	export let value = '';
	export let hasError = false;

	const dispatch = createEventDispatcher<{
		select: { payee: string; categoryId: string | null };
		input: string;
		enter: string;
	}>();

	let items: AutocompleteItem[] = [];
	let autocompleteRef: Autocomplete;

	async function handleSearch(event: CustomEvent<string>) {
		const query = event.detail;
		try {
			const suggestions: PayeeSuggestion[] = await getPayeeSuggestions(query, 10);
			items = suggestions.map((s) => ({
				label: s.payee,
				value: s.payee,
				detail: `(${s.frequency})`
			}));
		} catch {
			items = [];
		}
	}

	async function handleSelect(event: CustomEvent<AutocompleteItem>) {
		const selected = event.detail;
		value = selected.value;

		let categoryId: string | null = null;
		try {
			const assoc = await getPayeeCategory(selected.value);
			if (assoc) {
				categoryId = assoc.categoryId;
			}
		} catch {
			// Category lookup failed - proceed without auto-fill
		}

		dispatch('select', { payee: selected.value, categoryId });
	}

	function handleEnter(event: CustomEvent<string>) {
		dispatch('enter', event.detail);
	}

	function handleInput() {
		dispatch('input', value);
	}

	export function focus() {
		autocompleteRef?.focus();
	}

	export function getInputElement(): HTMLInputElement | undefined {
		return autocompleteRef?.getInputElement();
	}
</script>

<Autocomplete
	bind:this={autocompleteRef}
	bind:value
	{items}
	placeholder="Payee"
	label="Payee"
	minChars={2}
	maxItems={10}
	debounceMs={150}
	noMatchesText="No matches - press Enter to use as new payee"
	{hasError}
	testId="payee-autocomplete"
	on:input={handleSearch}
	on:select={handleSelect}
	on:enter={handleEnter}
	on:input={handleInput}
/>
