<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let label: string;
	export let removable = true;
	export let testId = 'chip';

	const dispatch = createEventDispatcher<{
		remove: { label: string };
	}>();

	function handleRemove(event: MouseEvent | KeyboardEvent) {
		event.stopPropagation();
		dispatch('remove', { label });
	}
</script>

<span
	class="chip"
	data-testid={testId}
	aria-label="Tag: {label}"
>
	<span class="chip-label" data-testid="{testId}-label">{label}</span>
	{#if removable}
		<button
			type="button"
			class="chip-remove"
			data-testid="{testId}-remove"
			aria-label="Remove {label}"
			on:click={handleRemove}
			on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRemove(e); }}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
				fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
				stroke-linejoin="round" aria-hidden="true">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	{/if}
</span>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 1px 6px;
		background: var(--chip-bg, rgba(79, 70, 229, 0.1));
		color: var(--chip-color, #4f46e5);
		border-radius: 10px;
		font-size: 0.6875rem;
		font-weight: 500;
		line-height: 1.4;
		white-space: nowrap;
		max-width: 120px;
	}

	.chip-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0.7;
		transition: opacity 0.1s ease, background-color 0.1s ease;
	}

	.chip-remove:hover {
		opacity: 1;
		background: rgba(79, 70, 229, 0.15);
	}

	/* Dark mode */
	:global(.dark) .chip {
		background: rgba(79, 70, 229, 0.2);
		color: #a5b4fc;
	}

	:global(.dark) .chip-remove:hover {
		background: rgba(79, 70, 229, 0.3);
	}
</style>
