<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import AppShell from '$lib/components/AppShell.svelte';
	import ToastContainer from '$lib/components/shared/ToastContainer.svelte';
	import CommandPalette from '$lib/components/shared/CommandPalette.svelte';
	import { createCommandRegistry } from '$lib/stores/commands';

	let { children } = $props();

	let paletteOpen = $state(false);

	const commands = createCommandRegistry((path: string) => goto(path));

	function handleKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			paletteOpen = !paletteOpen;
		}
	}

	function handlePaletteClose() {
		paletteOpen = false;
	}

	function handlePaletteExecute(event: CustomEvent<{ command: { action: () => void } }>) {
		event.detail.command.action();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Stackz</title>
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>

<ToastContainer />

<CommandPalette
	open={paletteOpen}
	{commands}
	on:close={handlePaletteClose}
	on:execute={handlePaletteExecute}
/>
