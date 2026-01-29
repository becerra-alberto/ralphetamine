import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Chip from '../../../components/shared/Chip.svelte';

describe('Chip', () => {
	describe('display', () => {
		it('should render chip with tag name', () => {
			render(Chip, {
				props: { label: 'Personal' }
			});

			const chip = screen.getByTestId('chip');
			expect(chip).toBeTruthy();
			expect(screen.getByTestId('chip-label').textContent).toBe('Personal');
		});

		it('should display tag name correctly for multi-word tags', () => {
			render(Chip, {
				props: { label: 'Tax-Deductible' }
			});

			expect(screen.getByTestId('chip-label').textContent).toBe('Tax-Deductible');
		});

		it('should have aria-label with tag name', () => {
			render(Chip, {
				props: { label: 'Business' }
			});

			const chip = screen.getByTestId('chip');
			expect(chip.getAttribute('aria-label')).toBe('Tag: Business');
		});

		it('should use custom testId', () => {
			render(Chip, {
				props: { label: 'Personal', testId: 'custom-chip' }
			});

			expect(screen.getByTestId('custom-chip')).toBeTruthy();
			expect(screen.getByTestId('custom-chip-label')).toBeTruthy();
		});
	});

	describe('remove button', () => {
		it('should show X button by default (removable=true)', () => {
			render(Chip, {
				props: { label: 'Personal' }
			});

			expect(screen.getByTestId('chip-remove')).toBeTruthy();
		});

		it('should have accessible remove button with aria-label', () => {
			render(Chip, {
				props: { label: 'Recurring' }
			});

			const removeBtn = screen.getByTestId('chip-remove');
			expect(removeBtn.getAttribute('aria-label')).toBe('Remove Recurring');
		});

		it('should dispatch remove event when X button clicked', async () => {
			const removeHandler = vi.fn();
			const { container } = render(Chip, {
				props: { label: 'Personal' },
				events: { remove: removeHandler }
			});

			const removeBtn = screen.getByTestId('chip-remove');
			await fireEvent.click(removeBtn);

			expect(removeHandler).toHaveBeenCalledTimes(1);
			expect(removeHandler.mock.calls[0][0].detail).toEqual({ label: 'Personal' });
		});

		it('should hide X button when removable=false', () => {
			render(Chip, {
				props: { label: 'Personal', removable: false }
			});

			expect(screen.queryByTestId('chip-remove')).toBeNull();
		});

		it('should handle Enter key on remove button', async () => {
			const removeHandler = vi.fn();
			render(Chip, {
				props: { label: 'Business' },
				events: { remove: removeHandler }
			});

			const removeBtn = screen.getByTestId('chip-remove');
			await fireEvent.keyDown(removeBtn, { key: 'Enter' });

			expect(removeHandler).toHaveBeenCalledTimes(1);
		});

		it('should handle Space key on remove button', async () => {
			const removeHandler = vi.fn();
			render(Chip, {
				props: { label: 'Business' },
				events: { remove: removeHandler }
			});

			const removeBtn = screen.getByTestId('chip-remove');
			await fireEvent.keyDown(removeBtn, { key: ' ' });

			expect(removeHandler).toHaveBeenCalledTimes(1);
		});
	});
});
