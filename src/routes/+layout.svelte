<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AppShell from '$lib/components/AppShell.svelte';
	import ToastContainer from '$lib/components/shared/ToastContainer.svelte';
	import CommandPalette from '$lib/components/shared/CommandPalette.svelte';
	import ShortcutsHelp from '$lib/components/shared/ShortcutsHelp.svelte';
	import { createCommandRegistry } from '$lib/stores/commands';
	import { globalShortcuts } from '$lib/actions/shortcuts';
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

	const shortcutCallbacks = {
		onTogglePalette: () => {
			paletteOpen = !paletteOpen;
		},
		onToggleShortcutsHelp: () => {
			shortcutsHelpOpen = !shortcutsHelpOpen;
		},
		onNewTransaction: () => {
			goto('/transactions?action=new');
		},
		onSearch: () => {
			// Context-aware: route to the current view's search
			const route = $page?.url?.pathname ?? '/';
			if (route === '/transactions') {
				goto('/transactions?action=search');
			} else if (route === '/budget') {
				goto('/budget?action=search');
			} else {
				// Default: open command palette as search fallback
				paletteOpen = true;
			}
		},
		onSave: () => {
			// Save is a no-op placeholder; individual views handle save
		},
		onAdjustBudgets: () => {
			goto('/budget?action=adjust');
		}
	};

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

<svelte:head>
	<title>Stackz</title>
</svelte:head>

<div use:globalShortcuts={shortcutCallbacks}>
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
