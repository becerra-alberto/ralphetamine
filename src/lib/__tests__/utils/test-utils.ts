import { render } from '@testing-library/svelte';

/**
 * Custom render function that wraps @testing-library/svelte render
 * with common options and utilities.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function customRender(Component: any, options: Parameters<typeof render>[1] = {}) {
	return render(Component, {
		...options,
	});
}

/**
 * Wait for a specific condition to be true.
 * Useful for waiting for async updates in Svelte components.
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 1000,
	interval = 50
): Promise<void> {
	const startTime = Date.now();

	while (!condition()) {
		if (Date.now() - startTime > timeout) {
			throw new Error('waitFor timed out after ' + timeout + 'ms');
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

/**
 * Create a mock Tauri invoke function for testing.
 */
export function createMockInvoke(responses: Record<string, unknown> = {}) {
	return async (command: string, args?: Record<string, unknown>) => {
		if (command in responses) {
			const response = responses[command];
			if (typeof response === 'function') {
				return response(args);
			}
			return response;
		}
		throw new Error('No mock response for command: ' + command);
	};
}

/**
 * Format cents to currency string for testing.
 */
export function formatCents(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * Parse currency string to cents for testing.
 */
export function parseToCents(amount: string): number {
	const cleaned = amount.replace(/[^0-9.-]/g, '');
	return Math.round(parseFloat(cleaned) * 100);
}

/**
 * Generate a mock UUID for testing.
 */
export function mockUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Create a date string in YYYY-MM-DD format for testing.
 */
export function createDateString(year: number, month: number, day: number): string {
	return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

/**
 * Create a month string in YYYY-MM format for testing.
 */
export function createMonthString(year: number, month: number): string {
	return year + '-' + String(month).padStart(2, '0');
}

// Re-export everything from @testing-library/svelte for convenience
export * from '@testing-library/svelte';
