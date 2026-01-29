import { goto } from '$app/navigation';
import type { NavRoute } from '$lib/stores/navigation';
import { get } from 'svelte/store';
import { isModalOpen } from '$lib/stores/modals';

export interface ShortcutConfig {
	key: string;
	meta: boolean;
	shift?: boolean;
	route: NavRoute;
}

export interface GlobalShortcutCallbacks {
	onTogglePalette?: () => void;
	onToggleShortcutsHelp?: () => void;
	onNewTransaction?: () => void;
	onSearch?: () => void;
	onSave?: () => void;
	onAdjustBudgets?: () => void;
}

const defaultShortcuts: ShortcutConfig[] = [
	{ key: '1', meta: true, route: '/' },
	{ key: '2', meta: true, route: '/budget' },
	{ key: '3', meta: true, route: '/transactions' },
	{ key: '4', meta: true, route: '/net-worth' },
	{ key: 'u', meta: true, route: '/budget' },
	{ key: 't', meta: true, route: '/transactions' },
	{ key: 'w', meta: true, route: '/net-worth' }
];

/** OS shortcuts that should never be captured */
const OS_RESERVED_KEYS = ['q', 'h'];

export function shortcuts(node: HTMLElement, customShortcuts?: ShortcutConfig[]) {
	const shortcuts = customShortcuts ?? defaultShortcuts;

	function handleKeydown(event: KeyboardEvent) {
		const isMeta = event.metaKey || event.ctrlKey;

		// Never capture OS-reserved shortcuts
		if (isMeta && OS_RESERVED_KEYS.includes(event.key.toLowerCase())) {
			return;
		}

		// Block navigation shortcuts when a modal is open
		if (get(isModalOpen)) {
			return;
		}

		for (const shortcut of shortcuts) {
			if (shortcut.meta && isMeta && event.key.toLowerCase() === shortcut.key.toLowerCase()) {
				if (shortcut.shift && !event.shiftKey) continue;
				if (!shortcut.shift && event.shiftKey) continue;
				event.preventDefault();
				goto(shortcut.route);
				return;
			}
		}
	}

	window.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			window.removeEventListener('keydown', handleKeydown);
		},
		update(newShortcuts: ShortcutConfig[]) {
			shortcuts.length = 0;
			shortcuts.push(...(newShortcuts ?? defaultShortcuts));
		}
	};
}

/**
 * Global shortcut handler for action shortcuts (Cmd+K, Cmd+N, Cmd+F, Cmd+S, Cmd+Shift+B, Cmd+?//).
 * Handles modal-awareness and context-aware search.
 */
export function globalShortcuts(node: HTMLElement, callbacks: GlobalShortcutCallbacks) {
	let currentCallbacks = callbacks;

	function handleKeydown(event: KeyboardEvent) {
		const isMeta = event.metaKey || event.ctrlKey;

		// Never capture OS-reserved shortcuts
		if (isMeta && OS_RESERVED_KEYS.includes(event.key.toLowerCase())) {
			return;
		}

		// Cmd+K: Toggle command palette (always works, even in modals)
		if (isMeta && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			currentCallbacks.onTogglePalette?.();
			return;
		}

		// Cmd+? or Cmd+/: Toggle shortcuts help (always works, even in modals)
		if (isMeta && (event.key === '?' || event.key === '/')) {
			event.preventDefault();
			currentCallbacks.onToggleShortcutsHelp?.();
			return;
		}

		// Block remaining action shortcuts when a modal is open
		if (get(isModalOpen)) {
			return;
		}

		// Cmd+N: New transaction
		if (isMeta && event.key.toLowerCase() === 'n' && !event.shiftKey) {
			event.preventDefault();
			currentCallbacks.onNewTransaction?.();
			return;
		}

		// Cmd+F: Context-aware search
		if (isMeta && event.key.toLowerCase() === 'f' && !event.shiftKey) {
			event.preventDefault();
			currentCallbacks.onSearch?.();
			return;
		}

		// Cmd+S: Save (if pending changes)
		if (isMeta && event.key.toLowerCase() === 's' && !event.shiftKey) {
			event.preventDefault();
			currentCallbacks.onSave?.();
			return;
		}

		// Cmd+Shift+B: Open budget adjustment modal
		if (isMeta && event.key.toLowerCase() === 'b' && event.shiftKey) {
			event.preventDefault();
			currentCallbacks.onAdjustBudgets?.();
			return;
		}
	}

	window.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			window.removeEventListener('keydown', handleKeydown);
		},
		update(newCallbacks: GlobalShortcutCallbacks) {
			currentCallbacks = newCallbacks;
		}
	};
}
