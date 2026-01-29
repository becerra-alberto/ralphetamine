<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Modal from './Modal.svelte';

	export let open = false;
	export let title = 'Are you sure?';
	export let message = '';
	export let confirmLabel = 'Confirm';
	export let cancelLabel = 'Cancel';
	export let confirmVariant: 'danger' | 'primary' = 'primary';
	export let testId = 'confirm-dialog';

	const dispatch = createEventDispatcher<{
		confirm: void;
		cancel: void;
	}>();

	function handleConfirm() {
		dispatch('confirm');
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

<Modal {open} {title} on:close={handleCancel}>
	<div class="confirm-body" data-testid="{testId}-body">
		<p class="confirm-message" data-testid="{testId}-message">{message}</p>
	</div>

	<svelte:fragment slot="footer">
		<button
			class="btn-cancel"
			on:click={handleCancel}
			data-testid="{testId}-cancel"
		>
			{cancelLabel}
		</button>
		<button
			class="btn-confirm"
			class:danger={confirmVariant === 'danger'}
			on:click={handleConfirm}
			data-testid="{testId}-confirm"
		>
			{confirmLabel}
		</button>
	</svelte:fragment>
</Modal>

<style>
	.confirm-message {
		font-size: 0.9375rem;
		color: var(--text-secondary, #6b7280);
		line-height: 1.5;
		margin: 0;
	}

	.btn-cancel {
		padding: 8px 20px;
		background: none;
		border: 2px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel:hover {
		border-color: var(--text-secondary, #6b7280);
	}

	.btn-confirm {
		padding: 8px 20px;
		background: var(--accent, #4f46e5);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-confirm:hover {
		background: var(--accent-hover, #4338ca);
	}

	.btn-confirm.danger {
		background: var(--danger, #ef4444);
	}

	.btn-confirm.danger:hover {
		background: #dc2626;
	}

	:global(.dark) .btn-cancel {
		border-color: #2d2d2d;
		color: #9ca3af;
	}
</style>
