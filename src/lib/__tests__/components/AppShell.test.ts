import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import AppShellTestWrapper from './AppShellTestWrapper.svelte';

describe('AppShell Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock window.innerWidth
		Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
	});

	describe('rendering', () => {
		it('should render sidebar and main content area', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			expect(getByTestId('app-shell')).toBeTruthy();
			expect(getByTestId('sidebar')).toBeTruthy();
			expect(getByTestId('main-content')).toBeTruthy();
		});

		it('should have correct flexbox structure', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			const appShell = getByTestId('app-shell');
			expect(appShell.className).toContain('flex');
		});

		it('should have main content as flex-1', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			const mainContent = getByTestId('main-content');
			expect(mainContent.className).toContain('flex-1');
		});

		it('should have full height', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			const appShell = getByTestId('app-shell');
			expect(appShell.className).toContain('h-screen');
		});

		it('should have overflow hidden on shell', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			const appShell = getByTestId('app-shell');
			expect(appShell.className).toContain('overflow-hidden');
		});

		it('should have overflow auto on main content', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			const mainContent = getByTestId('main-content');
			expect(mainContent.className).toContain('overflow-auto');
		});
	});

	describe('responsive behavior', () => {
		it('should pass collapsed=false to sidebar when window width >= 800', () => {
			Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

			const { getByTestId } = render(AppShellTestWrapper);

			const sidebar = getByTestId('sidebar');
			expect(sidebar.style.width).toBe('200px');
		});

		it('should pass collapsed=true to sidebar when window width < 800', () => {
			Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });

			const { getByTestId } = render(AppShellTestWrapper);

			const sidebar = getByTestId('sidebar');
			expect(sidebar.style.width).toBe('64px');
		});
	});

	describe('styling', () => {
		it('should have primary background color', () => {
			const { getByTestId } = render(AppShellTestWrapper);

			const appShell = getByTestId('app-shell');
			expect(appShell.className).toContain('bg-bg-primary');
		});
	});
});
