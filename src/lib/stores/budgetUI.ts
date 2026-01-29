/**
 * Budget UI state store
 *
 * Manages UI state for the budget view including collapsed sections
 * and persists state to localStorage.
 */

import { writable, derived, type Readable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { SECTION_ORDER, type SectionName } from '$lib/utils/categoryGroups';

const STORAGE_KEY = 'stackz-budget-ui-state';

/**
 * Position of a focused cell in the budget grid for tab navigation
 */
export interface FocusedCellPosition {
	categoryId: string;
	monthIndex: number;
	/** Whether the cell should enter edit mode automatically */
	autoEdit: boolean;
}

/**
 * Budget UI state interface
 */
export interface BudgetUIState {
	/** Map of section IDs to collapsed state */
	collapsedSections: Set<string>;
	/** Currently focused cell position for tab navigation */
	focusedCell: FocusedCellPosition | null;
}

/**
 * Load state from localStorage
 * Note: focusedCell is NOT persisted - it's session-only state
 */
function loadFromStorage(): BudgetUIState {
	if (!browser) {
		return { collapsedSections: new Set(), focusedCell: null };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const data = JSON.parse(stored);
			return {
				collapsedSections: new Set(data.collapsedSections || []),
				focusedCell: null
			};
		}
	} catch {
		// Ignore parse errors
	}

	return { collapsedSections: new Set(), focusedCell: null };
}

/**
 * Save state to localStorage
 */
function saveToStorage(state: BudgetUIState): void {
	if (!browser) return;

	try {
		const data = {
			collapsedSections: Array.from(state.collapsedSections)
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Ignore storage errors
	}
}

/**
 * Create the budget UI store
 */
function createBudgetUIStore() {
	const initialState = loadFromStorage();
	const { subscribe, set, update }: Writable<BudgetUIState> = writable(initialState);

	// Subscribe to changes and persist
	let isInitialized = false;
	subscribe((state) => {
		if (isInitialized) {
			saveToStorage(state);
		}
		isInitialized = true;
	});

	return {
		subscribe,

		/**
		 * Toggle a section's collapsed state
		 */
		toggleSection: (sectionId: string) => {
			update((state) => {
				const newCollapsed = new Set(state.collapsedSections);
				if (newCollapsed.has(sectionId)) {
					newCollapsed.delete(sectionId);
				} else {
					newCollapsed.add(sectionId);
				}
				return { ...state, collapsedSections: newCollapsed };
			});
		},

		/**
		 * Check if a section is collapsed
		 */
		isSectionCollapsed: (sectionId: string): Readable<boolean> => {
			return derived({ subscribe }, ($state) => $state.collapsedSections.has(sectionId));
		},

		/**
		 * Expand a section
		 */
		expandSection: (sectionId: string) => {
			update((state) => {
				const newCollapsed = new Set(state.collapsedSections);
				newCollapsed.delete(sectionId);
				return { ...state, collapsedSections: newCollapsed };
			});
		},

		/**
		 * Collapse a section
		 */
		collapseSection: (sectionId: string) => {
			update((state) => {
				const newCollapsed = new Set(state.collapsedSections);
				newCollapsed.add(sectionId);
				return { ...state, collapsedSections: newCollapsed };
			});
		},

		/**
		 * Expand all sections
		 */
		expandAll: () => {
			update((state) => ({
				...state,
				collapsedSections: new Set()
			}));
		},

		/**
		 * Collapse all sections
		 */
		collapseAll: (sectionIds: string[]) => {
			update((state) => ({
				...state,
				collapsedSections: new Set(sectionIds)
			}));
		},

		/**
		 * Reset the store to initial state
		 */
		reset: () => {
			set({ collapsedSections: new Set(), focusedCell: null });
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
		},

		/**
		 * Set the focused cell position for tab navigation
		 */
		setFocusedCell: (position: FocusedCellPosition | null) => {
			update((state) => ({
				...state,
				focusedCell: position
			}));
		},

		/**
		 * Clear the focused cell position
		 */
		clearFocusedCell: () => {
			update((state) => ({
				...state,
				focusedCell: null
			}));
		}
	};
}

// Create the store singleton
export const budgetUIStore = createBudgetUIStore();

/**
 * Derived store for collapsed section IDs as array
 */
export const collapsedSectionIds: Readable<string[]> = derived(budgetUIStore, ($state) =>
	Array.from($state.collapsedSections)
);

/**
 * Derived store for focused cell position
 */
export const focusedCell: Readable<FocusedCellPosition | null> = derived(
	budgetUIStore,
	($state) => $state.focusedCell
);
