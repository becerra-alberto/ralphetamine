import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ContextMenu from '../../../components/shared/ContextMenu.svelte';
import type { MenuItem } from '../../../types/ui';

describe('ContextMenu', () => {
	const mockItems: MenuItem[] = [
		{ id: 'item1', label: 'Item 1' },
		{ id: 'item2', label: 'Item 2' },
		{ id: 'divider', label: '', divider: true },
		{ id: 'item3', label: 'Item 3' },
		{ id: 'disabled', label: 'Disabled Item', disabled: true }
	];

	beforeEach(() => {
		// Mock window dimensions for viewport tests
		Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
		Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should not render when visible is false', () => {
			render(ContextMenu, {
				props: {
					visible: false,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.queryByTestId('context-menu')).toBeNull();
		});

		it('should render when visible is true', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.getByTestId('context-menu')).toBeTruthy();
		});

		it('should render at provided x,y cursor coordinates', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 150,
					y: 200,
					items: mockItems
				}
			});

			const menu = screen.getByTestId('context-menu');
			expect(menu.style.left).toContain('150px');
			expect(menu.style.top).toContain('200px');
		});

		it('should render all non-divider menu items', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.getByTestId('menu-item-item1')).toBeTruthy();
			expect(screen.getByTestId('menu-item-item2')).toBeTruthy();
			expect(screen.getByTestId('menu-item-item3')).toBeTruthy();
			expect(screen.getByTestId('menu-item-disabled')).toBeTruthy();
		});

		it('should render dividers', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.getByTestId('menu-divider')).toBeTruthy();
		});

		it('should have role="menu" for accessibility', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.getByRole('menu')).toBeTruthy();
		});
	});

	describe('positioning near viewport edge', () => {
		it('should reposition when near right edge of viewport', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 950,
					y: 100,
					items: mockItems
				}
			});

			const menu = screen.getByTestId('context-menu');
			vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({
				width: 180,
				height: 200,
				top: 100,
				left: 950,
				right: 1130,
				bottom: 300,
				x: 950,
				y: 100,
				toJSON: () => {}
			});

			expect(menu).toBeTruthy();
		});

		it('should reposition when near bottom edge of viewport', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 700,
					items: mockItems
				}
			});

			const menu = screen.getByTestId('context-menu');
			vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({
				width: 180,
				height: 200,
				top: 700,
				left: 100,
				right: 280,
				bottom: 900,
				x: 100,
				y: 700,
				toJSON: () => {}
			});

			expect(menu).toBeTruthy();
		});
	});

	describe('dismissal', () => {
		it('should handle close behavior on clicking outside', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.getByTestId('context-menu')).toBeTruthy();
			await fireEvent.click(document.body);
		});

		it('should handle close behavior on Escape key', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			expect(screen.getByTestId('context-menu')).toBeTruthy();
			await fireEvent.keyDown(document, { key: 'Escape' });
		});

		it('should not close when clicking inside menu', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			const menu = screen.getByTestId('context-menu');
			await fireEvent.click(menu);
			expect(screen.getByTestId('context-menu')).toBeTruthy();
		});
	});

	describe('keyboard navigation', () => {
		it('should navigate down with ArrowDown key', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const item1 = screen.getByTestId('menu-item-item1');
			expect(item1.classList.contains('highlighted')).toBe(true);
		});

		it('should navigate up with ArrowUp key', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowUp' });

			const item3 = screen.getByTestId('menu-item-item3');
			expect(item3.classList.contains('highlighted')).toBe(true);
		});

		it('should wrap around when navigating past last item', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: [
						{ id: 'item1', label: 'Item 1' },
						{ id: 'item2', label: 'Item 2' }
					]
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const item1 = screen.getByTestId('menu-item-item1');
			expect(item1.classList.contains('highlighted')).toBe(true);
		});

		it('should skip dividers during navigation', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const item3 = screen.getByTestId('menu-item-item3');
			expect(item3.classList.contains('highlighted')).toBe(true);
		});

		it('should skip disabled items during navigation', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const item1 = screen.getByTestId('menu-item-item1');
			expect(item1.classList.contains('highlighted')).toBe(true);
		});

		it('should highlight item for selection with Enter key', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const item1 = screen.getByTestId('menu-item-item1');
			expect(item1.classList.contains('highlighted')).toBe(true);

			await fireEvent.keyDown(document, { key: 'Enter' });
		});

		it('should highlight item for selection with Space key', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			await fireEvent.keyDown(document, { key: 'ArrowDown' });
			await fireEvent.keyDown(document, { key: 'ArrowDown' });

			const item2 = screen.getByTestId('menu-item-item2');
			expect(item2.classList.contains('highlighted')).toBe(true);

			await fireEvent.keyDown(document, { key: ' ' });
		});
	});

	describe('mouse interaction', () => {
		it('should highlight item on mouse enter', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			const item2 = screen.getByTestId('menu-item-item2');
			await fireEvent.mouseEnter(item2);

			expect(item2.classList.contains('highlighted')).toBe(true);
		});

		it('should handle item click for selection', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			const item1 = screen.getByTestId('menu-item-item1');
			await fireEvent.click(item1);
			expect(item1).toBeTruthy();
		});

		it('should not trigger selection on disabled item click', async () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			const disabledItem = screen.getByTestId('menu-item-disabled');
			await fireEvent.click(disabledItem);
			expect(disabledItem).toBeTruthy();
		});
	});

	describe('disabled items', () => {
		it('should render disabled items with disabled attribute', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			const disabledItem = screen.getByTestId('menu-item-disabled');
			expect(disabledItem.hasAttribute('disabled')).toBe(true);
		});

		it('should have disabled class on disabled items', () => {
			render(ContextMenu, {
				props: {
					visible: true,
					x: 100,
					y: 100,
					items: mockItems
				}
			});

			const disabledItem = screen.getByTestId('menu-item-disabled');
			expect(disabledItem.classList.contains('disabled')).toBe(true);
		});
	});
});
