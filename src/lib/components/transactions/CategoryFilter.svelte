<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { CategoryNode } from '$lib/types/ui';

	export let categories: CategoryNode[] = [];
	export let selectedIds: string[] = [];

	const dispatch = createEventDispatcher<{
		toggle: { categoryId: string };
		toggleParent: { parentId: string; childIds: string[] };
	}>();

	let expandedSections: Set<string> = new Set(categories.map((c) => c.id));

	$: {
		// Auto-expand all sections when categories change
		expandedSections = new Set(categories.map((c) => c.id));
	}

	function toggleSection(sectionId: string) {
		if (expandedSections.has(sectionId)) {
			expandedSections.delete(sectionId);
		} else {
			expandedSections.add(sectionId);
		}
		expandedSections = expandedSections;
	}

	function handleToggle(categoryId: string) {
		dispatch('toggle', { categoryId });
	}

	function handleParentToggle(parent: CategoryNode) {
		const childIds = parent.children.map((c) => c.id);
		dispatch('toggleParent', { parentId: parent.id, childIds });
	}

	function isParentChecked(parent: CategoryNode): boolean {
		if (parent.children.length === 0) return selectedIds.includes(parent.id);
		return parent.children.every((c) => selectedIds.includes(c.id));
	}

	function isParentIndeterminate(parent: CategoryNode): boolean {
		if (parent.children.length === 0) return false;
		const selectedCount = parent.children.filter((c) => selectedIds.includes(c.id)).length;
		return selectedCount > 0 && selectedCount < parent.children.length;
	}
</script>

<div class="filter-section" data-testid="category-filter">
	<h4 class="filter-label">Categories</h4>

	<div class="category-tree" data-testid="category-tree">
		{#each categories as section}
			<div class="category-section" data-testid="category-section-{section.id}">
				<div class="section-header">
					<button
						type="button"
						class="expand-btn"
						on:click={() => toggleSection(section.id)}
						aria-expanded={expandedSections.has(section.id)}
						aria-label="{expandedSections.has(section.id) ? 'Collapse' : 'Expand'} {section.name}"
						data-testid="category-expand-{section.id}"
					>
						<svg
							class="chevron"
							class:expanded={expandedSections.has(section.id)}
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
					</button>
					<label class="section-checkbox">
						<input
							type="checkbox"
							checked={isParentChecked(section)}
							indeterminate={isParentIndeterminate(section)}
							on:change={() => handleParentToggle(section)}
							aria-label="Filter by {section.name} category"
						/>
						<span class="section-name">{section.name}</span>
					</label>
				</div>

				{#if expandedSections.has(section.id)}
					<div class="children" data-testid="category-children-{section.id}">
						{#each section.children as child}
							<label
								class="child-checkbox"
								data-testid="category-item-{child.id}"
							>
								<input
									type="checkbox"
									checked={selectedIds.includes(child.id)}
									on:change={() => handleToggle(child.id)}
									aria-label="Filter by {child.name}"
								/>
								<span class="child-name">{child.name}</span>
							</label>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#if categories.length === 0}
			<p class="empty-message">No categories found</p>
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

	.category-tree {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 200px;
		overflow-y: auto;
	}

	.category-section {
		display: flex;
		flex-direction: column;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 0;
	}

	.expand-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--text-secondary, #6b7280);
	}

	.chevron {
		transition: transform 0.15s ease;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.section-checkbox {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.section-checkbox input[type='checkbox'] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.children {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-left: 32px;
	}

	.child-checkbox {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-size: 0.8rem;
		color: var(--text-primary, #111827);
		padding: 2px 0;
	}

	.child-checkbox input[type='checkbox'] {
		width: 14px;
		height: 14px;
		accent-color: var(--accent, #4f46e5);
		cursor: pointer;
	}

	.empty-message {
		font-size: 0.75rem;
		color: var(--text-tertiary, #9ca3af);
		margin: 0;
	}
</style>
