import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import CommandPalette from '../../components/shared/CommandPalette.svelte';
import type { Command } from '../../stores/commands';

const STORAGE_KEY = 'stackz-recent-commands';

const mockCommands: Command[] = [
	{ id: 'go-home', label: 'Go to Home', shortcut: '⌘1', group: 'navigation', action: vi.fn() },
	{ id: 'go-budget', label: 'Go to Budget', shortcut: '⌘U', group: 'navigation', action: vi.fn() },
	{ id: 'go-transactions', label: 'Go to Transactions', shortcut: '⌘T', group: 'navigation', action: vi.fn() },
	{ id: 'go-net-worth', label: 'Go to Net Worth', shortcut: '⌘W', group: 'navigation', action: vi.fn() },
	{ id: 'new-transaction', label: 'New Transaction', shortcut: '⌘N', group: 'action', action: vi.fn() },
	{ id: 'search-transactions', label: 'Search Transactions', shortcut: '⌘F', group: 'action', action: vi.fn() },
	{ id: 'adjust-budgets', label: 'Adjust Budgets', shortcut: '⌘⇧B', group: 'action', action: vi.fn() }
];

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.removeItem(STORAGE_KEY);
});

describe('CommandPalette', () => {
	it('should render palette with dimmed background when open', () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		expect(screen.getByTestId('command-palette-backdrop')).toBeTruthy();
		expect(screen.getByTestId('command-palette')).toBeTruthy();
	});

	it('should not render when closed', () => {
		render(CommandPalette, { props: { open: false, commands: mockCommands } });

		expect(screen.queryByTestId('command-palette')).toBeNull();
	});

	it('should show search input with placeholder "Type a command..."', () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		const input = screen.getByTestId('command-palette-input');
		expect(input).toBeTruthy();
		expect(input.getAttribute('placeholder')).toBe('Type a command...');
	});

	it('should auto-focus search input when opened', async () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		await waitFor(() => {
			const input = screen.getByTestId('command-palette-input');
			expect(document.activeElement).toBe(input);
		});
	});

	it('should display all commands when no search query', () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		expect(screen.getByText('Go to Home')).toBeTruthy();
		expect(screen.getByText('Go to Budget')).toBeTruthy();
		expect(screen.getByText('Go to Transactions')).toBeTruthy();
		expect(screen.getByText('Go to Net Worth')).toBeTruthy();
		expect(screen.getByText('New Transaction')).toBeTruthy();
		expect(screen.getByText('Search Transactions')).toBeTruthy();
		expect(screen.getByText('Adjust Budgets')).toBeTruthy();
	});

	it('should filter commands by fuzzy search', async () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		const input = screen.getByTestId('command-palette-input');
		await fireEvent.input(input, { target: { value: 'budget' } });

		await waitFor(() => {
			expect(screen.getByText('Go to Budget')).toBeTruthy();
			expect(screen.getByText('Adjust Budgets')).toBeTruthy();
			expect(screen.queryByText('Go to Home')).toBeNull();
		});
	});

	it('should show "No matching commands" for non-matching search', async () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		const input = screen.getByTestId('command-palette-input');
		await fireEvent.input(input, { target: { value: 'xyznonexistent' } });

		await waitFor(() => {
			expect(screen.getByText('No matching commands')).toBeTruthy();
		});
	});

	it('should dispatch close event on Escape', async () => {
		const handleClose = vi.fn();
		render(CommandPalette, {
			props: { open: true, commands: mockCommands },
			events: { close: handleClose }
		} as any);

		await fireEvent.keyDown(document, { key: 'Escape' });

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should dispatch close event on backdrop click', async () => {
		const handleClose = vi.fn();
		render(CommandPalette, {
			props: { open: true, commands: mockCommands },
			events: { close: handleClose }
		} as any);

		await fireEvent.click(screen.getByTestId('command-palette-backdrop'));

		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it('should highlight first command by default', () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		const firstItem = screen.getByTestId('command-palette-list-item-go-home');
		expect(firstItem.classList.contains('highlighted')).toBe(true);
	});

	it('should move highlight down with ArrowDown', async () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		await fireEvent.keyDown(document, { key: 'ArrowDown' });

		const secondItem = screen.getByTestId('command-palette-list-item-go-budget');
		expect(secondItem.classList.contains('highlighted')).toBe(true);
	});

	it('should move highlight up with ArrowUp', async () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		// Move down twice first
		await fireEvent.keyDown(document, { key: 'ArrowDown' });
		await fireEvent.keyDown(document, { key: 'ArrowDown' });
		// Then up once
		await fireEvent.keyDown(document, { key: 'ArrowUp' });

		const secondItem = screen.getByTestId('command-palette-list-item-go-budget');
		expect(secondItem.classList.contains('highlighted')).toBe(true);
	});

	it('should dispatch execute event on Enter', async () => {
		const handleExecute = vi.fn();
		render(CommandPalette, {
			props: { open: true, commands: mockCommands },
			events: { execute: handleExecute }
		} as any);

		await fireEvent.keyDown(document, { key: 'Enter' });

		expect(handleExecute).toHaveBeenCalledTimes(1);
		expect(handleExecute.mock.calls[0][0].detail.command.id).toBe('go-home');
	});

	it('should dispatch execute event on clicking a command', async () => {
		const handleExecute = vi.fn();
		render(CommandPalette, {
			props: { open: true, commands: mockCommands },
			events: { execute: handleExecute }
		} as any);

		await fireEvent.click(screen.getByTestId('command-palette-list-item-go-budget'));

		expect(handleExecute).toHaveBeenCalledTimes(1);
		expect(handleExecute.mock.calls[0][0].detail.command.id).toBe('go-budget');
	});

	it('should show footer with keyboard hints', () => {
		render(CommandPalette, { props: { open: true, commands: mockCommands } });

		const footer = screen.getByTestId('command-palette-footer');
		expect(footer).toBeTruthy();
		expect(footer.textContent).toContain('navigate');
		expect(footer.textContent).toContain('select');
		expect(footer.textContent).toContain('close');
	});

	it('should accept custom testId', () => {
		render(CommandPalette, {
			props: { open: true, commands: mockCommands, testId: 'custom-palette' }
		});

		expect(screen.getByTestId('custom-palette')).toBeTruthy();
	});

	describe('Recent Commands', () => {
		it('should show "Recent" section header when search is empty and recent commands exist', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(['go-home', 'go-budget']));
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			expect(screen.getByTestId('command-palette-recent')).toBeTruthy();
			expect(screen.getByTestId('command-palette-recent-label').textContent).toBe('Recent');
		});

		it('should hide "Recent" section when no recent commands exist', () => {
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			expect(screen.queryByTestId('command-palette-recent')).toBeNull();
		});

		it('should display maximum 5 recent commands', () => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify([
					'go-home',
					'go-budget',
					'go-transactions',
					'go-net-worth',
					'new-transaction',
					'search-transactions'
				])
			);
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			const recentSection = screen.getByTestId('command-palette-recent');
			// Use role="option" to select only CommandItem buttons (not their children)
			const recentItems = recentSection.querySelectorAll('[role="option"]');
			expect(recentItems.length).toBeLessThanOrEqual(5);
		});

		it('should show most recently executed command first', () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(['go-budget', 'go-home']));
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			const recentSection = screen.getByTestId('command-palette-recent');
			const items = recentSection.querySelectorAll('[role="option"]');
			expect(items[0].getAttribute('data-testid')).toBe('command-palette-recent-item-go-budget');
			expect(items[1].getAttribute('data-testid')).toBe('command-palette-recent-item-go-home');
		});

		it('should hide recent section when typing in search', async () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(['go-home']));
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			expect(screen.getByTestId('command-palette-recent')).toBeTruthy();

			const input = screen.getByTestId('command-palette-input');
			await fireEvent.input(input, { target: { value: 'budget' } });

			await waitFor(() => {
				expect(screen.queryByTestId('command-palette-recent')).toBeNull();
			});
		});

		it('should re-show recent section when search is cleared', async () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(['go-home']));
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			const input = screen.getByTestId('command-palette-input');
			await fireEvent.input(input, { target: { value: 'budget' } });

			await waitFor(() => {
				expect(screen.queryByTestId('command-palette-recent')).toBeNull();
			});

			await fireEvent.input(input, { target: { value: '' } });

			await waitFor(() => {
				expect(screen.getByTestId('command-palette-recent')).toBeTruthy();
			});
		});

		it('should clear all recent commands when "Clear recent" is clicked', async () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(['go-home', 'go-budget']));
			render(CommandPalette, { props: { open: true, commands: mockCommands } });

			expect(screen.getByTestId('command-palette-recent')).toBeTruthy();

			await fireEvent.click(screen.getByTestId('command-palette-clear-recent'));

			await waitFor(() => {
				expect(screen.queryByTestId('command-palette-recent')).toBeNull();
			});
			expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
		});
	});
});
