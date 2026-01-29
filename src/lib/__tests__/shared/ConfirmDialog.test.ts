import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConfirmDialog from '../../components/shared/ConfirmDialog.svelte';

describe('ConfirmDialog', () => {
	it('should render dialog when open', () => {
		render(ConfirmDialog, {
			props: { open: true, title: 'Test Title', message: 'Test message' }
		});

		expect(screen.getByText('Test Title')).toBeTruthy();
		expect(screen.getByTestId('confirm-dialog-message').textContent).toBe('Test message');
	});

	it('should not render when closed', () => {
		render(ConfirmDialog, {
			props: { open: false, title: 'Test', message: 'Test message' }
		});

		expect(screen.queryByTestId('confirm-dialog-message')).toBeNull();
	});

	it('should render confirm and cancel buttons with default labels', () => {
		render(ConfirmDialog, {
			props: { open: true, title: 'Test', message: 'Test' }
		});

		expect(screen.getByTestId('confirm-dialog-confirm').textContent?.trim()).toBe('Confirm');
		expect(screen.getByTestId('confirm-dialog-cancel').textContent?.trim()).toBe('Cancel');
	});

	it('should render custom button labels', () => {
		render(ConfirmDialog, {
			props: {
				open: true,
				title: 'Skip?',
				message: 'Are you sure?',
				confirmLabel: 'Skip',
				cancelLabel: 'Continue setup'
			}
		});

		expect(screen.getByTestId('confirm-dialog-confirm').textContent?.trim()).toBe('Skip');
		expect(screen.getByTestId('confirm-dialog-cancel').textContent?.trim()).toBe(
			'Continue setup'
		);
	});

	it('should dispatch confirm event on confirm click', async () => {
		let confirmCalled = false;

		render(ConfirmDialog, {
			props: { open: true, title: 'Test', message: 'Test' },
			events: {
				confirm: () => {
					confirmCalled = true;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
		expect(confirmCalled).toBe(true);
	});

	it('should dispatch cancel event on cancel click', async () => {
		let cancelCalled = false;

		render(ConfirmDialog, {
			props: { open: true, title: 'Test', message: 'Test' },
			events: {
				cancel: () => {
					cancelCalled = true;
				}
			}
		} as any);

		await fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
		expect(cancelCalled).toBe(true);
	});

	it('should accept custom testId', () => {
		render(ConfirmDialog, {
			props: {
				open: true,
				title: 'Test',
				message: 'Test',
				testId: 'custom-confirm'
			}
		});

		expect(screen.getByTestId('custom-confirm-message')).toBeTruthy();
		expect(screen.getByTestId('custom-confirm-confirm')).toBeTruthy();
		expect(screen.getByTestId('custom-confirm-cancel')).toBeTruthy();
	});

	it('should render skip onboarding dialog correctly', () => {
		render(ConfirmDialog, {
			props: {
				open: true,
				title: 'Skip setup?',
				message: 'You can configure these options later in Settings.',
				confirmLabel: 'Skip',
				cancelLabel: 'Continue setup'
			}
		});

		expect(screen.getByText('Skip setup?')).toBeTruthy();
		expect(screen.getByTestId('confirm-dialog-message').textContent).toBe(
			'You can configure these options later in Settings.'
		);
	});
});
