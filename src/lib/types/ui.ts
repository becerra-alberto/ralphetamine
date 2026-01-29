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

/**
 * Preview item for batch budget adjustments
 */
export interface PreviewItem {
	categoryId: string;
	categoryName: string;
	month: string; // MonthString format YYYY-MM
	currentCents: number;
	newCents: number;
}

/**
 * Category node for hierarchical filter display
 */
export interface CategoryNode {
	id: string;
	name: string;
	parentId: string | null;
	type: string;
	children: CategoryNode[];
}

/**
 * Tag with usage count for filter display
 */
export interface TagInfo {
	name: string;
	count: number;
}
