<script lang="ts">
	import { browser } from '$app/environment';
	import Sidebar from './Sidebar.svelte';
	import { shortcuts } from '$lib/actions/shortcuts';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	let windowWidth = $state(browser ? window.innerWidth : 1024);
	let sidebarCollapsed = $derived(windowWidth < 800);

	function handleResize() {
		windowWidth = window.innerWidth;
	}
</script>

<svelte:window onresize={handleResize} />

<div
	class="app-shell flex h-screen overflow-hidden bg-bg-primary"
	use:shortcuts
	data-testid="app-shell"
>
	<Sidebar collapsed={sidebarCollapsed} />

	<main
		class="main-content flex-1 overflow-auto"
		data-testid="main-content"
	>
		{@render children()}
	</main>
</div>
