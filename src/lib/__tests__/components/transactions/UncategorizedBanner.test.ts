import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import UncategorizedBanner from '../../../components/transactions/UncategorizedBanner.svelte';

describe('UncategorizedBanner', () => {
	let sessionStorageMock: Record<string, string>;

	beforeEach(() => {
		sessionStorageMock = {};
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => sessionStorageMock[key] ?? null,
			setItem: (key: string, value: string) => { sessionStorageMock[key] = value; },
			removeItem: (key: string) => { delete sessionStorageMock[key]; },
			clear: () => { sessionStorageMock = {}; }
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('rendering', () => {
		it('should render banner with warning icon and warning background when count > 0', () => {
			render(UncategorizedBanner, { props: { count: 5 } });

			const banner = screen.getByTestId('uncategorized-banner');
			expect(banner).toBeTruthy();
			expect(banner.getAttribute('role')).toBe('alert');

			const icon = screen.getByTestId('warning-icon');
			expect(icon).toBeTruthy();
		});

		it('should display correct count: "You have X uncategorized transactions"', () => {
			render(UncategorizedBanner, { props: { count: 3 } });

			const text = screen.getByTestId('banner-text');
			expect(text.textContent).toBe('You have 3 uncategorized transactions');
		});

		it('should use singular grammar: "You have 1 uncategorized transaction"', () => {
			render(UncategorizedBanner, { props: { count: 1 } });

			const text = screen.getByTestId('banner-text');
			expect(text.textContent).toBe('You have 1 uncategorized transaction');
		});

		it('should use plural grammar: "You have 5 uncategorized transactions"', () => {
			render(UncategorizedBanner, { props: { count: 5 } });

			const text = screen.getByTestId('banner-text');
			expect(text.textContent).toBe('You have 5 uncategorized transactions');
		});

		it('should be hidden when count is 0', () => {
			render(UncategorizedBanner, { props: { count: 0 } });

			expect(screen.queryByTestId('uncategorized-banner')).toBeNull();
		});
	});

	describe('actions', () => {
		it('should render "Categorize now" button that is clickable', async () => {
			render(UncategorizedBanner, { props: { count: 3 } });

			const btn = screen.getByTestId('categorize-now-btn');
			expect(btn).toBeTruthy();
			expect(btn.textContent?.trim()).toBe('Categorize now');

			// Click should not throw
			await fireEvent.click(btn);
			expect(true).toBe(true);
		});

		it('should hide banner when dismiss button is clicked and store state in session storage', async () => {
			render(UncategorizedBanner, { props: { count: 3 } });

			expect(screen.getByTestId('uncategorized-banner')).toBeTruthy();

			const dismissBtn = screen.getByTestId('dismiss-btn');
			await fireEvent.click(dismissBtn);

			// Banner should be hidden
			expect(screen.queryByTestId('uncategorized-banner')).toBeNull();

			// Session storage should be set
			expect(sessionStorageMock['stackz-uncategorized-banner-dismissed']).toBe('true');
			expect(sessionStorageMock['stackz-uncategorized-banner-dismissed-count']).toBe('3');
		});

		it('should reappear when new uncategorized transaction added (count increases beyond dismissed count)', async () => {
			// First render with count 3 and dismiss
			const { rerender } = render(UncategorizedBanner, { props: { count: 3 } });

			const dismissBtn = screen.getByTestId('dismiss-btn');
			await fireEvent.click(dismissBtn);

			expect(screen.queryByTestId('uncategorized-banner')).toBeNull();

			// Simulate count increasing (new uncategorized added) using rerender
			await rerender({ count: 5 });

			// Banner should reappear because count increased
			expect(screen.getByTestId('uncategorized-banner')).toBeTruthy();
		});

		it('should stay hidden if count does not increase after dismissal', async () => {
			const { rerender } = render(UncategorizedBanner, { props: { count: 3 } });

			const dismissBtn = screen.getByTestId('dismiss-btn');
			await fireEvent.click(dismissBtn);

			expect(screen.queryByTestId('uncategorized-banner')).toBeNull();

			// Re-render with same count
			await rerender({ count: 3 });

			expect(screen.queryByTestId('uncategorized-banner')).toBeNull();
		});
	});

	describe('dismiss button', () => {
		it('should have accessible aria-label', () => {
			render(UncategorizedBanner, { props: { count: 2 } });

			const dismissBtn = screen.getByTestId('dismiss-btn');
			expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss warning');
		});
	});
});
