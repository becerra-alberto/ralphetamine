<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	export let visible: boolean = false;
	export let targetElement: HTMLElement | null = null;
	export let position: 'top' | 'bottom' | 'auto' = 'auto';

	let tooltipElement: HTMLElement;
	let computedPosition: 'top' | 'bottom' = 'top';
	let tooltipStyle: string = '';

	// Calculate position when visible or target changes
	$: if (visible && targetElement && tooltipElement) {
		calculatePosition();
	}

	function calculatePosition() {
		if (!targetElement || !tooltipElement) return;

		const targetRect = targetElement.getBoundingClientRect();
		const tooltipRect = tooltipElement.getBoundingClientRect();
		const viewportHeight = window.innerHeight;

		// Auto-detect position based on available space
		if (position === 'auto') {
			const spaceAbove = targetRect.top;
			const spaceBelow = viewportHeight - targetRect.bottom;
			computedPosition = spaceAbove > spaceBelow ? 'top' : 'bottom';
		} else {
			computedPosition = position;
		}

		// Calculate left position (center on target)
		let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;

		// Keep within viewport horizontally
		const padding = 8;
		if (left < padding) left = padding;
		if (left + tooltipRect.width > window.innerWidth - padding) {
			left = window.innerWidth - tooltipRect.width - padding;
		}

		// Calculate top position
		let top: number;
		if (computedPosition === 'top') {
			top = targetRect.top - tooltipRect.height - 8;
		} else {
			top = targetRect.bottom + 8;
		}

		tooltipStyle = `left: ${left}px; top: ${top}px;`;
	}

	onMount(() => {
		// Recalculate on resize
		const handleResize = () => {
			if (visible) calculatePosition();
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

{#if visible}
	<div
		bind:this={tooltipElement}
		class="tooltip {computedPosition}"
		style={tooltipStyle}
		role="tooltip"
		data-testid="tooltip"
		transition:fade={{ duration: 150 }}
	>
		<slot />
		<div class="tooltip-arrow"></div>
	</div>
{/if}

<style>
	.tooltip {
		position: fixed;
		z-index: 1000;
		background: var(--bg-tooltip, #1f2937);
		color: var(--text-tooltip, #f9fafb);
		border-radius: 8px;
		padding: 12px 16px;
		font-size: 0.875rem;
		line-height: 1.5;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		max-width: 280px;
		pointer-events: auto;
	}

	.tooltip-arrow {
		position: absolute;
		width: 8px;
		height: 8px;
		background: var(--bg-tooltip, #1f2937);
		transform: rotate(45deg);
	}

	.tooltip.top .tooltip-arrow {
		bottom: -4px;
		left: 50%;
		margin-left: -4px;
	}

	.tooltip.bottom .tooltip-arrow {
		top: -4px;
		left: 50%;
		margin-left: -4px;
	}

	/* Light mode */
	:global(.light) .tooltip {
		--bg-tooltip: #ffffff;
		--text-tooltip: #1f2937;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06),
			0 0 0 1px rgba(0, 0, 0, 0.05);
	}
</style>
