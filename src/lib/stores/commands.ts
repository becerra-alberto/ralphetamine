/**
 * Command registry for the command palette.
 * Defines all available commands with their labels, shortcuts, and actions.
 */

export interface Command {
	id: string;
	label: string;
	shortcut?: string;
	group: 'navigation' | 'action';
	action: () => void;
}

export function createCommandRegistry(navigate: (path: string) => void): Command[] {
	return [
		{ id: 'go-home', label: 'Go to Home', shortcut: '⌘1', group: 'navigation', action: () => navigate('/') },
		{ id: 'go-budget', label: 'Go to Budget', shortcut: '⌘U', group: 'navigation', action: () => navigate('/budget') },
		{ id: 'go-transactions', label: 'Go to Transactions', shortcut: '⌘T', group: 'navigation', action: () => navigate('/transactions') },
		{ id: 'go-net-worth', label: 'Go to Net Worth', shortcut: '⌘W', group: 'navigation', action: () => navigate('/net-worth') },
		{ id: 'new-transaction', label: 'New Transaction', shortcut: '⌘N', group: 'action', action: () => navigate('/transactions?action=new') },
		{ id: 'search-transactions', label: 'Search Transactions', shortcut: '⌘F', group: 'action', action: () => navigate('/transactions?action=search') },
		{ id: 'adjust-budgets', label: 'Adjust Budgets', shortcut: '⌘⇧B', group: 'action', action: () => navigate('/budget?action=adjust') }
	];
}
