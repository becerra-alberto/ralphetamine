/**
 * Tags API wrapper for Tauri backend communication
 *
 * Provides functions for tag management in transactions.
 */

import { getUniqueTags } from './transactions';

/**
 * Predefined tags available by default
 */
export const PREDEFINED_TAGS = ['Personal', 'Business', 'Recurring', 'Tax-Deductible'];

/**
 * Get all available tags (predefined + custom from existing transactions)
 */
export async function getAvailableTags(search?: string, limit?: number): Promise<string[]> {
	return getUniqueTags(search, limit);
}

/**
 * Serialize tags to JSON array string for database storage
 */
export function serializeTags(tags: string[]): string {
	return JSON.stringify(tags);
}

/**
 * Parse tags from JSON array string
 */
export function parseTags(json: string): string[] {
	try {
		const parsed = JSON.parse(json);
		if (Array.isArray(parsed)) {
			return parsed.filter((t): t is string => typeof t === 'string');
		}
		return [];
	} catch {
		return [];
	}
}
