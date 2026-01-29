/**
 * localStorage helpers for persisting recent commands.
 */

const RECENT_COMMANDS_KEY = 'stackz-recent-commands';
const MAX_RECENT = 5;

/**
 * Get recent command IDs from localStorage.
 */
export function getRecentCommandIds(): string[] {
	try {
		const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
		if (!stored) return [];
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
	} catch {
		return [];
	}
}

/**
 * Add a command ID to recent history.
 * Moves to top if already present, trims to MAX_RECENT.
 */
export function addRecentCommandId(commandId: string): string[] {
	const recent = getRecentCommandIds().filter((id) => id !== commandId);
	recent.unshift(commandId);
	const trimmed = recent.slice(0, MAX_RECENT);
	try {
		localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(trimmed));
	} catch {
		// localStorage may be unavailable
	}
	return trimmed;
}

/**
 * Clear all recent command history.
 */
export function clearRecentCommandIds(): void {
	try {
		localStorage.removeItem(RECENT_COMMANDS_KEY);
	} catch {
		// localStorage may be unavailable
	}
}
