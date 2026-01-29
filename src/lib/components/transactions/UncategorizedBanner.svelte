<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let count: number = 0;

	const dispatch = createEventDispatcher<{
		categorize: void;
		dismiss: void;
	}>();

	// Session storage key for dismiss state
	const DISMISS_KEY = 'stackz-uncategorized-banner-dismissed';
	const DISMISS_COUNT_KEY = 'stackz-uncategorized-banner-dismissed-count';

	// Track dismiss state: -1 = not dismissed, >= 0 = dismissed at that count
	let dismissedAtCount: number = -1;

	// Initialize from session storage
	function initDismissState() {
		try {
			const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true';
			if (wasDismissed) {
				dismissedAtCount = parseInt(sessionStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
			}
		} catch {
			// Session storage not available
		}
	}

	initDismissState();

	// Re-show banner if count has increased since dismissal
	$: isDismissed = dismissedAtCount >= 0 && count <= dismissedAtCount;
	$: visible = count > 0 && !isDismissed;
	$: label = count === 1
		? 'You have 1 uncategorized transaction'
		: `You have ${count} uncategorized transactions`;

	function handleCategorize() {
		dispatch('categorize');
	}

	function handleDismiss() {
		dismissedAtCount = count;
		try {
			sessionStorage.setItem(DISMISS_KEY, 'true');
			sessionStorage.setItem(DISMISS_COUNT_KEY, String(count));
		} catch {
			// Session storage not available
		}
		dispatch('dismiss');
	}
</script>

{#if visible}
	<div
		class="uncategorized-banner"
		role="alert"
		data-testid="uncategorized-banner"
	>
		<div class="banner-content">
			<svg
				class="warning-icon"
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				data-testid="warning-icon"
			>
				<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
			<span class="banner-text" data-testid="banner-text">{label}</span>
		</div>
		<div class="banner-actions">
			<button
				type="button"
				class="categorize-btn"
				on:click={handleCategorize}
				data-testid="categorize-now-btn"
			>
				Categorize now
			</button>
			<button
				type="button"
				class="dismiss-btn"
				on:click={handleDismiss}
				aria-label="Dismiss warning"
				data-testid="dismiss-btn"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	</div>
{/if}

<style>
	.uncategorized-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid var(--color-warning, #f59e0b);
		border-radius: 8px;
		color: var(--color-warning-text, #92400e);
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.warning-icon {
		color: var(--color-warning, #f59e0b);
		flex-shrink: 0;
	}

	.banner-text {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.categorize-btn {
		padding: 6px 14px;
		background: var(--color-warning, #f59e0b);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8125rem;
		font-weight: 600;
		transition: opacity 0.15s ease;
	}

	.categorize-btn:hover {
		opacity: 0.9;
	}

	.categorize-btn:focus-visible {
		outline: 2px solid var(--color-warning, #f59e0b);
		outline-offset: 2px;
	}

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--color-warning-text, #92400e);
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s ease;
	}

	.dismiss-btn:hover {
		opacity: 1;
	}

	.dismiss-btn:focus-visible {
		outline: 2px solid var(--color-warning, #f59e0b);
		outline-offset: 2px;
	}

	/* Dark mode */
	:global(.dark) .uncategorized-banner {
		background: rgba(245, 158, 11, 0.08);
		color: var(--color-warning-dark-text, #fbbf24);
	}

	:global(.dark) .dismiss-btn {
		color: var(--color-warning-dark-text, #fbbf24);
	}
</style>
