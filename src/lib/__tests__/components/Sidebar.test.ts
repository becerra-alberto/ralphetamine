/// <reference types="node" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { writable, get, type Writable } from 'svelte/store';

// Declare require for CommonJS compatibility in vi.hoisted
declare const require: NodeJS.Require;

// Create hoisted mock stores so they're available during vi.mock hoisting
const { mockPageStore, mockCurrentRoute, mockIsCollapsed } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const svelteStore = require('svelte/store') as typeof import('svelte/store');
	const routeStore = svelteStore.writable<string>('/');
	return {
		mockPageStore: svelteStore.writable<{ url: { pathname: string } }>({ url: { pathname: '/' } }),
		mockCurrentRoute: {
			subscribe: routeStore.subscribe,
			set: routeStore.set,
			setRoute: (route: string) => routeStore.set(route),
			updateFromPath: (path: string) => {
				const validRoutes = ['/', '/budget', '/transactions', '/net-worth'];
				const normalizedPath = path === '' ? '/' : path;
				if (validRoutes.includes(normalizedPath)) {
					routeStore.set(normalizedPath);
				}
			}
		},
		mockIsCollapsed: svelteStore.writable<boolean>(false)
	};
});

vi.mock('$lib/stores/navigation', () => ({
	navigationItems: [
		{ route: '/', label: 'Home', icon: 'home', shortcut: '⌘1' },
		{ route: '/budget', label: 'Budget', icon: 'budget', shortcut: '⌘2' },
		{ route: '/transactions', label: 'Transactions', icon: 'transactions', shortcut: '⌘3' },
		{ route: '/net-worth', label: 'Net Worth', icon: 'net-worth', shortcut: '⌘4' }
	],
	currentRoute: mockCurrentRoute,
	isCollapsed: mockIsCollapsed
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: mockPageStore
}));

import Sidebar from '../../components/Sidebar.svelte';

describe('Sidebar Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCurrentRoute.set('/');
		mockIsCollapsed.set(false);
		mockPageStore.set({ url: { pathname: '/' } });
	});

	describe('rendering', () => {
		it('should render 4 navigation items (Home, Budget, Transactions, Net Worth)', () => {
			const { getAllByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			expect(getAllByTestId(/^nav-item-/)).toHaveLength(4);
		});

		it('should render Stackz logo at top', () => {
			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			expect(getByTestId('logo-button')).toBeTruthy();
		});

		it('should render logo SVG', () => {
			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			const logoButton = getByTestId('logo-button');
			const svg = logoButton.querySelector('svg');
			expect(svg).toBeTruthy();
		});

		it('should render Stackz text when not collapsed', () => {
			const { getByText } = render(Sidebar, {
				props: { collapsed: false }
			});

			expect(getByText('Stackz')).toBeTruthy();
		});

		it('should hide Stackz text when collapsed', () => {
			const { queryByText } = render(Sidebar, {
				props: { collapsed: true }
			});

			expect(queryByText('Stackz')).toBeFalsy();
		});
	});

	describe('sidebar width', () => {
		it('should have width of 200px when expanded', () => {
			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			const sidebar = getByTestId('sidebar');
			expect(sidebar.style.width).toBe('200px');
		});

		it('should have width of 64px when collapsed', () => {
			const { getByTestId } = render(Sidebar, {
				props: { collapsed: true }
			});

			const sidebar = getByTestId('sidebar');
			expect(sidebar.style.width).toBe('64px');
		});
	});

	describe('active state', () => {
		it('should highlight active nav item with accent background', async () => {
			// Set the page pathname first, then currentRoute updates via effect
			mockPageStore.set({ url: { pathname: '/budget' } });
			mockCurrentRoute.set('/budget');

			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			// Wait for effect to run
			await new Promise((resolve) => setTimeout(resolve, 10));

			const budgetItem = getByTestId('nav-item-budget');
			expect(budgetItem.className).toContain('bg-accent/10');
		});

		it('should show left border indicator on active item', async () => {
			mockPageStore.set({ url: { pathname: '/transactions' } });
			mockCurrentRoute.set('/transactions');

			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			const transactionsItem = getByTestId('nav-item-transactions');
			expect(transactionsItem.className).toContain('border-accent');
		});
	});

	describe('navigation', () => {
		it('should have navigation landmark', () => {
			const { container } = render(Sidebar, {
				props: { collapsed: false }
			});

			const nav = container.querySelector('nav[aria-label="Main navigation"]');
			expect(nav).toBeTruthy();
		});

		it('should have all navigation items in nav element', () => {
			const { container } = render(Sidebar, {
				props: { collapsed: false }
			});

			const nav = container.querySelector('nav');
			const navItems = nav?.querySelectorAll('[data-testid^="nav-item-"]');
			expect(navItems?.length).toBe(4);
		});
	});

	describe('accessibility', () => {
		it('should have aria-label on logo button', () => {
			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			const logoButton = getByTestId('logo-button');
			expect(logoButton.getAttribute('aria-label')).toBe('Go to Home');
		});

		it('should have button type for logo', () => {
			const { getByTestId } = render(Sidebar, {
				props: { collapsed: false }
			});

			const logoButton = getByTestId('logo-button');
			expect(logoButton.getAttribute('type')).toBe('button');
		});
	});
});
