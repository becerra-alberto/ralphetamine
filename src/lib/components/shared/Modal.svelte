<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let open: boolean = false;
	export let title: string = '';
	export let closeOnBackdrop: boolean = true;
	export let closeOnEscape: boolean = true;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let modalElement: HTMLElement | null = null;
	let previousActiveElement: HTMLElement | null = null;
	let focusableElements: HTMLElement[] = [];

	function close() {
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (closeOnBackdrop && event.target === event.currentTarget) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;

		if (event.key === 'Escape' && closeOnEscape) {
			event.preventDefault();
			event.stopPropagation();
			close();
			return;
		}

		// Focus trap with Tab
		if (event.key === 'Tab') {
			handleTabKey(event);
		}
	}

	function handleTabKey(event: KeyboardEvent) {
		if (focusableElements.length === 0) return;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (event.shiftKey) {
			// Shift + Tab
			if (document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			}
		} else {
			// Tab
			if (document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	function updateFocusableElements() {
		if (!modalElement) return;

		const selectors = [
			'button:not([disabled])',
			'input:not([disabled])',
			'select:not([disabled])',
			'textarea:not([disabled])',
			'a[href]',
			'[tabindex]:not([tabindex="-1"])'
		].join(', ');

		focusableElements = Array.from(modalElement.querySelectorAll<HTMLElement>(selectors));
	}

	// Watch for open state changes
	$: if (open && modalElement) {
		// Store currently focused element
		previousActiveElement = document.activeElement as HTMLElement;
		// Update focusable elements and focus first one
		setTimeout(() => {
			updateFocusableElements();
			if (focusableElements.length > 0) {
				focusableElements[0].focus();
			}
		}, 0);
	}

	$: if (!open && previousActiveElement) {
		// Restore focus when modal closes
		previousActiveElement.focus();
		previousActiveElement = null;
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

{#if open}
	<div
		class="modal-backdrop"
		role="presentation"
		data-testid="modal-backdrop"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 150 }}
	>
		<div
			bind:this={modalElement}
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
			data-testid="modal"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			{#if title}
				<header class="modal-header">
					<h2 id="modal-title" class="modal-title" data-testid="modal-title">{title}</h2>
					<button
						type="button"
						class="modal-close"
						aria-label="Close modal"
						data-testid="modal-close"
						on:click={close}
					>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
							<path
								d="M15 5L5 15M5 5l10 10"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</header>
			{/if}

			<div class="modal-content" data-testid="modal-content">
				<slot />
			</div>

			{#if $$slots.footer}
				<footer class="modal-footer" data-testid="modal-footer">
					<slot name="footer" />
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1200;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		padding: 16px;
	}

	.modal {
		position: relative;
		background: var(--bg-modal, #ffffff);
		border-radius: 12px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		max-width: 600px;
		width: 100%;
		max-height: calc(100vh - 32px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
		flex-shrink: 0;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
		margin: 0;
	}

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		transition:
			background 100ms ease,
			color 100ms ease;
	}

	.modal-close:hover {
		background: var(--bg-hover, #f3f4f6);
		color: var(--text-primary, #111827);
	}

	.modal-close:focus {
		outline: 2px solid var(--color-accent, #4f46e5);
		outline-offset: 2px;
	}

	.modal-content {
		flex: 1;
		padding: 20px;
		overflow-y: auto;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid var(--border-color, #e5e7eb);
		flex-shrink: 0;
	}

	/* Dark mode */
	:global(.dark) .modal-backdrop {
		background: rgba(0, 0, 0, 0.7);
	}

	:global(.dark) .modal {
		--bg-modal: #1a1a1a;
		--border-color: #2d2d2d;
		--text-primary: #f9fafb;
		--text-secondary: #9ca3af;
		--bg-hover: #2d2d2d;
	}
</style>
