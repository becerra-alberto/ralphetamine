/**
 * UI component types
 */

/**
 * Menu item for context menus and dropdowns
 */
export interface MenuItem {
	id: string;
	label: string;
	icon?: string;
	divider?: boolean;
	disabled?: boolean;
}

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification state
 */
export interface ToastState {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}
