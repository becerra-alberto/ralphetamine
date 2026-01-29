import { describe, it, expect } from 'vitest';
import { shortcutRegistry, getGroupedShortcuts, getGroupLabel, registerShortcut, type ShortcutEntry } from '../../stores/shortcuts';

describe('shortcut registry', () => {
	it('should contain all expected shortcuts', () => {
		expect(shortcutRegistry.length).toBeGreaterThanOrEqual(15);
	});

	it('should have navigation shortcuts', () => {
		const nav = shortcutRegistry.filter((s) => s.group === 'navigation');
		expect(nav.length).toBe(7);
	});

	it('should have action shortcuts', () => {
		const actions = shortcutRegistry.filter((s) => s.group === 'action');
		expect(actions.length).toBe(6);
	});

	it('should have universal shortcuts', () => {
		const universal = shortcutRegistry.filter((s) => s.group === 'universal');
		expect(universal.length).toBe(4);
	});

	it('should include Cmd+1 through Cmd+4 navigation', () => {
		const numericNav = shortcutRegistry.filter(
			(s) => s.group === 'navigation' && ['1', '2', '3', '4'].includes(s.key)
		);
		expect(numericNav.length).toBe(4);
	});

	it('should include Cmd+K for command palette', () => {
		const cmdK = shortcutRegistry.find((s) => s.id === 'cmd-palette');
		expect(cmdK).toBeDefined();
		expect(cmdK?.key).toBe('k');
		expect(cmdK?.meta).toBe(true);
	});

	it('should include Cmd+/ for shortcuts help', () => {
		const help = shortcutRegistry.find((s) => s.id === 'shortcuts-help');
		expect(help).toBeDefined();
		expect(help?.key).toBe('/');
		expect(help?.meta).toBe(true);
	});

	it('should have unique IDs for all entries', () => {
		const ids = shortcutRegistry.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('should have labels for all entries', () => {
		for (const entry of shortcutRegistry) {
			expect(entry.label).toBeTruthy();
		}
	});

	it('should have descriptions for all entries', () => {
		for (const entry of shortcutRegistry) {
			expect(entry.description).toBeTruthy();
		}
	});
});

describe('getGroupedShortcuts', () => {
	it('should return groups with navigation, action, and universal', () => {
		const groups = getGroupedShortcuts();
		expect(groups.navigation).toBeDefined();
		expect(groups.action).toBeDefined();
		expect(groups.universal).toBeDefined();
	});

	it('should contain correct number of navigation shortcuts', () => {
		const groups = getGroupedShortcuts();
		expect(groups.navigation.length).toBe(7);
	});

	it('should contain correct number of action shortcuts', () => {
		const groups = getGroupedShortcuts();
		expect(groups.action.length).toBe(6);
	});

	it('should contain correct number of universal shortcuts', () => {
		const groups = getGroupedShortcuts();
		expect(groups.universal.length).toBe(4);
	});
});

describe('registerShortcut', () => {
	it('should add a new shortcut to the registry', () => {
		const initialLength = shortcutRegistry.length;
		const newEntry: ShortcutEntry = {
			id: 'test-custom',
			key: 'x',
			meta: true,
			label: '⌘X',
			group: 'action',
			description: 'Test Custom Shortcut'
		};
		registerShortcut(newEntry);
		expect(shortcutRegistry.length).toBe(initialLength + 1);
		expect(shortcutRegistry.find((s) => s.id === 'test-custom')).toBeDefined();
		// Clean up
		const idx = shortcutRegistry.findIndex((s) => s.id === 'test-custom');
		if (idx >= 0) shortcutRegistry.splice(idx, 1);
	});

	it('should update an existing shortcut by id', () => {
		const originalLength = shortcutRegistry.length;
		const updatedEntry: ShortcutEntry = {
			id: 'cmd-palette',
			key: 'k',
			meta: true,
			label: '⌘K',
			group: 'action',
			description: 'Updated Command Palette'
		};
		registerShortcut(updatedEntry);
		expect(shortcutRegistry.length).toBe(originalLength);
		const found = shortcutRegistry.find((s) => s.id === 'cmd-palette');
		expect(found?.description).toBe('Updated Command Palette');
		// Restore
		registerShortcut({
			id: 'cmd-palette',
			key: 'k',
			meta: true,
			label: '⌘K',
			group: 'action',
			description: 'Open Command Palette'
		});
	});
});

describe('getGroupLabel', () => {
	it('should return "Navigation" for navigation group', () => {
		expect(getGroupLabel('navigation')).toBe('Navigation');
	});

	it('should return "Actions" for action group', () => {
		expect(getGroupLabel('action')).toBe('Actions');
	});

	it('should return "Universal" for universal group', () => {
		expect(getGroupLabel('universal')).toBe('Universal');
	});

	it('should return the group name for unknown groups', () => {
		expect(getGroupLabel('other')).toBe('other');
	});
});
