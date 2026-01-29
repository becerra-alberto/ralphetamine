import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import NavItem from '../../components/NavItem.svelte';
import type { NavigationItem } from '../../stores/navigation';

describe('NavItem Component', () => {
	const mockItem: NavigationItem = {
		route: '/budget',
		label: 'Budget',
		icon: 'budget',
		shortcut: '⌘2'
	};

	describe('rendering', () => {
		it('should render icon and label', () => {
			const { getByTestId, getByText } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false
				}
			});

			expect(getByTestId('nav-item-budget')).toBeTruthy();
			expect(getByText('Budget')).toBeTruthy();
		});

		it('should render icon SVG element', () => {
			const { container } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false
				}
			});

			const svg = container.querySelector('svg');
			expect(svg).toBeTruthy();
		});

		it('should display shortcut when not collapsed', () => {
			const { getByText } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false
				}
			});

			expect(getByText('⌘2')).toBeTruthy();
		});

		it('should hide label span and shortcut when collapsed', () => {
			const { container, queryByText } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: true
				}
			});

			// The label span should not exist when collapsed (tooltip still has text)
			// Check for the specific span with ml-3 class that shows the label
			const labelSpan = container.querySelector('span.ml-3');
			expect(labelSpan).toBeFalsy();

			// Shortcut should not be visible
			expect(queryByText('⌘2')).toBeFalsy();
		});
	});

	describe('active state', () => {
		it('should apply active class when active prop is true', () => {
			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: true,
					collapsed: false
				}
			});

			const button = getByTestId('nav-item-budget');
			expect(button.className).toContain('bg-accent/10');
			expect(button.className).toContain('text-accent');
			expect(button.className).toContain('border-accent');
		});

		it('should not apply active class when active prop is false', () => {
			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false
				}
			});

			const button = getByTestId('nav-item-budget');
			expect(button.className).toContain('text-text-secondary');
			expect(button.className).not.toContain('bg-accent/10');
		});

		it('should set aria-current="page" when active', () => {
			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: true,
					collapsed: false
				}
			});

			const button = getByTestId('nav-item-budget');
			expect(button.getAttribute('aria-current')).toBe('page');
		});

		it('should not set aria-current when inactive', () => {
			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false
				}
			});

			const button = getByTestId('nav-item-budget');
			expect(button.getAttribute('aria-current')).toBeFalsy();
		});
	});

	describe('click events', () => {
		it('should call onclick with correct route when clicked', async () => {
			const onclickMock = vi.fn();

			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false,
					onclick: onclickMock
				}
			});

			const button = getByTestId('nav-item-budget');
			await fireEvent.click(button);

			expect(onclickMock).toHaveBeenCalledWith('/budget');
		});

		it('should handle keyboard navigation with Enter key', async () => {
			const onclickMock = vi.fn();

			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false,
					onclick: onclickMock
				}
			});

			const button = getByTestId('nav-item-budget');
			await fireEvent.keyDown(button, { key: 'Enter' });

			expect(onclickMock).toHaveBeenCalledWith('/budget');
		});

		it('should handle keyboard navigation with Space key', async () => {
			const onclickMock = vi.fn();

			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false,
					onclick: onclickMock
				}
			});

			const button = getByTestId('nav-item-budget');
			await fireEvent.keyDown(button, { key: ' ' });

			expect(onclickMock).toHaveBeenCalledWith('/budget');
		});
	});

	describe('tooltip', () => {
		it('should show tooltip element when collapsed', () => {
			const { container } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: true
				}
			});

			const tooltip = container.querySelector('[role="tooltip"]');
			expect(tooltip).toBeTruthy();
			expect(tooltip?.textContent).toBe('Budget');
		});

		it('should not show tooltip element when expanded', () => {
			const { container } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: false
				}
			});

			const tooltip = container.querySelector('[role="tooltip"]');
			expect(tooltip).toBeFalsy();
		});

		it('should set title attribute when collapsed for native tooltip', () => {
			const { getByTestId } = render(NavItem, {
				props: {
					item: mockItem,
					active: false,
					collapsed: true
				}
			});

			const button = getByTestId('nav-item-budget');
			expect(button.getAttribute('title')).toBe('Budget');
		});
	});
});
