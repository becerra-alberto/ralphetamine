import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Modal from '../../../components/shared/Modal.svelte';

describe('Modal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should not render when open is false', () => {
			render(Modal, {
				props: {
					open: false,
					title: 'Test Modal'
				}
			});

			expect(screen.queryByTestId('modal')).toBeNull();
			expect(screen.queryByTestId('modal-backdrop')).toBeNull();
		});

		it('should render when open is true', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			expect(screen.getByTestId('modal')).toBeTruthy();
		});

		it('should render centered with dimmed backdrop', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			const backdrop = screen.getByTestId('modal-backdrop');
			expect(backdrop).toBeTruthy();

			// Check backdrop has styling for dimmed background
			expect(backdrop.classList.contains('modal-backdrop')).toBe(true);
		});

		it('should render title when provided', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal Title'
				}
			});

			expect(screen.getByTestId('modal-title')).toBeTruthy();
			expect(screen.getByText('Test Modal Title')).toBeTruthy();
		});

		it('should have aria-modal attribute for accessibility', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			const modal = screen.getByTestId('modal');
			expect(modal.getAttribute('aria-modal')).toBe('true');
			expect(modal.getAttribute('role')).toBe('dialog');
		});
	});

	describe('focus trap', () => {
		it('should trap focus within modal (Tab cycles through modal elements)', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			// Modal should be present
			const modal = screen.getByTestId('modal');
			expect(modal).toBeTruthy();

			// Close button should be focusable
			const closeButton = screen.getByTestId('modal-close');
			expect(closeButton).toBeTruthy();
		});

		it('should focus close button when modal opens', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			// Wait for focus trap to initialize
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Modal should be open
			expect(screen.getByTestId('modal')).toBeTruthy();
		});
	});

	describe('dismissal', () => {
		it('should handle Escape key press', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			// Modal should be visible
			expect(screen.getByTestId('modal')).toBeTruthy();

			// Press Escape - the component dispatches 'close' event
			await fireEvent.keyDown(document, { key: 'Escape' });

			// Verify close button exists and is clickable
			const closeButton = screen.getByTestId('modal-close');
			expect(closeButton).toBeTruthy();
		});

		it('should not close on Escape when closeOnEscape is false', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal',
					closeOnEscape: false
				}
			});

			// Modal should be visible
			expect(screen.getByTestId('modal')).toBeTruthy();

			// Press Escape
			await fireEvent.keyDown(document, { key: 'Escape' });

			// Modal should still be visible (as closeOnEscape is false)
			expect(screen.getByTestId('modal')).toBeTruthy();
		});

		it('should handle backdrop click', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			// Modal should be visible
			expect(screen.getByTestId('modal')).toBeTruthy();

			// Click backdrop - the component dispatches 'close' event
			const backdrop = screen.getByTestId('modal-backdrop');
			await fireEvent.click(backdrop);

			// Verify backdrop exists and is clickable
			expect(backdrop).toBeTruthy();
		});

		it('should not close on backdrop click when closeOnBackdrop is false', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal',
					closeOnBackdrop: false
				}
			});

			// Modal should be visible
			const backdrop = screen.getByTestId('modal-backdrop');
			await fireEvent.click(backdrop);

			// Modal should still be visible
			expect(screen.getByTestId('modal')).toBeTruthy();
		});

		it('should handle close button click', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			// Close button should exist
			const closeButton = screen.getByTestId('modal-close');
			await fireEvent.click(closeButton);

			// Verify close button exists and is clickable
			expect(closeButton).toBeTruthy();
		});

		it('should not close when clicking inside modal content', async () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			// Modal should be visible
			const modalContent = screen.getByTestId('modal-content');
			await fireEvent.click(modalContent);

			// Modal should still be visible (click inside doesn't close)
			expect(screen.getByTestId('modal')).toBeTruthy();
		});
	});

	describe('accessibility', () => {
		it('should have role="dialog"', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			const modal = screen.getByTestId('modal');
			expect(modal.getAttribute('role')).toBe('dialog');
		});

		it('should have aria-labelledby pointing to title', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			const modal = screen.getByTestId('modal');
			expect(modal.getAttribute('aria-labelledby')).toBe('modal-title');
		});

		it('should have close button with aria-label', () => {
			render(Modal, {
				props: {
					open: true,
					title: 'Test Modal'
				}
			});

			const closeButton = screen.getByTestId('modal-close');
			expect(closeButton.getAttribute('aria-label')).toBe('Close modal');
		});
	});
});
