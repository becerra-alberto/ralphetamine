import { goto } from '$app/navigation';
import type { NavRoute } from '$lib/stores/navigation';

export interface ShortcutConfig {
	key: string;
	meta: boolean;
	route: NavRoute;
}

const defaultShortcuts: ShortcutConfig[] = [
	{ key: '1', meta: true, route: '/' },
	{ key: '2', meta: true, route: '/budget' },
	{ key: '3', meta: true, route: '/transactions' },
	{ key: '4', meta: true, route: '/net-worth' }
];

export function shortcuts(node: HTMLElement, customShortcuts?: ShortcutConfig[]) {
	const shortcuts = customShortcuts ?? defaultShortcuts;

	function handleKeydown(event: KeyboardEvent) {
		const isMeta = event.metaKey || event.ctrlKey;

		for (const shortcut of shortcuts) {
			if (shortcut.meta && isMeta && event.key === shortcut.key) {
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
