<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { navigationItems, currentRoute, isCollapsed } from '$lib/stores/navigation';
	import NavItem from './NavItem.svelte';

	interface Props {
		collapsed?: boolean;
	}

	let { collapsed = false }: Props = $props();

	// Sync collapsed prop with store
	$effect(() => {
		isCollapsed.set(collapsed);
	});

	// Update current route based on page store
	$effect(() => {
		currentRoute.updateFromPath($page.url.pathname);
	});

	function handleNavClick(route: string) {
		goto(route);
	}

	function handleLogoClick() {
		goto('/');
	}
</script>

<aside
	class="sidebar flex flex-col h-full bg-bg-secondary border-r border-neutral/20 transition-all duration-300"
	class:collapsed
	style="width: {collapsed ? '64px' : '200px'};"
	data-testid="sidebar"
>
	<!-- Logo -->
	<button
		type="button"
		class="logo-button flex items-center justify-center p-4 hover:bg-bg-primary/50 transition-colors"
		onclick={handleLogoClick}
		aria-label="Go to Home"
		data-testid="logo-button"
	>
		<svg
			class="w-8 h-8 text-accent"
			viewBox="0 0 32 32"
			fill="currentColor"
			aria-hidden="true"
		>
			<rect x="4" y="20" width="8" height="8" rx="1" />
			<rect x="12" y="12" width="8" height="16" rx="1" />
			<rect x="20" y="4" width="8" height="24" rx="1" />
		</svg>
		{#if !collapsed}
			<span class="ml-2 text-lg font-bold text-text-primary">Stackz</span>
		{/if}
	</button>

	<!-- Navigation Items -->
	<nav class="flex-1 px-2 py-4 space-y-1" aria-label="Main navigation">
		{#each navigationItems as item (item.route)}
			<NavItem
				{item}
				active={$currentRoute === item.route}
				{collapsed}
				onclick={handleNavClick}
			/>
		{/each}
	</nav>
</aside>

<style>
	.sidebar.collapsed {
		width: 64px;
	}
</style>
