/**
 * Toast notification store
 *
 * Manages toast notifications globally across the application.
 */

import { writable } from 'svelte/store';

export interface ToastNotification {
	id: string;
	message: string;
	type: 'success' | 'error' | 'warning' | 'info';
	duration: number;
}

function createToastStore() {
	const { subscribe, update } = writable<ToastNotification[]>([]);

	let counter = 0;

	function add(
		message: string,
		type: ToastNotification['type'] = 'info',
		duration: number = 3000
	): string {
		const id = `toast-${++counter}`;
		update((toasts) => [...toasts, { id, message, type, duration }]);
		return id;
	}

	function remove(id: string): void {
		update((toasts) => toasts.filter((t) => t.id !== id));
	}

	function success(message: string, duration?: number): string {
		return add(message, 'success', duration);
	}

	function error(message: string, duration?: number): string {
		return add(message, 'error', duration);
	}

	function warning(message: string, duration?: number): string {
		return add(message, 'warning', duration);
	}

	function info(message: string, duration?: number): string {
		return add(message, 'info', duration);
	}

	function clear(): void {
		update(() => []);
	}

	return {
		subscribe,
		add,
		remove,
		success,
		error,
		warning,
		info,
		clear
	};
}

export const toastStore = createToastStore();
