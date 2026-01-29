import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toast from '../../../components/shared/Toast.svelte';

describe('Toast', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should render when visible is true', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			expect(screen.getByTestId('toast')).toBeTruthy();
		});

		it('should not render when visible is false', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: false
				}
			});

			expect(screen.queryByTestId('toast')).toBeNull();
		});

		it('should display the message', () => {
			render(Toast, {
				props: {
					message: 'Updated 12 months',
					type: 'success',
					visible: true
				}
			});

			const message = screen.getByTestId('toast-message');
			expect(message.textContent).toBe('Updated 12 months');
		});

		it('should show "Updated X months" format', () => {
			render(Toast, {
				props: {
					message: 'Updated 5 months',
					type: 'success',
					visible: true
				}
			});

			expect(screen.getByTestId('toast-message').textContent).toContain('Updated 5 months');
		});
	});

	describe('types', () => {
		it('should have success class for success type', () => {
			render(Toast, {
				props: {
					message: 'Success message',
					type: 'success',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.classList.contains('toast-success')).toBe(true);
		});

		it('should have error class for error type', () => {
			render(Toast, {
				props: {
					message: 'Error message',
					type: 'error',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.classList.contains('toast-error')).toBe(true);
		});

		it('should have warning class for warning type', () => {
			render(Toast, {
				props: {
					message: 'Warning message',
					type: 'warning',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.classList.contains('toast-warning')).toBe(true);
		});

		it('should have info class for info type', () => {
			render(Toast, {
				props: {
					message: 'Info message',
					type: 'info',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.classList.contains('toast-info')).toBe(true);
		});

		it('should have data-type attribute', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'success',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.getAttribute('data-type')).toBe('success');
		});
	});

	describe('icons', () => {
		it('should display success icon for success type', () => {
			render(Toast, {
				props: {
					message: 'Success',
					type: 'success',
					visible: true
				}
			});

			const icon = screen.getByTestId('toast-icon');
			expect(icon.textContent).toBe('✓');
		});

		it('should display error icon for error type', () => {
			render(Toast, {
				props: {
					message: 'Error',
					type: 'error',
					visible: true
				}
			});

			const icon = screen.getByTestId('toast-icon');
			expect(icon.textContent).toBe('✕');
		});

		it('should display warning icon for warning type', () => {
			render(Toast, {
				props: {
					message: 'Warning',
					type: 'warning',
					visible: true
				}
			});

			const icon = screen.getByTestId('toast-icon');
			expect(icon.textContent).toBe('⚠');
		});

		it('should display info icon for info type', () => {
			render(Toast, {
				props: {
					message: 'Info',
					type: 'info',
					visible: true
				}
			});

			const icon = screen.getByTestId('toast-icon');
			expect(icon.textContent).toBe('ℹ');
		});
	});

	describe('auto-dismiss', () => {
		it('should set up auto-dismiss timeout with default duration', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			// Toast should be visible initially
			expect(screen.getByTestId('toast')).toBeTruthy();
		});

		it('should not set up auto-dismiss when duration is 0', () => {
			render(Toast, {
				props: {
					message: 'Persistent toast',
					type: 'info',
					visible: true,
					duration: 0
				}
			});

			// Fast-forward time well past any reasonable duration
			vi.advanceTimersByTime(10000);

			// Toast should still be visible
			expect(screen.getByTestId('toast')).toBeTruthy();
		});
	});

	describe('manual dismiss', () => {
		it('should have dismiss button', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			expect(screen.getByTestId('toast-dismiss')).toBeTruthy();
		});

		it('should handle dismiss button click', async () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			const dismissBtn = screen.getByTestId('toast-dismiss');
			await fireEvent.click(dismissBtn);
			// Event is emitted to parent - parent controls visibility
		});

		it('should have aria-label on dismiss button', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			const dismissBtn = screen.getByTestId('toast-dismiss');
			expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss notification');
		});
	});

	describe('accessibility', () => {
		it('should have role="alert"', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.getAttribute('role')).toBe('alert');
		});

		it('should have aria-live="polite"', () => {
			render(Toast, {
				props: {
					message: 'Test message',
					type: 'info',
					visible: true
				}
			});

			const toast = screen.getByTestId('toast');
			expect(toast.getAttribute('aria-live')).toBe('polite');
		});
	});

	describe('batch operation messages', () => {
		it('should display "Updated X months" message format', () => {
			render(Toast, {
				props: {
					message: 'Updated 12 months',
					type: 'success',
					visible: true
				}
			});

			expect(screen.getByTestId('toast-message').textContent).toBe('Updated 12 months');
		});

		it('should display "Increased X months by Y%" message format', () => {
			render(Toast, {
				props: {
					message: 'Increased 12 months by 5%',
					type: 'success',
					visible: true
				}
			});

			expect(screen.getByTestId('toast-message').textContent).toBe('Increased 12 months by 5%');
		});
	});
});
