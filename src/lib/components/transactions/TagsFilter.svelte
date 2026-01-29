<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TagInfo } from '$lib/types/ui';

	export let tags: TagInfo[] = [];
	export let selectedTags: string[] = [];

	const dispatch = createEventDispatcher<{
		toggle: { tag: string };
	}>();

	function handleToggle(tag: string) {
		dispatch('toggle', { tag });
	}
</script>

<div class="filter-section" data-testid="tags-filter">
	<h4 class="filter-label">Tags</h4>

	<div class="checkbox-list" data-testid="tags-list">
		{#each tags as tag}
			<label class="checkbox-item" data-testid="tag-item-{tag.name}">
				<input
					type="checkbox"
					checked={selectedTags.includes(tag.name)}
					on:change={() => handleToggle(tag.name)}
					aria-label="Filter by tag {tag.name}"
				/>
				<span class="tag-label">
					{tag.name}
					<span class="tag-count">({tag.count})</span>
				</span>
			</label>
		{/each}

		{#if tags.length === 0}
			<p class="empty-message">No tags found</p>
		{/if}
	</div>
</div>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
		margin: 0;
	}

	.checkbox-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 120px;
		overflow-y: auto;
	}

	.checkbox-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--text-primary, #111827);
	}

	.checkbox-item input[type='checkbox'] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.tag-label {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.tag-count {
		font-size: 0.7rem;
		color: var(--text-tertiary, #9ca3af);
	}

	.empty-message {
		font-size: 0.75rem;
		color: var(--text-tertiary, #9ca3af);
		margin: 0;
	}
</style>
