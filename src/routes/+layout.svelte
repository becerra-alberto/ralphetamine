<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import AppShell from '$lib/components/AppShell.svelte';
	import ToastContainer from '$lib/components/shared/ToastContainer.svelte';
	import CommandPalette from '$lib/components/shared/CommandPalette.svelte';
	import ShortcutsHelp from '$lib/components/shared/ShortcutsHelp.svelte';
	import { createCommandRegistry } from '$lib/stores/commands';
	import { shortcuts } from '$lib/actions/shortcuts';
	import { openModals } from '$lib/stores/modals';

	let { children } = $props();

	let paletteOpen = $state(false);
	let shortcutsHelpOpen = $state(false);

	const commands = createCommandRegistry((path: string) => goto(path));

	$effect(() => {
		if (paletteOpen) {
			openModals.open('command-palette');
		} else {
			openModals.close('command-palette');
		}
	});

	$effect(() => {
		if (shortcutsHelpOpen) {
			openModals.open('shortcuts-help');
		} else {
			openModals.close('shortcuts-help');
		}
	});

	function handleKeydown(event: KeyboardEvent) {
		const isMeta = event.metaKey || event.ctrlKey;

		// ⌘K: Toggle command palette
		if (isMeta && event.key === 'k') {
			event.preventDefault();
			paletteOpen = !paletteOpen;
			return;
		}

		// ⌘? or ⌘/: Toggle shortcuts help
		if (isMeta && (event.key === '?' || (event.shiftKey && event.key === '/'))) {
			event.preventDefault();
			shortcutsHelpOpen = !shortcutsHelpOpen;
			return;
		}
	}

	function handlePaletteClose() {
		paletteOpen = false;
	}

	function handlePaletteExecute(event: CustomEvent<{ command: { action: () => void } }>) {
		event.detail.command.action();
	}

	function handleShortcutsHelpClose() {
		shortcutsHelpOpen = false;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Stackz</title>
</svelte:head>

<div use:shortcuts>
	<AppShell>
		{@render children()}
	</AppShell>
</div>

<ToastContainer />

<CommandPalette
	open={paletteOpen}
	{commands}
	on:close={handlePaletteClose}
	on:execute={handlePaletteExecute}
/>

<ShortcutsHelp
	open={shortcutsHelpOpen}
	on:close={handleShortcutsHelpClose}
/>
