<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import TagSelect from '$lib/components/shared/TagSelect.svelte';
	import { getUniqueTags } from '$lib/api/transactions';

	export let value: string[] = [];

	const dispatch = createEventDispatcher<{
		change: { tags: string[] };
	}>();

	let tagSelectRef: TagSelect;
	let customTags: string[] = [];

	onMount(async () => {
		try {
			customTags = await getUniqueTags();
		} catch {
			customTags = [];
		}
	});

	function handleChange(event: CustomEvent<{ tags: string[] }>) {
		value = event.detail.tags;
		dispatch('change', { tags: value });
	}

	export function focus() {
		tagSelectRef?.focus();
	}

	export function getTags(): string[] {
		return value;
	}
</script>

<TagSelect
	bind:this={tagSelectRef}
	bind:value
	availableTags={customTags}
	placeholder="Add tags..."
	testId="tags-input"
	on:change={handleChange}
/>
