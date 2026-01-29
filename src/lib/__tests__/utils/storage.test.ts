import { describe, it, expect, beforeEach } from 'vitest';
import { getRecentCommandIds, addRecentCommandId, clearRecentCommandIds } from '../../utils/storage';

beforeEach(() => {
	localStorage.clear();
});

describe('storage - recent commands', () => {
	it('should return empty array when no recent commands stored', () => {
		expect(getRecentCommandIds()).toEqual([]);
	});

	it('should add a command ID to recent history', () => {
		const result = addRecentCommandId('go-budget');
		expect(result).toEqual(['go-budget']);
		expect(getRecentCommandIds()).toEqual(['go-budget']);
	});

	it('should add most recent command to the top', () => {
		addRecentCommandId('go-budget');
		addRecentCommandId('go-transactions');
		expect(getRecentCommandIds()).toEqual(['go-transactions', 'go-budget']);
	});

	it('should move duplicate command to top without duplicating', () => {
		addRecentCommandId('go-budget');
		addRecentCommandId('go-transactions');
		addRecentCommandId('go-budget');
		expect(getRecentCommandIds()).toEqual(['go-budget', 'go-transactions']);
	});

	it('should limit to 5 recent commands', () => {
		addRecentCommandId('cmd-1');
		addRecentCommandId('cmd-2');
		addRecentCommandId('cmd-3');
		addRecentCommandId('cmd-4');
		addRecentCommandId('cmd-5');
		addRecentCommandId('cmd-6');
		const result = getRecentCommandIds();
		expect(result).toHaveLength(5);
		expect(result[0]).toBe('cmd-6');
		expect(result).not.toContain('cmd-1');
	});

	it('should clear recent command history', () => {
		addRecentCommandId('go-budget');
		addRecentCommandId('go-transactions');
		clearRecentCommandIds();
		expect(getRecentCommandIds()).toEqual([]);
	});

	it('should handle corrupted localStorage gracefully', () => {
		localStorage.setItem('stackz-recent-commands', 'invalid-json');
		expect(getRecentCommandIds()).toEqual([]);
	});

	it('should handle non-array localStorage value', () => {
		localStorage.setItem('stackz-recent-commands', JSON.stringify('not-an-array'));
		expect(getRecentCommandIds()).toEqual([]);
	});

	it('should persist across getRecentCommandIds calls', () => {
		addRecentCommandId('go-budget');
		const first = getRecentCommandIds();
		const second = getRecentCommandIds();
		expect(first).toEqual(second);
		expect(first).toEqual(['go-budget']);
	});
});
