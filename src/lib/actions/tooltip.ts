/**
 * Tooltip Svelte action
 * 
 * Manages hover state with configurable delays for showing and hiding tooltips.
 * Usage: <div use:tooltip={{ onShow, onHide, showDelay: 200, hideDelay: 200 }}>
 */

export interface TooltipOptions {
	onShow: (element: HTMLElement) => void;
	onHide: () => void;
	showDelay?: number;
	hideDelay?: number;
}

export function tooltip(node: HTMLElement, options: TooltipOptions) {
	let showTimeout: ReturnType<typeof setTimeout> | null = null;
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;
	let isHovered = false;

	const { showDelay = 200, hideDelay = 200 } = options;

	function handleMouseEnter() {
		isHovered = true;

		// Clear any pending hide
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}

		// Schedule show
		showTimeout = setTimeout(() => {
			if (isHovered) {
				options.onShow(node);
			}
		}, showDelay);
	}

	function handleMouseLeave() {
		isHovered = false;

		// Clear any pending show
		if (showTimeout) {
			clearTimeout(showTimeout);
			showTimeout = null;
		}

		// Schedule hide with grace period
		hideTimeout = setTimeout(() => {
			if (!isHovered) {
				options.onHide();
			}
		}, hideDelay);
	}

	// Add event listeners
	node.addEventListener('mouseenter', handleMouseEnter);
	node.addEventListener('mouseleave', handleMouseLeave);

	return {
		update(newOptions: TooltipOptions) {
			Object.assign(options, newOptions);
		},
		destroy() {
			// Cleanup timeouts
			if (showTimeout) clearTimeout(showTimeout);
			if (hideTimeout) clearTimeout(hideTimeout);

			// Remove listeners
			node.removeEventListener('mouseenter', handleMouseEnter);
			node.removeEventListener('mouseleave', handleMouseLeave);
		}
	};
}

/**
 * Action for the tooltip content element
 * Keeps tooltip open when hovering over the tooltip itself
 */
export function tooltipContent(node: HTMLElement, options: { onMouseEnter: () => void; onMouseLeave: () => void }) {
	function handleMouseEnter() {
		options.onMouseEnter();
	}

	function handleMouseLeave() {
		options.onMouseLeave();
	}

	node.addEventListener('mouseenter', handleMouseEnter);
	node.addEventListener('mouseleave', handleMouseLeave);

	return {
		update(newOptions: { onMouseEnter: () => void; onMouseLeave: () => void }) {
			Object.assign(options, newOptions);
		},
		destroy() {
			node.removeEventListener('mouseenter', handleMouseEnter);
			node.removeEventListener('mouseleave', handleMouseLeave);
		}
	};
}
