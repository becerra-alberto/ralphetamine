import { describe, it, expect, vi } from 'vitest';
import { createCommandRegistry } from '../../stores/commands';

describe('commands', () => {
	it('should create registry with all commands', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);

		expect(commands.length).toBe(7);
	});

	it('should include all navigation commands', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);
		const navCommands = commands.filter((c) => c.group === 'navigation');

		expect(navCommands).toHaveLength(4);
		const labels = navCommands.map((c) => c.label);
		expect(labels).toContain('Go to Home');
		expect(labels).toContain('Go to Budget');
		expect(labels).toContain('Go to Transactions');
		expect(labels).toContain('Go to Net Worth');
	});

	it('should include all action commands', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);
		const actionCommands = commands.filter((c) => c.group === 'action');

		expect(actionCommands).toHaveLength(3);
		const labels = actionCommands.map((c) => c.label);
		expect(labels).toContain('New Transaction');
		expect(labels).toContain('Search Transactions');
		expect(labels).toContain('Adjust Budgets');
	});

	it('should have shortcuts for all commands', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);

		for (const command of commands) {
			expect(command.shortcut).toBeTruthy();
		}
	});

	it('should have correct shortcut mappings', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);

		const byId = Object.fromEntries(commands.map((c) => [c.id, c]));
		expect(byId['go-home'].shortcut).toBe('⌘1');
		expect(byId['go-budget'].shortcut).toBe('⌘U');
		expect(byId['go-transactions'].shortcut).toBe('⌘T');
		expect(byId['go-net-worth'].shortcut).toBe('⌘W');
		expect(byId['new-transaction'].shortcut).toBe('⌘N');
		expect(byId['search-transactions'].shortcut).toBe('⌘F');
		expect(byId['adjust-budgets'].shortcut).toBe('⌘⇧B');
	});

	it('should execute navigate with correct path for Go to Home', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);
		const home = commands.find((c) => c.id === 'go-home')!;

		home.action();
		expect(navigate).toHaveBeenCalledWith('/');
	});

	it('should execute navigate with correct path for Go to Budget', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);
		const budget = commands.find((c) => c.id === 'go-budget')!;

		budget.action();
		expect(navigate).toHaveBeenCalledWith('/budget');
	});

	it('should execute navigate with correct path for Go to Transactions', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);
		const transactions = commands.find((c) => c.id === 'go-transactions')!;

		transactions.action();
		expect(navigate).toHaveBeenCalledWith('/transactions');
	});

	it('should execute navigate with correct path for Go to Net Worth', () => {
		const navigate = vi.fn();
		const commands = createCommandRegistry(navigate);
		const netWorth = commands.find((c) => c.id === 'go-net-worth')!;

		netWorth.action();
		expect(navigate).toHaveBeenCalledWith('/net-worth');
	});
});
