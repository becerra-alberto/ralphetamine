<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	export let message: string = '';
	export let type: 'success' | 'error' | 'warning' | 'info' = 'info';
	export let duration: number = 3000;
	export let visible: boolean = true;

	const dispatch = createEventDispatcher<{
		dismiss: void;
	}>();

	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	function dismiss() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		dispatch('dismiss');
	}

	onMount(() => {
		if (duration > 0) {
			timeoutId = setTimeout(dismiss, duration);
		}
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});

	const icons: Record<string, string> = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	};
</script>

{#if visible}
	<div
		class="toast toast-{type}"
		role="alert"
		aria-live="polite"
		data-testid="toast"
		data-type={type}
		in:fly={{ y: 50, duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<span class="toast-icon" data-testid="toast-icon">{icons[type]}</span>
		<span class="toast-message" data-testid="toast-message">{message}</span>
		<button
			class="toast-dismiss"
			aria-label="Dismiss notification"
			data-testid="toast-dismiss"
			on:click={dismiss}
		>
			×
		</button>
	</div>
{/if}

<style>
	.toast {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 0.875rem;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		max-width: 400px;
	}

	.toast-success {
		background: var(--color-success-bg, #d1fae5);
		color: var(--color-success-text, #065f46);
		border: 1px solid var(--color-success, #10b981);
	}

	.toast-error {
		background: var(--color-danger-bg, #fee2e2);
		color: var(--color-danger-text, #991b1b);
		border: 1px solid var(--color-danger, #ef4444);
	}

	.toast-warning {
		background: var(--color-warning-bg, #fef3c7);
		color: var(--color-warning-text, #92400e);
		border: 1px solid var(--color-warning, #f59e0b);
	}

	.toast-info {
		background: var(--color-info-bg, #dbeafe);
		color: var(--color-info-text, #1e40af);
		border: 1px solid var(--color-info, #3b82f6);
	}

	.toast-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.toast-message {
		flex: 1;
	}

	.toast-dismiss {
		background: none;
		border: none;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0.6;
		padding: 0;
		color: inherit;
		transition: opacity 100ms ease;
	}

	.toast-dismiss:hover {
		opacity: 1;
	}

	/* Dark mode */
	:global(.dark) .toast-success {
		--color-success-bg: rgba(16, 185, 129, 0.2);
		--color-success-text: #6ee7b7;
	}

	:global(.dark) .toast-error {
		--color-danger-bg: rgba(239, 68, 68, 0.2);
		--color-danger-text: #fca5a5;
	}

	:global(.dark) .toast-warning {
		--color-warning-bg: rgba(245, 158, 11, 0.2);
		--color-warning-text: #fcd34d;
	}

	:global(.dark) .toast-info {
		--color-info-bg: rgba(59, 130, 246, 0.2);
		--color-info-text: #93c5fd;
	}
</style>
