<script lang="ts">
	import type { NavigationItem } from '$lib/stores/navigation';

	interface Props {
		item: NavigationItem;
		active?: boolean;
		collapsed?: boolean;
		onclick?: (route: string) => void;
	}

	let { item, active = false, collapsed = false, onclick }: Props = $props();

	function handleClick() {
		onclick?.(item.route);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}

	const iconPaths: Record<string, string> = {
		home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		budget: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
		transactions: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
		'net-worth': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
	};
</script>

<button
	type="button"
	class="nav-item group relative flex items-center w-full px-3 py-2 rounded-lg transition-all duration-200
		{active
			? 'bg-accent/10 text-accent border-l-2 border-accent'
			: 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary border-l-2 border-transparent'}"
	onclick={handleClick}
	onkeydown={handleKeydown}
	aria-current={active ? 'page' : undefined}
	title={collapsed ? item.label : undefined}
	data-testid="nav-item-{item.icon}"
>
	<svg
		class="w-5 h-5 flex-shrink-0"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			d={iconPaths[item.icon] || iconPaths.home}
		/>
	</svg>

	{#if !collapsed}
		<span class="ml-3 text-sm font-medium whitespace-nowrap">{item.label}</span>
		<span class="ml-auto text-xs text-text-secondary opacity-60">{item.shortcut}</span>
	{/if}

	<!-- Tooltip for collapsed state -->
	{#if collapsed}
		<div
			class="tooltip absolute left-full ml-2 px-2 py-1 bg-bg-secondary text-text-primary text-sm rounded shadow-lg
				opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50 whitespace-nowrap"
			role="tooltip"
		>
			{item.label}
		</div>
	{/if}
</button>
