import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CommandList from '../../components/shared/CommandList.svelte';
import type { Command } from '../../stores/commands';

const mockCommands: Command[] = [
	{ id: 'go-home', label: 'Go to Home', shortcut: '⌘1', group: 'navigation', action: vi.fn() },
	{ id: 'go-budget', label: 'Go to Budget', shortcut: '⌘U', group: 'navigation', action: vi.fn() },
	{ id: 'go-transactions', label: 'Go to Transactions', shortcut: '⌘T', group: 'navigation', action: vi.fn() },
	{ id: 'go-net-worth', label: 'Go to Net Worth', shortcut: '⌘W', group: 'navigation', action: vi.fn() },
	{ id: 'new-transaction', label: 'New Transaction', shortcut: '⌘N', group: 'action', action: vi.fn() },
	{ id: 'search-transactions', label: 'Search Transactions', shortcut: '⌘F', group: 'action', action: vi.fn() },
	{ id: 'adjust-budgets', label: 'Adjust Budgets', shortcut: '⌘⇧B', group: 'action', action: vi.fn() }
];

describe('CommandList', () => {
	it('should render command list container', () => {
		render(CommandList, { props: { commands: mockCommands } });

		expect(screen.getByTestId('command-list')).toBeTruthy();
	});

	it('should render all navigation commands', () => {
		render(CommandList, { props: { commands: mockCommands } });

		expect(screen.getByText('Go to Home')).toBeTruthy();
		expect(screen.getByText('Go to Budget')).toBeTruthy();
		expect(screen.getByText('Go to Transactions')).toBeTruthy();
		expect(screen.getByText('Go to Net Worth')).toBeTruthy();
	});

	it('should render all action commands', () => {
		render(CommandList, { props: { commands: mockCommands } });

		expect(screen.getByText('New Transaction')).toBeTruthy();
		expect(screen.getByText('Search Transactions')).toBeTruthy();
		expect(screen.getByText('Adjust Budgets')).toBeTruthy();
	});

	it('should display group labels', () => {
		render(CommandList, { props: { commands: mockCommands } });

		expect(screen.getByTestId('command-list-navigation-label')).toBeTruthy();
		expect(screen.getByText('Navigation')).toBeTruthy();
		expect(screen.getByTestId('command-list-actions-label')).toBeTruthy();
		expect(screen.getByText('Actions')).toBeTruthy();
	});

	it('should show keyboard shortcut hints for all commands', () => {
		render(CommandList, { props: { commands: mockCommands } });

		expect(screen.getByText('⌘1')).toBeTruthy();
		expect(screen.getByText('⌘U')).toBeTruthy();
		expect(screen.getByText('⌘T')).toBeTruthy();
		expect(screen.getByText('⌘W')).toBeTruthy();
		expect(screen.getByText('⌘N')).toBeTruthy();
		expect(screen.getByText('⌘F')).toBeTruthy();
		expect(screen.getByText('⌘⇧B')).toBeTruthy();
	});

	it('should show "No matching commands" when empty', () => {
		render(CommandList, { props: { commands: [] } });

		expect(screen.getByTestId('command-list-empty')).toBeTruthy();
		expect(screen.getByText('No matching commands')).toBeTruthy();
	});

	it('should highlight first command by default', () => {
		render(CommandList, { props: { commands: mockCommands, highlightedIndex: 0 } });

		const firstItem = screen.getByTestId('command-list-item-go-home');
		expect(firstItem.classList.contains('highlighted')).toBe(true);
	});

	it('should have role="listbox" for accessibility', () => {
		render(CommandList, { props: { commands: mockCommands } });

		const list = screen.getByTestId('command-list');
		expect(list.getAttribute('role')).toBe('listbox');
	});

	it('should accept custom testId', () => {
		render(CommandList, { props: { commands: mockCommands, testId: 'custom-list' } });

		expect(screen.getByTestId('custom-list')).toBeTruthy();
	});
});
