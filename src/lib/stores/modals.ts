/**
 * Modal state tracking for keyboard shortcut blocking.
 * When any modal is open, navigation shortcuts should be blocked.
 */

import { writable, derived } from 'svelte/store';

function createModalStore() {
	const { subscribe, set, update } = writable<Set<string>>(new Set());

	return {
		subscribe,
		/**
		 * Register an open modal by ID.
		 */
		open(id: string) {
			update((modals) => {
				modals.add(id);
				return new Set(modals);
			});
		},
		/**
		 * Unregister a closed modal by ID.
		 */
		close(id: string) {
			update((modals) => {
				modals.delete(id);
				return new Set(modals);
			});
		},
		/**
		 * Close all modals.
		 */
		closeAll() {
			set(new Set());
		}
	};
}

export const openModals = createModalStore();

/**
 * Derived store: true when any modal is open.
 */
export const isModalOpen = derived(openModals, ($openModals) => $openModals.size > 0);
