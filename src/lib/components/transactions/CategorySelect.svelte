<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import CategoryDropdown from '$lib/components/shared/CategoryDropdown.svelte';
	import type { CategoryNode } from '$lib/types/ui';

	export let categories: CategoryNode[] = [];
	export let value: string | null = null;

	const dispatch = createEventDispatcher<{
		select: { categoryId: string | null };
	}>();

	let dropdownRef: CategoryDropdown;

	function handleSelect(event: CustomEvent<{ categoryId: string | null; categoryName: string }>) {
		value = event.detail.categoryId;
		dispatch('select', { categoryId: event.detail.categoryId });
	}

	function handleClear() {
		value = null;
		dispatch('select', { categoryId: null });
	}

	export function focus() {
		dropdownRef?.focus();
	}
</script>

<CategoryDropdown
	bind:this={dropdownRef}
	{categories}
	{value}
	placeholder="No category"
	testId="category-select"
	on:select={handleSelect}
	on:clear={handleClear}
/>
