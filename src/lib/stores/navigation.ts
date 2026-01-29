import { writable, derived } from 'svelte/store';

export type NavRoute = '/' | '/budget' | '/transactions' | '/net-worth';

export interface NavigationItem {
	route: NavRoute;
	label: string;
	icon: string;
	shortcut: string;
}

export const navigationItems: NavigationItem[] = [
	{ route: '/', label: 'Home', icon: 'home', shortcut: '⌘1' },
	{ route: '/budget', label: 'Budget', icon: 'budget', shortcut: '⌘2' },
	{ route: '/transactions', label: 'Transactions', icon: 'transactions', shortcut: '⌘3' },
	{ route: '/net-worth', label: 'Net Worth', icon: 'net-worth', shortcut: '⌘4' }
];

function createNavigationStore() {
	const { subscribe, set, update } = writable<NavRoute>('/');

	return {
		subscribe,
		set,
		setRoute: (route: NavRoute) => set(route),
		updateFromPath: (path: string) => {
			const normalizedPath = path === '' ? '/' : path as NavRoute;
			if (navigationItems.some(item => item.route === normalizedPath)) {
				set(normalizedPath);
			}
		}
	};
}

export const currentRoute = createNavigationStore();

export const isCollapsed = writable<boolean>(false);

export const activeNavItem = derived(currentRoute, ($currentRoute) => {
	return navigationItems.find(item => item.route === $currentRoute) ?? navigationItems[0];
});
