/**
 * Global shortcut registry.
 * Central registry of all keyboard shortcuts with their metadata.
 */

export interface ShortcutEntry {
	id: string;
	key: string;
	meta: boolean;
	shift?: boolean;
	label: string;
	group: 'navigation' | 'action' | 'universal';
	description: string;
}

export const shortcutRegistry: ShortcutEntry[] = [
	// Navigation
	{ id: 'nav-home', key: '1', meta: true, label: '⌘1', group: 'navigation', description: 'Go to Home' },
	{ id: 'nav-budget-num', key: '2', meta: true, label: '⌘2', group: 'navigation', description: 'Go to Budget' },
	{ id: 'nav-transactions-num', key: '3', meta: true, label: '⌘3', group: 'navigation', description: 'Go to Transactions' },
	{ id: 'nav-networth-num', key: '4', meta: true, label: '⌘4', group: 'navigation', description: 'Go to Net Worth' },
	{ id: 'nav-budget', key: 'u', meta: true, label: '⌘U', group: 'navigation', description: 'Go to Budget' },
	{ id: 'nav-transactions', key: 't', meta: true, label: '⌘T', group: 'navigation', description: 'Go to Transactions' },
	{ id: 'nav-networth', key: 'w', meta: true, label: '⌘W', group: 'navigation', description: 'Go to Net Worth' },

	// Actions
	{ id: 'cmd-palette', key: 'k', meta: true, label: '⌘K', group: 'action', description: 'Open Command Palette' },
	{ id: 'new-transaction', key: 'n', meta: true, label: '⌘N', group: 'action', description: 'New Transaction' },
	{ id: 'search', key: 'f', meta: true, label: '⌘F', group: 'action', description: 'Focus Search' },
	{ id: 'save', key: 's', meta: true, label: '⌘S', group: 'action', description: 'Save Changes' },
	{ id: 'adjust-budgets', key: 'b', meta: true, shift: true, label: '⌘⇧B', group: 'action', description: 'Budget Adjustment' },
	{ id: 'shortcuts-help', key: '/', meta: true, label: '⌘/', group: 'action', description: 'Show Keyboard Shortcuts' },

	// Universal
	{ id: 'close', key: 'Escape', meta: false, label: 'Esc', group: 'universal', description: 'Close / Cancel / Deselect' },
	{ id: 'confirm', key: 'Enter', meta: false, label: '↵', group: 'universal', description: 'Confirm / Submit' },
	{ id: 'next-field', key: 'Tab', meta: false, label: 'Tab', group: 'universal', description: 'Next Field' },
	{ id: 'prev-field', key: 'Tab', meta: false, shift: true, label: '⇧Tab', group: 'universal', description: 'Previous Field' }
];

/**
 * Register a custom shortcut at runtime.
 */
export function registerShortcut(entry: ShortcutEntry): void {
	const existing = shortcutRegistry.findIndex((s) => s.id === entry.id);
	if (existing >= 0) {
		shortcutRegistry[existing] = entry;
	} else {
		shortcutRegistry.push(entry);
	}
}

/**
 * Get shortcuts grouped by category.
 */
export function getGroupedShortcuts(): Record<string, ShortcutEntry[]> {
	const groups: Record<string, ShortcutEntry[]> = {
		navigation: [],
		action: [],
		universal: []
	};

	for (const entry of shortcutRegistry) {
		groups[entry.group].push(entry);
	}

	return groups;
}

/**
 * Get a display-friendly group label.
 */
export function getGroupLabel(group: string): string {
	switch (group) {
		case 'navigation':
			return 'Navigation';
		case 'action':
			return 'Actions';
		case 'universal':
			return 'Universal';
		default:
			return group;
	}
}
