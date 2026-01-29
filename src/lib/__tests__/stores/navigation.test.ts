import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	currentRoute,
	isCollapsed,
	activeNavItem,
	navigationItems,
	type NavRoute
} from '../../stores/navigation';

describe('Navigation Store', () => {
	beforeEach(() => {
		// Reset store to initial state
		currentRoute.set('/');
		isCollapsed.set(false);
	});

	describe('navigationItems', () => {
		it('should contain 4 navigation items', () => {
			expect(navigationItems).toHaveLength(4);
		});

		it('should have Home, Budget, Transactions, Net Worth items', () => {
			const labels = navigationItems.map((item) => item.label);
			expect(labels).toContain('Home');
			expect(labels).toContain('Budget');
			expect(labels).toContain('Transactions');
			expect(labels).toContain('Net Worth');
		});

		it('should have correct routes', () => {
			const routes = navigationItems.map((item) => item.route);
			expect(routes).toContain('/');
			expect(routes).toContain('/budget');
			expect(routes).toContain('/transactions');
			expect(routes).toContain('/net-worth');
		});

		it('should have keyboard shortcuts', () => {
			const shortcuts = navigationItems.map((item) => item.shortcut);
			expect(shortcuts).toContain('⌘1');
			expect(shortcuts).toContain('⌘2');
			expect(shortcuts).toContain('⌘3');
			expect(shortcuts).toContain('⌘4');
		});
	});

	describe('currentRoute store', () => {
		it('should start with "/" as default route', () => {
			expect(get(currentRoute)).toBe('/');
		});

		it('should track current route', () => {
			currentRoute.setRoute('/budget');
			expect(get(currentRoute)).toBe('/budget');
		});

		it('should update when route changes', () => {
			currentRoute.setRoute('/transactions');
			expect(get(currentRoute)).toBe('/transactions');

			currentRoute.setRoute('/net-worth');
			expect(get(currentRoute)).toBe('/net-worth');
		});

		it('should update from path string', () => {
			currentRoute.updateFromPath('/budget');
			expect(get(currentRoute)).toBe('/budget');
		});

		it('should handle empty path as home', () => {
			currentRoute.updateFromPath('');
			expect(get(currentRoute)).toBe('/');
		});

		it('should not update for invalid paths', () => {
			currentRoute.set('/budget');
			currentRoute.updateFromPath('/invalid-route');
			expect(get(currentRoute)).toBe('/budget');
		});
	});

	describe('isCollapsed store', () => {
		it('should start as false', () => {
			expect(get(isCollapsed)).toBe(false);
		});

		it('should toggle collapse state', () => {
			isCollapsed.set(true);
			expect(get(isCollapsed)).toBe(true);

			isCollapsed.set(false);
			expect(get(isCollapsed)).toBe(false);
		});
	});

	describe('activeNavItem derived store', () => {
		it('should return Home item when route is "/"', () => {
			currentRoute.set('/');
			const active = get(activeNavItem);
			expect(active.label).toBe('Home');
			expect(active.route).toBe('/');
		});

		it('should return Budget item when route is "/budget"', () => {
			currentRoute.set('/budget');
			const active = get(activeNavItem);
			expect(active.label).toBe('Budget');
			expect(active.route).toBe('/budget');
		});

		it('should return Transactions item when route is "/transactions"', () => {
			currentRoute.set('/transactions');
			const active = get(activeNavItem);
			expect(active.label).toBe('Transactions');
			expect(active.route).toBe('/transactions');
		});

		it('should return Net Worth item when route is "/net-worth"', () => {
			currentRoute.set('/net-worth');
			const active = get(activeNavItem);
			expect(active.label).toBe('Net Worth');
			expect(active.route).toBe('/net-worth');
		});
	});
});
